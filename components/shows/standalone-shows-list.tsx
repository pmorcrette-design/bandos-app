"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, Clock3, Trash2, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { shows } from "@/lib/mock-data";
import { t, translateShowStatus, type Locale } from "@/lib/i18n";
import {
  getAttendanceProjectionMetrics,
  getShowBreakEvenMetrics
} from "@/lib/shows";
import {
  formatCurrency,
  replaceCurrencyInText,
  type SupportedCurrency
} from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

export function StandaloneShowsList({
  currency,
  locale,
  showDemoData
}: {
  currency: SupportedCurrency;
  locale: Locale;
  showDemoData: boolean;
}) {
  const hiddenStandaloneShowIds = useBandosUIStore(
    (state) => state.hiddenStandaloneShowIds
  );
  const hideStandaloneShow = useBandosUIStore((state) => state.hideStandaloneShow);

  if (!showDemoData) {
    return (
      <EmptyState
        title={t(
          locale,
          "Aucune date hors tournée dans ce workspace",
          "No standalone dates in this workspace"
        )}
        body={t(
          locale,
          "Ce compte démarre vierge. Les dates visibles ici viendront uniquement de tes imports ou de tes futurs ajouts.",
          "This account starts blank. Any dates shown here will only come from your imports or future additions."
        )}
      />
    );
  }

  const visibleShows = shows.filter((show) => !hiddenStandaloneShowIds.includes(show.id));

  if (!visibleShows.length) {
    return (
      <EmptyState
        title={t(
          locale,
          "Aucune date hors tournée visible",
          "No standalone dates visible"
        )}
        body={t(
          locale,
          "Toutes les dates hors tournée ont été supprimées de la liste Concerts.",
          "All standalone dates were removed from the Shows list."
        )}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {visibleShows.map((show) => {
        const breakEven = getShowBreakEvenMetrics(show);
        const projectionAtEighty = getAttendanceProjectionMetrics({
          capacity: show.capacity,
          ticketPrice: show.ticketPrice,
          fixedCosts: show.roomHire
        });

        return (
          <Card key={show.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-mist-50">{show.venue}</h2>
                  <Badge tone={show.status === "booked" ? "success" : "accent"}>
                    {translateShowStatus(locale, show.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-mist-300">
                  {show.city}, {show.country} • {show.date}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist-300">{show.notes}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/shows/${show.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-coral-300 transition hover:text-coral-200"
                >
                  {t(locale, "Ouvrir la fiche", "Open show sheet")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => hideStandaloneShow(show.id)}
                  className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  {t(locale, "Supprimer", "Delete")}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-mist-300">
                  <CircleDollarSign className="h-4 w-4 text-coral-300" />
                  {t(locale, "Deal", "Deal")}
                </div>
                <p className="mt-3 font-medium text-mist-50">
                  {replaceCurrencyInText(show.fee, currency)}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {replaceCurrencyInText(show.doorSplit, currency)}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-mist-300">
                  <Clock3 className="h-4 w-4 text-coral-300" />
                  {t(locale, "Planning", "Schedule")}
                </div>
                <p className="mt-3 font-medium text-mist-50">
                  {t(locale, "Load-in", "Load-in")} {show.loadIn}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {t(locale, "Set", "Set")} {show.setTime} • Curfew {show.curfew}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-mist-300">
                  <UsersRound className="h-4 w-4 text-coral-300" />
                  {t(locale, "Salle", "Room")}
                </div>
                <p className="mt-3 font-medium text-mist-50">
                  {show.capacity} {t(locale, "places", "cap")}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {t(locale, "Billet", "Ticket")}{" "}
                  {formatCurrency(show.ticketPrice, currency, "GBP")}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Parking / couchage", "Parking / sleeping")}
                </p>
                <p className="mt-3 text-sm text-mist-50">{show.parking}</p>
                <p className="mt-1 text-sm text-mist-300">{show.sleeping}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {t(locale, "Équilibre de la date", "Show break-even")}
                  </p>
                  <p className="mt-2 text-lg font-medium text-mist-50">
                    {breakEven.breakEvenTickets}{" "}
                    {t(locale, "billets pour couvrir", "tickets to cover")}{" "}
                    {formatCurrency(show.roomHire, currency, "GBP")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {show.projectedAttendance} {t(locale, "projetés", "projected")} •{" "}
                    {t(locale, "delta", "delta")}{" "}
                    {breakEven.delta >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(breakEven.delta), currency, "GBP")}
                  </p>
                  <p className="mt-3 text-sm text-mist-200">
                    {projectionAtEighty
                      ? t(
                          locale,
                          `À 80% de remplissage: ${projectionAtEighty.projectedAttendance} billets • ${projectionAtEighty.delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(projectionAtEighty.delta), currency, "GBP")} net après coûts`,
                          `At 80% occupancy: ${projectionAtEighty.projectedAttendance} tickets • ${projectionAtEighty.delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(projectionAtEighty.delta), currency, "GBP")} net after costs`
                        )
                      : t(
                          locale,
                          "Renseigne la jauge et le billet pour voir la projection 80%.",
                          "Add capacity and ticket price to see the 80% projection."
                        )}
                  </p>
                </div>
                <Badge tone={breakEven.isAtBreakEven ? "success" : "warning"}>
                  {breakEven.isAtBreakEven
                    ? t(locale, "à l'équilibre", "at break-even")
                    : t(locale, "sous le seuil", "below break-even")}
                </Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
