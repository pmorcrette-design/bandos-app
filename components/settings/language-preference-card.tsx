"use client";

import { usePathname } from "next/navigation";

import { setLocalePreferenceAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t, type Locale } from "@/lib/i18n";

export function LanguagePreferenceCard({
  locale
}: {
  locale: Locale;
}) {
  const pathname = usePathname();

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Langue d'interface", "Interface language")}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Bascule l'interface entre français et anglais sans quitter le workspace.",
              "Switch the interface between French and English without leaving the workspace."
            )}
          </p>
        </div>
        <Badge tone="accent">
          {t(locale, "Actuelle", "Current")}: {locale.toUpperCase()}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(["fr", "en"] as const).map((code) => {
          const isActive = code === locale;

          return (
            <form key={code} action={setLocalePreferenceAction}>
              <input type="hidden" name="locale" value={code} />
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
                  {code.toUpperCase()}
                </span>
                <span className="mt-2 text-2xl font-semibold">
                  {code === "fr" ? "Francais" : "English"}
                </span>
                <span className="mt-2 text-sm">
                  {code === "fr"
                    ? t(locale, "Interface francophone", "French interface")
                    : t(locale, "Interface anglaise", "English interface")}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </Card>
  );
}
