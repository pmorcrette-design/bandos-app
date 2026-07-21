import { ImportedShowFolders } from "@/components/shows/imported-show-folders";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function ShowsPage() {
  const [currencyPreference, locale] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Concerts", "Shows")}
        title={t(
          locale,
          "Dossiers concerts et dates du workspace",
          "Show folders and workspace dates"
        )}
        description={t(
          locale,
          "Ajoute directement une date à une tournée, crée une nouvelle tournée ou garde un concert hors tournée. Chaque workspace ne voit que ses propres dates.",
          "Add a show directly to a tour, create a new tour, or keep a show off-tour. Every workspace only sees its own dates."
        )}
      />

      <ImportedShowFolders currency={currencyPreference} locale={locale} />
    </div>
  );
}
