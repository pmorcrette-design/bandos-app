import { MerchManagerView } from "@/components/merch/merch-manager-view";
import { PageHeader } from "@/components/shared/page-header";
import { buttonStyles } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { getSumUpConnectionStatus } from "@/lib/integrations/sumup";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";
import Link from "next/link";

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
          "Ajoute, supprime et mets à jour les articles manuellement, ou importe le catalogue observé depuis les transactions SumUp tout en gardant le stock géré dans BandOS.",
          "Add, delete, and update items manually, or import the observed catalog from SumUp transactions while keeping stock managed in BandOS."
        )}
        actions={
          <Link
            href="/app/merch/forecast"
            className={buttonStyles({ variant: "secondary" })}
          >
            {t(locale, "Ouvrir Forecast", "Open Forecast")}
          </Link>
        }
      />

      <MerchManagerView
        currency={currencyPreference}
        locale={locale}
        sumupStatus={sumupStatus}
      />
    </div>
  );
}
