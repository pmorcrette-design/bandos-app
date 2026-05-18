import { DashboardLiveView } from "@/components/dashboard/dashboard-live-view";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function DashboardPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();

  return <DashboardLiveView currency={currencyPreference} locale={locale} />;
}
