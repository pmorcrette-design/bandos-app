import { ImportedShowFolders } from "@/components/shows/imported-show-folders";
import { StandaloneShowsList } from "@/components/shows/standalone-shows-list";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function ShowsPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();

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
          "Les imports validés depuis Tournée créent ici des dossiers éditables. Les dates de démo déjà présentes restent visibles plus bas.",
          "Validated imports from Tour create editable folders here. The built-in demo shows remain visible below."
        )}
      />

      <ImportedShowFolders currency={currencyPreference} locale={locale} />

      <StandaloneShowsList currency={currencyPreference} locale={locale} />
    </div>
  );
}
