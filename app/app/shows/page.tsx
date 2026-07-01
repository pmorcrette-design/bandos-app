import { ImportedShowFolders } from "@/components/shows/imported-show-folders";
import { StandaloneShowsList } from "@/components/shows/standalone-shows-list";
import { PageHeader } from "@/components/shared/page-header";
import { getSessionUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function ShowsPage() {
  const [currencyPreference, locale, session] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference(),
    getSessionUser()
  ]);
  const showDemoData = session?.isDemoWorkspace ?? false;

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
          showDemoData
            ? "Les imports validés depuis Tournée créent ici des dossiers éditables. Tu peux aussi ajouter des dates uniques à la main. Les dates de démo déjà présentes restent visibles plus bas."
            : "Les imports validés depuis Tournée créent ici des dossiers éditables. Tu peux aussi ajouter des dates uniques à la main. Chaque workspace ne voit que ses propres dates.",
          showDemoData
            ? "Validated imports from Tour create editable folders here. You can also add manual single dates. The built-in demo shows remain visible below."
            : "Validated imports from Tour create editable folders here. You can also add manual single dates. Every workspace only sees its own dates."
        )}
      />

      <ImportedShowFolders currency={currencyPreference} locale={locale} />

      {showDemoData ? (
        <StandaloneShowsList
          currency={currencyPreference}
          locale={locale}
          showDemoData={showDemoData}
        />
      ) : null}
    </div>
  );
}
