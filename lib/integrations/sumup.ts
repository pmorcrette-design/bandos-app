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
    const transactionsQuery = new URLSearchParams({
      limit: "5",
      order: "descending"
    });
    transactionsQuery.append("statuses[]", "SUCCESSFUL");
    const transactionsResponse = await sumUpFetch<{ items?: Record<string, unknown>[] }>(
      `/v2.1/merchants/${merchantCode}/transactions/history?${transactionsQuery.toString()}`,
      apiKey
    ).catch(() => ({ items: [] }));
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
