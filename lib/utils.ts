import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const supportedCurrencyMeta = {
  GBP: {
    label: "GBP",
    symbol: "£",
    locale: "en-GB",
    rateFromGbp: 1
  },
  EUR: {
    label: "EUR",
    symbol: "€",
    locale: "fr-FR",
    rateFromGbp: 1.17
  },
  USD: {
    label: "USD",
    symbol: "$",
    locale: "en-US",
    rateFromGbp: 1.27
  }
} as const;

export type SupportedCurrency = keyof typeof supportedCurrencyMeta;

export function normalizeCurrency(value?: string | null): SupportedCurrency {
  if (value === "GBP" || value === "EUR" || value === "USD") {
    return value;
  }

  return "EUR";
}

export function convertCurrency(
  amount: number,
  from: SupportedCurrency = "GBP",
  to: SupportedCurrency = "EUR"
) {
  const gbpAmount = amount / supportedCurrencyMeta[from].rateFromGbp;
  return gbpAmount * supportedCurrencyMeta[to].rateFromGbp;
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = "EUR",
  sourceCurrency: SupportedCurrency = "GBP"
) {
  return new Intl.NumberFormat(supportedCurrencyMeta[currency].locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(convertCurrency(amount, sourceCurrency, currency));
}

export function formatCompactCurrency(
  amount: number,
  currency: SupportedCurrency = "EUR",
  sourceCurrency: SupportedCurrency = "GBP"
) {
  const converted = convertCurrency(amount, sourceCurrency, currency);

  return new Intl.NumberFormat(supportedCurrencyMeta[currency].locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(converted);
}

export function formatCompactNumber(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(date));
}

const textCurrencySymbolMap: Record<string, SupportedCurrency> = {
  "£": "GBP",
  "€": "EUR",
  $: "USD"
};

export function replaceCurrencyInText(
  text: string,
  targetCurrency: SupportedCurrency
) {
  return text.replace(/([£€$])\s?(\d[\d,]*(?:\.\d+)?)/g, (_, symbol, rawAmount) => {
    const sourceCurrency = textCurrencySymbolMap[symbol] ?? "GBP";
    const normalizedAmount = Number(String(rawAmount).replace(/,/g, ""));

    if (Number.isNaN(normalizedAmount)) {
      return `${symbol}${rawAmount}`;
    }

    return formatCurrency(normalizedAmount, targetCurrency, sourceCurrency);
  });
}
