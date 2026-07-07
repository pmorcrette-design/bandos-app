import Link from "next/link";

import { MerchForecastView } from "@/components/merch/merch-forecast-view";
import { PageHeader } from "@/components/shared/page-header";
import { buttonStyles } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  getSumUpConnectionStatus,
  getSumUpMerchSalesHistory
} from "@/lib/integrations/sumup";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";
import { getSessionUser } from "@/lib/auth/session";

export default async function MerchForecastPage() {
  const session = await getSessionUser();
  const [locale, currencyPreference, sumupStatus] = await Promise.all([
    getLocalePreference(),
    getCurrencyPreference(),
    getSumUpConnectionStatus(session?.workspaceId)
  ]);
  let initialSales = await getSumUpMerchSalesHistory(session?.workspaceId).catch(() => []);
  let initialError: string | null = null;

  if (!initialSales.length && sumupStatus.error) {
    initialError = sumupStatus.error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Merch Forecast", "Merch Forecast")}
        title={t(
          locale,
          "Projette la prod merch à partir des ventes réelles",
          "Project merch production from real sales data"
        )}
        description={t(
          locale,
          "BandOS relie les ventes SumUp, le stock manuel, les designs et les prochaines dates pour recommander les quantités à produire et préparer un bon de commande.",
          "BandOS connects SumUp sales, manual stock, designs, and upcoming dates to recommend production quantities and prepare a purchase order."
        )}
        actions={
          <Link href="/app/merch" className={buttonStyles({ variant: "secondary" })}>
            {t(locale, "Retour au merch", "Back to merch")}
          </Link>
        }
      />

      <MerchForecastView
        locale={locale}
        currency={currencyPreference}
        workspaceName={session?.workspace ?? "BandOS workspace"}
        initialSales={initialSales}
        initialError={initialError}
        sumupConnected={sumupStatus.connected}
      />
    </div>
  );
}
