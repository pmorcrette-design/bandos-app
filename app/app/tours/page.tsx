import { PageHeader } from "@/components/shared/page-header";
import { TourRoutePlanner } from "@/components/tours/tour-route-planner";
import { getSessionUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function ToursPage() {
  const [currencyPreference, locale, session] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference(),
    getSessionUser()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Tournée", "Tour")}
        title={t(
          locale,
          "Import, ordre des dates et vision globale de la route",
          "Import, date order, and global route overview"
        )}
        description={t(
          locale,
          "Cette vue sert uniquement à importer les dates, les remettre dans le bon ordre et visualiser le kilométrage ainsi que le coût route sur toute la tournée.",
          "This view is focused on importing dates, placing them in the right order, and visualizing total mileage and route cost across the full run."
        )}
      />

      <TourRoutePlanner
        currency={currencyPreference}
        locale={locale}
        showDemoData={session?.isDemoWorkspace ?? false}
      />
    </div>
  );
}
