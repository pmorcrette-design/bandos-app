import Link from "next/link";

import { BandosLogo } from "@/components/brand/bandos-logo";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export default async function NotFound() {
  const locale = await getLocalePreference();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Card className="w-full text-center">
        <BandosLogo className="justify-center" />
        <p className="mt-8 text-sm uppercase tracking-[0.24em] text-coral-300">
          {t(locale, "Route introuvable", "Route not found")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-mist-50">
          {t(locale, "Cette étape est hors de la carte de tournée.", "This stop is off the tour map.")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-mist-300">
          {t(
            locale,
            "La page demandée n'existe pas dans ce workspace. Reviens au tableau de bord pour continuer la tournée.",
            "The page you requested does not exist in this workspace. Head back to the dashboard and keep the run moving."
          )}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/app" className={buttonStyles({ variant: "primary" })}>
            {t(locale, "Retour au tableau de bord", "Return to dashboard")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
