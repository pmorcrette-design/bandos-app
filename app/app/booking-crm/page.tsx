import { BookingCrmView } from "@/components/crm/booking-crm-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function BookingCrmPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "CRM booking", "Booking CRM")}
        title={t(
          locale,
          "Une liste claire des contacts booking",
          "A clean list of booking contacts"
        )}
        description={t(
          locale,
          "Clique sur un contact pour ouvrir sa fiche, voir ses infos, son historique et le prix de la salle quand il est renseigné.",
          "Click a contact to open its detail sheet, see its info, history, and room hire when it is available."
        )}
      />
      <BookingCrmView currency={currencyPreference} locale={locale} />
    </div>
  );
}
