import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { t, translateShowStatus } from "@/lib/i18n";
import { getShowById } from "@/lib/mock-data";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";
import { getShowBreakEvenMetrics } from "@/lib/shows";
import { formatCurrency, replaceCurrencyInText } from "@/lib/utils";

export default async function ShowDetailPage({
  params
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const [currencyPreference, locale, session] = await Promise.all([
    getCurrencyPreference(),
    getLocalePreference(),
    getSessionUser()
  ]);
  const show = getShowById(showId);

  if (!show || !session?.isDemoWorkspace) {
    notFound();
  }

  const breakEven = getShowBreakEvenMetrics(show);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Fiche concert", "Show sheet")}
        title={`${show.venue} • ${show.city}`}
        description={t(
          locale,
          "La fiche complète de la date: timings, deal, salles, contacts, logistique, documents et advance pack.",
          "The full show sheet: timings, deal terms, venue data, contacts, logistics, documents, and advance pack."
        )}
        actions={
          <>
            <Link href="/app/shows" className={buttonStyles({ variant: "secondary" })}>
              {t(locale, "Retour concerts", "Back to shows")}
            </Link>
            <Link href="#advance-pack" className={buttonStyles({ variant: "primary" })}>
              {t(locale, "Advance pack", "Advance pack")}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={show.status === "booked" ? "success" : "accent"}>
              {translateShowStatus(locale, show.status)}
            </Badge>
            <Badge>{show.date}</Badge>
            <Badge>{show.city}</Badge>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Deal", "Deal")}
              </p>
              <p className="mt-2 font-medium text-mist-50">
                {replaceCurrencyInText(show.fee, currencyPreference)}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {replaceCurrencyInText(show.doorSplit, currencyPreference)}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Schedule", "Schedule")}
              </p>
              <p className="mt-2 font-medium text-mist-50">
                {show.loadIn} • {show.soundcheck}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {show.setTime} • Curfew {show.curfew}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Room", "Room")}
              </p>
              <p className="mt-2 font-medium text-mist-50">
                {show.capacity} {t(locale, "places", "cap")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {t(locale, "Billet", "Ticket")}{" "}
                {formatCurrency(show.ticketPrice, currencyPreference, "GBP")}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Location salle", "Room hire")}
              </p>
              <p className="mt-2 font-medium text-mist-50">
                {formatCurrency(show.roomHire, currencyPreference, "GBP")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {show.projectedAttendance} {t(locale, "projetés", "projected")}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Équilibre économique", "Economic balance")}
                </p>
                <p className="mt-2 text-xl font-semibold text-mist-50">
                  {breakEven.breakEvenTickets} {t(locale, "billets pour couvrir la salle", "tickets to cover room hire")}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {t(locale, "Projection billetterie", "Projected gross")}{" "}
                  {formatCurrency(breakEven.projectedGross, currencyPreference, "GBP")} •{" "}
                  {t(locale, "delta", "delta")}{" "}
                  {breakEven.delta >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(breakEven.delta), currencyPreference, "GBP")}
                </p>
              </div>
              <Badge tone={breakEven.isAtBreakEven ? "success" : "warning"}>
                {breakEven.isAtBreakEven
                  ? t(locale, "date viable", "viable show")
                  : t(locale, "date fragile", "fragile show")}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Infos salle & logistique", "Venue & logistics")}
          </p>
          <div className="mt-5 space-y-3">
            {[
              [t(locale, "Salle", "Venue"), show.venue],
              [t(locale, "Promoteur", "Promoter"), show.promoter],
              [t(locale, "Adresse", "Address"), show.address],
              [t(locale, "Parking", "Parking"), show.parking],
              [t(locale, "Couchage", "Sleeping"), show.sleeping],
              [t(locale, "Hospitality", "Hospitality"), show.hospitality]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-7 text-mist-50">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Contacts", "Contacts")}
          </p>
          <div className="mt-5 space-y-3">
            {show.contacts.map((contact) => (
              <div
                key={contact.email}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-mist-50">{contact.name}</p>
                    <p className="mt-1 text-sm text-mist-300">{contact.title}</p>
                  </div>
                  <Badge>{show.promoter}</Badge>
                </div>
                <p className="mt-3 text-sm text-mist-200">{contact.email}</p>
                <p className="mt-1 text-sm text-mist-200">{contact.phone}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Line-up, notes et fichiers", "Lineup, notes, and files")}
          </p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Line-up", "Lineup")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {show.lineup.map((band) => (
                  <Badge key={band}>{band}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Note de route", "Route note")}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-200">{show.routeNote}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Notes internes", "Internal notes")}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-200">{show.notes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Fichiers joints", "Attached files")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {show.attachedFiles.map((file) => (
                  <Badge key={file}>{file}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card id="advance-pack">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-coral-300">
              {t(locale, "Advance generator", "Advance generator")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-mist-50">
              {t(locale, "Advance pack auto-généré", "Auto-generated advance pack")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-mist-300">
              {t(
                locale,
                "Stage plot, input list, rider, contacts, parking et déroulé de journée compilés dans un export propre.",
                "Stage plot, input list, rider, contacts, parking, and day schedule compiled into a clean export."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={buttonStyles({ variant: "secondary" })}>
              <Download className="h-4 w-4" />
              {t(locale, "Exporter PDF", "Export PDF")}
            </button>
            <button type="button" className={buttonStyles({ variant: "primary" })}>
              <ExternalLink className="h-4 w-4" />
              {t(locale, "Partager le lien", "Share link")}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Stage plot", "Stage plot")}
            </p>
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/20 p-6">
              <div className="flex h-52 items-end justify-between gap-3">
                {["Bass", "Drums", "Vox", "Gtr L", "Gtr R"].map((slot) => (
                  <div key={slot} className="flex flex-1 flex-col items-center gap-3">
                    <div className="h-24 w-full rounded-2xl border border-white/10 bg-white/[0.03]" />
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {slot === "Bass"
                        ? t(locale, "Basse", "Bass")
                        : slot === "Drums"
                          ? t(locale, "Batterie", "Drums")
                          : slot === "Vox"
                            ? t(locale, "Chant", "Vox")
                            : slot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                label: t(locale, "Input list", "Input list"),
                body: "Kick • Snare • OH L/R • Bass DI • Guitar L/R • Lead Vox"
              },
              {
                label: t(locale, "Hospitality rider", "Hospitality rider"),
                body: show.hospitality
              },
              {
                label: t(locale, "Contacts & schedule", "Contacts & schedule"),
                body: `${show.promoter} • ${show.contacts[0]?.phone ?? "—"} • Load-in ${show.loadIn} • Set ${show.setTime}`
              }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {item.label}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist-200">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
