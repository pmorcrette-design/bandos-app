"use client";

import { usePathname } from "next/navigation";

import { setCurrencyPreferenceAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t, type Locale } from "@/lib/i18n";
import { supportedCurrencyMeta, type SupportedCurrency } from "@/lib/utils";

export function CurrencyPreferenceCard({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const pathname = usePathname();

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Devise d'affichage", "Display currency")}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Choisis la devise utilisée dans la finance, le merch, les coûts de route et les prix prestataires. Les conversions démo utilisent une table FX interne fixe.",
              "Choose the currency used across finance, merch, routing costs, and provider pricing. Demo conversions use a fixed internal FX table."
            )}
          </p>
        </div>
        <Badge tone="accent">
          {t(locale, "Actuelle", "Current")}: {currency}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(Object.keys(supportedCurrencyMeta) as SupportedCurrency[]).map((code) => {
          const item = supportedCurrencyMeta[code];
          const isActive = code === currency;

          return (
            <form key={code} action={setCurrencyPreferenceAction}>
              <input type="hidden" name="currency" value={code} />
              <input type="hidden" name="returnTo" value={pathname} />
              <button
                type="submit"
                className={`flex w-full flex-col items-start rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-coral-500/30 bg-coral-500/10 text-mist-50"
                    : "border-white/8 bg-white/[0.03] text-mist-200 hover:bg-white/5"
                }`}
              >
                <span className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {item.label}
                </span>
                <span className="mt-2 text-2xl font-semibold">{item.symbol}</span>
                <span className="mt-2 text-sm">
                  {code === "GBP"
                    ? t(locale, "Livre sterling", "British pound")
                    : code === "EUR"
                      ? t(locale, "Euro", "Euro")
                      : t(locale, "Dollar US", "US dollar")}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </Card>
  );
}
