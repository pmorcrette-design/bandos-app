import { PageHeader } from "@/components/shared/page-header";
import { TourServicesView } from "@/components/services/tour-services-view";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function TourServicesPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Vans // Drivers", "Vans // Drivers")}
        title={t(
          locale,
          "Registre opérationnel des vans, bus et drivers",
          "Operational registry for vans, buses, and drivers"
        )}
        description={t(
          locale,
          "Recherche libre, création, suppression, photos véhicule et champs dynamiques selon le type sélectionné.",
          "Free search, create/delete flows, vehicle photos, and dynamic fields based on the selected vehicle type."
        )}
      />
      <TourServicesView currency={currencyPreference} locale={locale} />
    </div>
  );
}
