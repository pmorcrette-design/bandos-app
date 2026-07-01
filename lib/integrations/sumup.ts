import { convertCurrency, normalizeCurrency, type SupportedCurrency } from "@/lib/utils";

const SUMUP_API_BASE = "https://api.sumup.com";

type SumUpTransactionRecord = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentType: string;
  timestamp: string;
  cardType?: string;
};

type SumUpTransactionProductRecord = {
  name: string;
  quantity: number;
  salePrice: number;
  totalRevenue: number;
  currency: SupportedCurrency;
  vatRate: number | null;
};

const ignoredProductSummaries = new Set(["montant personnalisé", "custom amount"]);

export type SumUpCatalogImportItem = {
  name: string;
  quantitySold: number;
  salePrice: number;
  revenue: number;
  currency: SupportedCurrency;
  lastSoldAt: string | null;
  vatRate: number | null;
};

export type SumUpConnectionStatus = {
  configured: boolean;
  connected: boolean;
  mode: "none" | "api-key";
  merchantCode: string | null;
  readerId: string | null;
  merchantName: string | null;
  country: string | null;
  defaultCurrency: string | null;
  defaultLocale: string | null;
  readerStatus: string | null;
  readerState: string | null;
  transactionSyncReady: boolean;
  readerCheckoutReady: boolean;
  checkoutWebhookReady: boolean;
  lastSyncAt: string | null;
  error: string | null;
  recentTransactions: SumUpTransactionRecord[];
};

function getSumUpConfig() {
  return {
    apiKey: process.env.SUMUP_API_KEY ?? "",
    merchantCode: process.env.SUMUP_MERCHANT_CODE ?? "",
    readerId: process.env.SUMUP_READER_ID ?? ""
  };
}

async function sumUpFetch<T>(path: string, apiKey: string) {
  const response = await fetch(`${SUMUP_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SumUp API ${response.status}`);
  }

  return (await response.json()) as T;
}

function getNestedString(record: Record<string, unknown>, path: string[]) {
  let value: unknown = record;

  for (const key of path) {
    if (!value || typeof value !== "object" || !(key in value)) {
      return null;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return typeof value === "string" ? value : null;
}

function normalizeTransaction(record: Record<string, unknown>): SumUpTransactionRecord {
  return {
    id: String(record.transaction_code ?? record.id ?? crypto.randomUUID()),
    amount: Number(record.amount ?? 0),
    currency: String(record.currency ?? "EUR"),
    status: String(record.status ?? "UNKNOWN"),
    paymentType: String(record.payment_type ?? "UNKNOWN"),
    timestamp: String(
      record.timestamp ?? record.transaction_time ?? record.local_time ?? ""
    ),
    cardType:
      typeof record.card_type === "string" ? record.card_type : undefined
  };
}

function parseNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTransactionProducts(record: Record<string, unknown>) {
  const transactionCurrency = normalizeCurrency(
    typeof record.currency === "string" ? record.currency : "EUR"
  );
  const transactionAmount = parseNumber(record.amount);
  const summaryName =
    typeof record.product_summary === "string" ? record.product_summary.trim() : "";

  if (!Array.isArray(record.products) || !record.products.length) {
    if (!summaryName) {
      return [];
    }

    return [
      {
        name: summaryName,
        quantity: 1,
        salePrice: transactionAmount,
        totalRevenue: transactionAmount,
        currency: transactionCurrency,
        vatRate: null
      } satisfies SumUpTransactionProductRecord
    ];
  }

  return record.products
    .map((product) => {
      if (!product || typeof product !== "object") {
        return null;
      }

      const name =
        typeof product.name === "string" ? product.name.trim() : "";

      if (!name) {
        return null;
      }

      const quantity = Math.max(1, parseNumber((product as Record<string, unknown>).quantity));
      const priceWithVat = parseNumber(
        (product as Record<string, unknown>).price_with_vat
      );
      const totalWithVat = parseNumber(
        (product as Record<string, unknown>).total_with_vat
      );
      const price = parseNumber((product as Record<string, unknown>).price);
      const totalPrice = parseNumber((product as Record<string, unknown>).total_price);
      const salePrice =
        priceWithVat || (totalWithVat ? totalWithVat / quantity : price);
      const totalRevenue =
        totalWithVat || (salePrice ? salePrice * quantity : totalPrice);
      const vatRateRaw = Number((product as Record<string, unknown>).vat_rate);

      return {
        name,
        quantity,
        salePrice,
        totalRevenue,
        currency: transactionCurrency,
        vatRate: Number.isFinite(vatRateRaw) ? vatRateRaw : null
      } satisfies SumUpTransactionProductRecord;
    })
    .filter((product): product is SumUpTransactionProductRecord => Boolean(product));
}

async function listRecentSumUpTransactions(merchantCode: string, apiKey: string) {
  const transactionsQuery = new URLSearchParams({
    limit: "100",
    order: "descending"
  });
  transactionsQuery.append("statuses[]", "SUCCESSFUL");

  const response = await sumUpFetch<{ items?: Record<string, unknown>[] }>(
    `/v2.1/merchants/${merchantCode}/transactions/history?${transactionsQuery.toString()}`,
    apiKey
  ).catch(() => ({ items: [] }));

  return response.items ?? [];
}

export async function getSumUpCatalogImportItems(): Promise<SumUpCatalogImportItem[]> {
  const { apiKey, merchantCode } = getSumUpConfig();

  if (!apiKey || !merchantCode) {
    return [];
  }

  const transactions = await listRecentSumUpTransactions(merchantCode, apiKey);
  const products = new Map<string, SumUpCatalogImportItem>();

  for (const transaction of transactions) {
    const transactionTimestamp =
      typeof transaction.timestamp === "string"
        ? transaction.timestamp
        : typeof transaction.transaction_time === "string"
          ? transaction.transaction_time
          : typeof transaction.local_time === "string"
            ? transaction.local_time
            : null;

    for (const product of normalizeTransactionProducts(transaction)) {
      if (ignoredProductSummaries.has(product.name.trim().toLowerCase())) {
        continue;
      }

      const existing = products.get(product.name);

      if (!existing) {
        products.set(product.name, {
          name: product.name,
          quantitySold: product.quantity,
          salePrice: convertCurrency(product.salePrice, product.currency, "GBP"),
          revenue: convertCurrency(product.totalRevenue, product.currency, "GBP"),
          currency: "GBP",
          lastSoldAt: transactionTimestamp,
          vatRate: product.vatRate
        });
        continue;
      }

      existing.quantitySold += product.quantity;
      existing.revenue += convertCurrency(product.totalRevenue, product.currency, "GBP");
      existing.salePrice = Math.max(
        existing.salePrice,
        convertCurrency(product.salePrice, product.currency, "GBP")
      );

      if (transactionTimestamp) {
        if (!existing.lastSoldAt || transactionTimestamp > existing.lastSoldAt) {
          existing.lastSoldAt = transactionTimestamp;
        }
      }

      if (existing.vatRate === null && product.vatRate !== null) {
        existing.vatRate = product.vatRate;
      }
    }
  }

  return Array.from(products.values()).sort((left, right) =>
    right.quantitySold - left.quantitySold
  );
}

export async function getSumUpConnectionStatus(): Promise<SumUpConnectionStatus> {
  const { apiKey, merchantCode, readerId } = getSumUpConfig();

  if (!apiKey || !merchantCode) {
    return {
      configured: false,
      connected: false,
      mode: "none",
      merchantCode: merchantCode || null,
      readerId: readerId || null,
      merchantName: null,
      country: null,
      defaultCurrency: null,
      defaultLocale: null,
      readerStatus: null,
      readerState: null,
      transactionSyncReady: false,
      readerCheckoutReady: false,
      checkoutWebhookReady: false,
      lastSyncAt: null,
      error: null,
      recentTransactions: []
    };
  }

  try {
    const merchant = await sumUpFetch<Record<string, unknown>>(
      `/v1/merchants/${merchantCode}`,
      apiKey
    );
    const transactionsResponse = await listRecentSumUpTransactions(
      merchantCode,
      apiKey
    ).then((items) => ({ items }));
    const readerResponse =
      readerId
        ? await sumUpFetch<{ data?: Record<string, unknown> }>(
            `/v0.1/merchants/${merchantCode}/readers/${readerId}/status`,
            apiKey
          ).catch(() => ({ data: undefined }))
        : null;

    const merchantName =
      getNestedString(merchant, ["alias"]) ??
      getNestedString(merchant, ["business_profile", "company_name"]) ??
      getNestedString(merchant, ["business_profile", "name"]) ??
      getNestedString(merchant, ["business_profile", "doing_business_as"]) ??
      "SumUp merchant";

    const country =
      getNestedString(merchant, ["address", "country"]) ??
      getNestedString(merchant, ["business_profile", "address", "country"]) ??
      null;
    const readerStatus =
      readerResponse?.data && typeof readerResponse.data === "object"
        ? getNestedString(readerResponse.data, ["status"])
        : null;
    const readerState =
      readerResponse?.data && typeof readerResponse.data === "object"
        ? getNestedString(readerResponse.data, ["state"])
        : null;

    return {
      configured: true,
      connected: true,
      mode: "api-key",
      merchantCode,
      readerId: readerId || null,
      merchantName,
      country,
      defaultCurrency: getNestedString(merchant, ["default_currency"]),
      defaultLocale: getNestedString(merchant, ["default_locale"]),
      readerStatus,
      readerState,
      transactionSyncReady: true,
      readerCheckoutReady: Boolean(readerId),
      checkoutWebhookReady: true,
      lastSyncAt: new Date().toISOString(),
      error: null,
      recentTransactions: (transactionsResponse.items ?? []).map(normalizeTransaction)
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      mode: "api-key",
      merchantCode,
      readerId: readerId || null,
      merchantName: null,
      country: null,
      defaultCurrency: null,
      defaultLocale: null,
      readerStatus: null,
      readerState: null,
      transactionSyncReady: true,
      readerCheckoutReady: Boolean(readerId),
      checkoutWebhookReady: true,
      lastSyncAt: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to reach SumUp",
      recentTransactions: []
    };
  }
}
