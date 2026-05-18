import { FinanceView } from "@/components/finance/finance-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getCurrencyPreference } from "@/lib/preferences";
import { getLocalePreference } from "@/lib/preferences";

export default async function FinancePage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Finance", "Finance")}
        title={t(locale, "Suivre le cashflow et l'économie de tournée", "Track tour cash flow and member economics")}
        description={t(
          locale,
          "Suis les revenus, dépenses, ventes merch, hôtels, carburant, ferries, nourriture, locations, salaires et exports propres.",
          "Monitor income, expenses, merch sales, hotels, fuel, ferries, food, rentals, salaries, and clean exports."
        )}
      />
      <FinanceView currency={currencyPreference} locale={locale} />
    </div>
  );
}
