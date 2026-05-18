import { MerchManagerView } from "@/components/merch/merch-manager-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getSumUpConnectionStatus } from "@/lib/integrations/sumup";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function MerchPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();
  const sumupStatus = await getSumUpConnectionStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Merch", "Merch")}
        title={t(
          locale,
          "Stock, marges et ventes tournée dans une seule vue",
          "Stock, margins, and touring sales in one clean view"
        )}
        description={t(
          locale,
          "Ajoute, supprime et mets à jour les articles manuellement tant que la connexion SumUp n'est pas finalisée.",
          "Add, delete, and update items manually until SumUp connection is fully ready."
        )}
      />

      <MerchManagerView
        currency={currencyPreference}
        locale={locale}
        sumupStatus={sumupStatus}
      />
    </div>
  );
}
