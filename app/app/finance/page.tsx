import { FinanceView } from "@/components/finance/finance-view";
import { PageHeader } from "@/components/shared/page-header";
import { getSessionUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getCurrencyPreference } from "@/lib/preferences";
import { getLocalePreference } from "@/lib/preferences";

export default async function FinancePage() {
  const [currencyPreference, locale, session] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference(),
    getSessionUser()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Finance", "Finance")}
        title={t(locale, "Suivre le cashflow et l'économie de tournée", "Track tour cash flow and member economics")}
        description={t(
          locale,
          "Toutes les dates sont maintenant regroupées par dossier tournée, avec une zone dates uniques et un suivi du niveau de billetterie par date.",
          "All dates are now grouped by tour folder, with a single-dates area and per-show ticketing tracking."
        )}
      />
      <FinanceView
        currency={currencyPreference}
        locale={locale}
        showDemoData={session?.isDemoWorkspace ?? false}
      />
    </div>
  );
}
