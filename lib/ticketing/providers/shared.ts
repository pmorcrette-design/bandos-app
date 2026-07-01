import type {
  ProviderExternalEvent,
  ProviderSyncBundle,
  ProviderWebhookParseResult,
  TicketingCredentialInput,
  TicketingProvider
} from "@/lib/ticketing/types";

export type TicketingProviderClient = {
  key: TicketingProvider;
  label: string;
  listExternalEvents: (
    credentials: TicketingCredentialInput
  ) => Promise<ProviderExternalEvent[]>;
  syncEvent: (
    credentials: TicketingCredentialInput,
    externalEventId: string
  ) => Promise<ProviderSyncBundle>;
  parseWebhook: (
    payload: unknown,
    headers: Headers
  ) => ProviderWebhookParseResult;
  buildCredentialsPreview: (
    credentials: TicketingCredentialInput
  ) => {
    primary: string;
    secondary?: string;
  };
};

export function maskSecret(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 8) {
    return "••••••••";
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export async function fetchProviderJson<T>(
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw new Error(
      `TICKETING_PROVIDER_ERROR:${response.status}:${response.statusText}`
    );
  }

  return payload;
}

export function toCurrencyMajor(value: unknown) {
  if (typeof value === "number") {
    return value / 100;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed / 100 : 0;
  }

  return 0;
}

export function toInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  }

  return 0;
}
