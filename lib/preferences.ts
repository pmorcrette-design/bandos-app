import { cookies } from "next/headers";

import { normalizeLocale, type Locale } from "@/lib/i18n";
import { normalizeCurrency, type SupportedCurrency } from "@/lib/utils";

export async function getCurrencyPreference(): Promise<SupportedCurrency> {
  const cookieStore = await cookies();
  return normalizeCurrency(cookieStore.get("bandos_currency")?.value);
}

export async function getLocalePreference(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("bandos_locale")?.value);
}
