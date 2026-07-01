import { DashboardLiveView } from "@/components/dashboard/dashboard-live-view";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function DashboardPage() {
  const [currencyPreference, locale, session] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference(),
    getSessionUser()
  ]);

  return (
    <DashboardLiveView
      currency={currencyPreference}
      locale={locale}
      showDemoData={session?.isDemoWorkspace ?? false}
    />
  );
}
