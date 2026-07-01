"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, Truck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { RouteMap } from "@/components/shared/route-map";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import {
  t,
  translateShowStatus,
  translateTaskPriority,
  translateTaskStatus,
  type Locale
} from "@/lib/i18n";
import { shows } from "@/lib/mock-data";
import { getMerchInventorySummary } from "@/lib/merch";
import { getAttendanceProjectionMetrics, getTourCalendarDayCount } from "@/lib/shows";
import type { TicketSalesSnapshot, TicketingEvent } from "@/lib/ticketing/types";
import {
  convertCurrency,
  formatCompactCurrency,
  formatCurrency,
  normalizeCurrency,
  replaceCurrencyInText,
  type SupportedCurrency
} from "@/lib/utils";
import { useBandosUIStore, type VehicleCatalogItem } from "@/store/ui-store";

type OperatingShow = {
  id: string;
  source: "imported" | "standalone";
  isStandalone: boolean;
  tourName: string | null;
  date: string;
  city: string;
  country: string;
  venue: string;
  status: "booked" | "pending" | "cancelled" | "local support needed";
  notes: string;
  capacity: number | null;
  sleeping: string;
  setTime: string;
  feeLabel: string;
  dealLabel: string;
  ticketPrice: number | null;
  roomHire: number | null;
  tourCurrency: SupportedCurrency;
  validated: boolean;
  soundEngineerCost: number;
  localBandCost: number;
};

type DashboardTaskLine = {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in progress" | "waiting" | "done";
};

type TicketingSummaryItem = {
  showId: string;
  event: TicketingEvent;
  snapshot: TicketSalesSnapshot | null;
};

type ImportedTourSummary = {
  name: string;
  currency: SupportedCurrency;
  shows: OperatingShow[];
  assignedVehicle: VehicleCatalogItem | null;
  transportDays: number;
  transportCost: number;
};

function getNightCostsTotal(show: Pick<OperatingShow, "roomHire" | "soundEngineerCost" | "localBandCost">) {
  return (show.roomHire ?? 0) + show.soundEngineerCost + show.localBandCost;
}

function parseDashboardDateValue(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue);

  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  const dayFirstMatch = normalizedValue.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

  if (!dayFirstMatch) {
    return null;
  }

  return Date.UTC(
    Number(dayFirstMatch[3]),
    Number(dayFirstMatch[2]) - 1,
    Number(dayFirstMatch[1])
  );
}

function compareDashboardDates(left: string, right: string) {
  const leftTimestamp = parseDashboardDateValue(left);
  const rightTimestamp = parseDashboardDateValue(right);

  if (leftTimestamp !== null && rightTimestamp !== null) {
    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp;
    }

    return 0;
  }

  if (leftTimestamp !== null) {
    return -1;
  }

  if (rightTimestamp !== null) {
    return 1;
  }

  return left.localeCompare(right);
}

function getImportedLocalBandCost(folder: {
  localSupportActs?: Array<{ fee: number | null }>;
  localBandCount?: number;
  localBandFeePerBand?: number | null;
}) {
  if (folder.localSupportActs?.length) {
    return folder.localSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0);
  }

  return (folder.localBandCount ?? 0) * (folder.localBandFeePerBand ?? 0);
}

function isShowOperationallyReady(show: OperatingShow) {
  const baseReady = show.ticketPrice !== null && show.roomHire !== null;

  return show.source === "imported"
    ? baseReady && show.validated
    : baseReady && show.status === "booked";
}

function getShowOperationalScore(show: OperatingShow) {
  let score = 0;

  if (show.ticketPrice !== null) {
    score += 1;
  }

  if (show.roomHire !== null) {
    score += 1;
  }

  if (show.source === "imported" ? show.validated : show.status === "booked") {
    score += 1;
  }

  return score;
}

function buildOperatingTaskLines(
  locale: Locale,
  operatingShows: OperatingShow[]
): DashboardTaskLine[] {
  const items = operatingShows.flatMap((show) => {
    const lines: DashboardTaskLine[] = [];

    if (show.ticketPrice === null) {
      lines.push({
        id: `${show.id}-ticket`,
        title: t(
          locale,
          `Renseigner le prix billet pour ${show.venue}`,
          `Add ticket price for ${show.venue}`
        ),
        assignee: "Band ops",
        deadline: show.date,
        priority: "high" as const,
        status: "todo" as const
      });
    }

    if (show.roomHire === null) {
      lines.push({
        id: `${show.id}-room`,
        title: t(
          locale,
          `Renseigner le coût salle pour ${show.venue}`,
          `Add room hire for ${show.venue}`
        ),
        assignee: "Band ops",
        deadline: show.date,
        priority: "high" as const,
        status: "todo" as const
      });
    }

    if (show.source === "imported" && !show.validated) {
      lines.push({
        id: `${show.id}-validate`,
        title: t(
          locale,
          `Valider la date ${show.venue}`,
          `Validate ${show.venue}`
        ),
        assignee: "Band ops",
        deadline: show.date,
        priority: "medium" as const,
        status: "waiting" as const
      });
    }

    if (show.source === "standalone" && show.status !== "booked") {
      lines.push({
        id: `${show.id}-status`,
        title: t(
          locale,
          `Mettre à jour le statut de ${show.venue}`,
          `Update status for ${show.venue}`
        ),
        assignee: "Band ops",
        deadline: show.date,
        priority: show.status === "pending" ? "high" : "medium",
        status: "waiting" as const
      });
    }

    if (show.status === "local support needed") {
      lines.push({
        id: `${show.id}-support`,
        title: t(
          locale,
          `Trouver les groupes locaux pour ${show.venue}`,
          `Find local bands for ${show.venue}`
        ),
        assignee: "Booking",
        deadline: show.date,
        priority: "high",
        status: "todo"
      });
    }

    return lines;
  });

  return items
    .sort((left, right) => compareDashboardDates(left.deadline, right.deadline))
    .slice(0, 4);
}

function buildRouteStops(locale: Locale, operatingShows: OperatingShow[]) {
  return operatingShows.map((show) => ({
    city: show.city || show.venue,
    country: show.country || "—",
    distance: show.date || "—",
    note:
      show.source === "imported" && show.validated
        ? t(locale, "date validée", "validated")
        : translateShowStatus(locale, show.status)
  }));
}

export function DashboardLiveView({
  currency,
  locale,
  showDemoData
}: {
  currency: SupportedCurrency;
  locale: Locale;
  showDemoData: boolean;
}) {
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const hiddenStandaloneShowIds = useBandosUIStore(
    (state) => state.hiddenStandaloneShowIds
  );
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const vehicleCatalog = useBandosUIStore((state) => state.vehicleCatalog);
  const tourVehicleAssignments = useBandosUIStore((state) => state.tourVehicleAssignments);
  const [ticketingSummaries, setTicketingSummaries] = useState<TicketingSummaryItem[]>([]);

  const inventory = useMemo(
    () => getMerchInventorySummary(merchCatalog),
    [merchCatalog]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTicketingSummary() {
      const response = await fetch("/api/ticketing/summary", {
        method: "GET",
        cache: "no-store"
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { summaries?: TicketingSummaryItem[] }
        | null;

      if (!cancelled && payload?.summaries) {
        setTicketingSummaries(payload.summaries);
      }
    }

    void loadTicketingSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleStandaloneShows = useMemo(
    () =>
      showDemoData
        ? shows.filter((show) => !hiddenStandaloneShowIds.includes(show.id))
        : [],
    [hiddenStandaloneShowIds, showDemoData]
  );

  const importedOperatingShows = useMemo<OperatingShow[]>(
    () =>
      importedShowFolders.map((folder) => ({
        id: folder.id,
        source: "imported",
        isStandalone: folder.isStandalone,
        tourName: folder.tourName,
        date: folder.date,
        city: folder.city,
        country: folder.country,
        venue: folder.venue,
        status: folder.status,
        notes: folder.notes || t(locale, "Date importée depuis Tournée.", "Imported from Tour."),
        capacity: folder.capacity,
        sleeping: t(locale, "À renseigner", "To be filled"),
        setTime: t(locale, "À caler", "TBD"),
        feeLabel:
          folder.ticketPrice !== null
            ? formatCurrency(folder.ticketPrice, folder.tourCurrency, "GBP")
            : "—",
        dealLabel:
          folder.roomHire !== null
            ? formatCurrency(folder.roomHire, folder.tourCurrency, "GBP")
            : "—",
        ticketPrice: folder.ticketPrice,
        roomHire: folder.roomHire,
        tourCurrency: folder.tourCurrency,
        validated: folder.validated,
        soundEngineerCost: folder.soundEngineerCost ?? 0,
        localBandCost: getImportedLocalBandCost(folder)
      })),
    [importedShowFolders, locale]
  );

  const standaloneOperatingShows = useMemo<OperatingShow[]>(
    () =>
      visibleStandaloneShows.map((show) => ({
        id: show.id,
        source: "standalone",
        isStandalone: true,
        tourName: null,
        date: show.date,
        city: show.city,
        country: show.country,
        venue: show.venue,
        status: show.status,
        notes: show.notes,
        capacity: show.capacity,
        sleeping: show.sleeping,
        setTime: show.setTime,
        feeLabel: replaceCurrencyInText(show.fee, currency),
        dealLabel: replaceCurrencyInText(show.doorSplit, currency),
        ticketPrice: show.ticketPrice,
        roomHire: show.roomHire,
        tourCurrency: currency,
        validated: true,
        soundEngineerCost: 0,
        localBandCost: 0
      })),
    [currency, visibleStandaloneShows]
  );

  const allOperatingShows = useMemo(
    () =>
      [...importedOperatingShows, ...standaloneOperatingShows].sort((left, right) =>
        compareDashboardDates(left.date, right.date)
      ),
    [importedOperatingShows, standaloneOperatingShows]
  );

  const vehicleById = useMemo(
    () => new Map(vehicleCatalog.map((vehicle) => [vehicle.id, vehicle] as const)),
    [vehicleCatalog]
  );
  const assignmentByTour = useMemo(
    () =>
      new Map(
        tourVehicleAssignments.map((assignment) => [assignment.tourName, assignment] as const)
      ),
    [tourVehicleAssignments]
  );

  const importedTours = useMemo<ImportedTourSummary[]>(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        currency: SupportedCurrency;
        shows: OperatingShow[];
      }
    >();

    for (const show of importedOperatingShows) {
      if (show.isStandalone) {
        continue;
      }

      const key = show.tourName ?? "Imported tour";
      const existing = grouped.get(key) ?? {
        name: key,
        currency: show.tourCurrency,
        shows: []
      };

      existing.shows.push(show);
      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .map((tour) => {
        const shows = [...tour.shows].sort((left, right) =>
          compareDashboardDates(left.date, right.date)
        );
        const assignedVehicle =
          vehicleById.get(assignmentByTour.get(tour.name)?.vehicleId ?? "") ?? null;
        const transportDays = getTourCalendarDayCount(
          shows.map((show) => ({ date: show.date }))
        );
        const transportCost = assignedVehicle
          ? assignedVehicle.estimatedDailyPrice * transportDays
          : 0;

        return {
          ...tour,
          shows,
          assignedVehicle,
          transportDays,
          transportCost
        };
      })
      .sort((left, right) =>
        compareDashboardDates(left.shows[0]?.date ?? "", right.shows[0]?.date ?? "")
      );
  }, [assignmentByTour, importedOperatingShows, vehicleById]);

  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);
  const upcomingShows = allOperatingShows.filter((show) => {
    const showTimestamp = parseDashboardDateValue(show.date);
    return showTimestamp !== null && showTimestamp >= todayTimestamp;
  });
  const nextShow =
    upcomingShows[0] ??
    allOperatingShows[0] ??
    standaloneOperatingShows[0] ??
    importedOperatingShows[0];

  const activeImportedTour =
    importedTours.find((tour) =>
      tour.shows.some((show) => {
        const showTimestamp = parseDashboardDateValue(show.date);
        return showTimestamp !== null && showTimestamp >= todayTimestamp;
      })
    ) ??
    importedTours[0] ??
    null;
  const activeRouteShows = activeImportedTour?.shows.length
    ? activeImportedTour.shows
    : upcomingShows.length
      ? upcomingShows.slice(0, 6)
      : allOperatingShows.slice(0, 6);
  const activeTourName = activeImportedTour?.name
    ? activeImportedTour.name
    : activeRouteShows.length
      ? t(locale, "Concerts visibles", "Visible shows")
      : t(locale, "Aucune tournée active", "No active tour");
  const activeTourStops = buildRouteStops(locale, activeRouteShows);

  const pendingConfirmations = allOperatingShows.filter((show) =>
    show.status === "pending" || show.status === "local support needed"
  ).length;
  const datesToComplete = allOperatingShows.filter(
    (show) => !isShowOperationallyReady(show)
  ).length;
  const totalTransportCosts = importedTours.reduce(
    (sum, tour) => sum + tour.transportCost,
    0
  );
  const tourNightCostsTotal = allOperatingShows.reduce(
    (sum, show) =>
      sum +
      (show.source === "imported"
        ? getNightCostsTotal(show)
        : show.roomHire ?? 0),
    0
  );
  const projectedNetAtEighty = allOperatingShows.reduce((sum, show) => {
    const projection = getAttendanceProjectionMetrics({
      capacity: show.capacity,
      ticketPrice: show.ticketPrice,
      fixedCosts:
        show.source === "imported"
          ? getNightCostsTotal(show)
          : show.roomHire ?? 0
    });

    return sum + (projection?.delta ?? 0);
  }, 0) - totalTransportCosts;
  const projectedShowsAtEighty = allOperatingShows.filter((show) =>
    Boolean(
      getAttendanceProjectionMetrics({
        capacity: show.capacity,
        ticketPrice: show.ticketPrice,
        fixedCosts:
          show.source === "imported"
            ? getNightCostsTotal(show)
            : show.roomHire ?? 0
        })
    )
  ).length;
  const borderReadiness = allOperatingShows.length
    ? Math.round(
        (allOperatingShows.reduce(
          (sum, show) => sum + getShowOperationalScore(show),
          0
        ) /
          (allOperatingShows.length * 3)) *
          100
      )
    : 0;
  const operatingTaskLines = buildOperatingTaskLines(locale, allOperatingShows);
  const displayCurrency =
    activeImportedTour?.currency ?? nextShow?.tourCurrency ?? currency;
  const bookedShowsCount = allOperatingShows.filter(
    (show) => show.status === "booked"
  ).length;
  const nextShowProjectionAtEighty = nextShow
    ? getAttendanceProjectionMetrics({
        capacity: nextShow.capacity,
        ticketPrice: nextShow.ticketPrice,
        fixedCosts:
          nextShow.source === "imported"
            ? getNightCostsTotal(nextShow)
            : nextShow.roomHire ?? 0
      })
    : null;

  const dashboardStats = [
    {
      label: t(locale, "Revenus merch", "Merch Revenue"),
      value: formatCompactCurrency(inventory.totalRevenue, currency, "GBP"),
      change: `${inventory.totalUnitsSold} ${t(locale, "unités vendues", "units sold")}`
    },
    {
      label: t(locale, "Coûts de dates", "Show costs"),
      value: formatCompactCurrency(
        tourNightCostsTotal + totalTransportCosts,
        displayCurrency,
        "GBP"
      ),
      change: t(
        locale,
        "Salle, ingé, groupes locaux et transport",
        "Room, engineer, local bands, and transport"
      )
    },
    {
      label: t(locale, "Projection 80%", "80% projection"),
      value: projectedShowsAtEighty
        ? `${projectedNetAtEighty >= 0 ? "+" : "-"}${formatCompactCurrency(
            Math.abs(projectedNetAtEighty),
            displayCurrency,
            "GBP"
          )}`
        : "—",
      change: projectedShowsAtEighty
        ? t(
            locale,
            `${projectedShowsAtEighty} date(s) simulées après coûts`,
            `${projectedShowsAtEighty} show(s) simulated after costs`
          )
        : t(
            locale,
            "Renseigne jauge + billet pour calculer cette projection",
            "Add capacity + ticket price to calculate this projection"
          )
    },
    {
      label: t(locale, "Confirmations en attente", "Pending confirmations"),
      value: String(pendingConfirmations),
      change: t(locale, "Statuts dates encore ouverts", "Shows still open")
    },
    {
      label: t(locale, "Dates à compléter", "Dates to finish"),
      value: String(datesToComplete),
      change: t(locale, "Validation et coûts manquants", "Validation or costs missing")
    }
  ];

  const ticketingDashboardStats = useMemo(() => {
    const linkedShows = ticketingSummaries.length;

    if (!linkedShows) {
      return null;
    }

    const totals = ticketingSummaries.reduce(
      (sum, summary) => {
        const sourceCurrency = normalizeCurrency(summary.event.currency);
        const grossRevenue =
          summary.snapshot?.grossRevenue ?? summary.event.grossRevenue;
        const netRevenue = summary.snapshot?.netRevenue ?? summary.event.netRevenue;
        const ticketsSold = summary.snapshot?.ticketsSold ?? summary.event.ticketsSold;
        const capacitySoldPercentage =
          summary.snapshot?.capacitySoldPercentage ??
          (summary.event.capacity && summary.event.capacity > 0
            ? (summary.event.ticketsSold / summary.event.capacity) * 100
            : null);
        const guestlistCount =
          summary.snapshot?.guestlistCount ?? summary.event.guestlistCount;
        const refundCount =
          summary.snapshot?.refundCount ?? summary.event.refundCount;
        const averageTicketPrice =
          summary.snapshot?.averageTicketPrice ?? summary.event.averageTicketPrice;

        return {
          grossRevenue:
            sum.grossRevenue + convertCurrency(grossRevenue, sourceCurrency, "GBP"),
          netRevenue:
            sum.netRevenue + convertCurrency(netRevenue, sourceCurrency, "GBP"),
          ticketsSold: sum.ticketsSold + ticketsSold,
          guestlistCount: sum.guestlistCount + guestlistCount,
          refundCount: sum.refundCount + refundCount,
          averageTicketPriceTotal:
            sum.averageTicketPriceTotal +
            (averageTicketPrice
              ? convertCurrency(averageTicketPrice, sourceCurrency, "GBP")
              : 0),
          averageTicketPriceCount:
            sum.averageTicketPriceCount + (averageTicketPrice ? 1 : 0),
          capacitySoldTotal:
            sum.capacitySoldTotal + (capacitySoldPercentage ?? 0),
          capacitySoldCount:
            sum.capacitySoldCount + (capacitySoldPercentage != null ? 1 : 0)
        };
      },
      {
        grossRevenue: 0,
        netRevenue: 0,
        ticketsSold: 0,
        guestlistCount: 0,
        refundCount: 0,
        averageTicketPriceTotal: 0,
        averageTicketPriceCount: 0,
        capacitySoldTotal: 0,
        capacitySoldCount: 0
      }
    );

    return [
      {
        label: t(locale, "Ticketing gross", "Ticketing gross"),
        value: formatCompactCurrency(totals.grossRevenue, currency, "GBP"),
        change: `${linkedShows} ${t(locale, "date(s) liée(s)", "linked show(s)")}`
      },
      {
        label: t(locale, "Ticketing net", "Ticketing net"),
        value: formatCompactCurrency(totals.netRevenue, currency, "GBP"),
        change: `${totals.refundCount} ${t(locale, "refunds", "refunds")}`
      },
      {
        label: t(locale, "Tickets vendus", "Tickets sold"),
        value: String(totals.ticketsSold),
        change: `${totals.guestlistCount} guestlist`
      },
      {
        label: t(locale, "Taux de remplissage", "Capacity sold"),
        value:
          totals.capacitySoldCount > 0
            ? `${(totals.capacitySoldTotal / totals.capacitySoldCount).toFixed(1)}%`
            : "—",
        change:
          totals.averageTicketPriceCount > 0
            ? `${t(locale, "billet moyen", "avg ticket")} ${formatCurrency(
                totals.averageTicketPriceTotal / totals.averageTicketPriceCount,
                currency,
                "GBP"
              )}`
            : t(locale, "Billet moyen indisponible", "Average ticket unavailable")
      }
    ];
  }, [currency, locale, ticketingSummaries]);

  const deadlineItems = operatingTaskLines;

  const recentActivityItems = [
    activeImportedTour
      ? t(
          locale,
          `${activeImportedTour.shows.filter((show) => show.validated).length} date(s) validée(s) sur ${activeTourName}`,
          `${activeImportedTour.shows.filter((show) => show.validated).length} validated show(s) on ${activeTourName}`
        )
      : allOperatingShows.length
        ? t(
            locale,
            `${allOperatingShows.length} date(s) visibles sur le tableau de bord`,
            `${allOperatingShows.length} visible show(s) on the dashboard`
          )
        : t(locale, "Aucune date visible pour le moment", "No visible show right now"),
    t(
      locale,
      `${inventory.lowStockCount} référence(s) merch à surveiller`,
      `${inventory.lowStockCount} merch SKU(s) to watch`
    ),
    nextShow
      ? t(
          locale,
          `Prochaine date: ${nextShow.venue} le ${nextShow.date}`,
          `Next show: ${nextShow.venue} on ${nextShow.date}`
        )
      : t(locale, "Aucune date visible", "No visible date"),
    t(
      locale,
      `Devise active du dashboard: ${displayCurrency}`,
      `Active dashboard currency: ${displayCurrency}`
    ),
    projectedShowsAtEighty
      ? t(
          locale,
          `Projection nette à 80%: ${projectedNetAtEighty >= 0 ? "+" : "-"}${formatCurrency(
            Math.abs(projectedNetAtEighty),
            displayCurrency,
            "GBP"
          )}`,
          `80% net projection: ${projectedNetAtEighty >= 0 ? "+" : "-"}${formatCurrency(
            Math.abs(projectedNetAtEighty),
            displayCurrency,
            "GBP"
          )}`
        )
      : t(
          locale,
          "Aucune projection 80% disponible tant que la jauge et le billet manquent.",
          "No 80% projection is available until capacity and ticket price are filled in."
        )
  ];

  const actionTasks = operatingTaskLines;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Tableau de bord", "Dashboard")}
        title={t(locale, "Vue d'ensemble des opérations de tournée", "Tour operations at a glance")}
        description={t(
          locale,
          "Le dashboard suit maintenant les dates visibles, les validations, les coûts de soirée et l'état du merch saisi dans l'app.",
          "The dashboard now follows visible dates, validations, nightly costs, and merch state entered in the app."
        )}
        actions={
          <>
            <Link href="/app/tours" className={buttonStyles({ variant: "secondary" })}>
              {t(locale, "Ouvrir le builder tournée", "Open tour builder")}
            </Link>
            <Link href="/app/shows" className={buttonStyles({ variant: "primary" })}>
              {t(locale, "Voir les concerts", "Review shows")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {ticketingDashboardStats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ticketingDashboardStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          {nextShow ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {t(locale, "Prochain concert", "Next show")}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-mist-50">
                    {nextShow.venue}
                  </h2>
                  <p className="mt-2 text-sm text-mist-300">
                    {nextShow.city}, {nextShow.country} • {nextShow.date}
                  </p>
                </div>
                <Badge tone={nextShow.status === "booked" ? "success" : "accent"}>
                  {translateShowStatus(locale, nextShow.status)}
                </Badge>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {nextShow.source === "imported"
                      ? t(locale, "Prix billet", "Ticket price")
                      : t(locale, "Cachet", "Fee")}
                  </p>
                  <p className="mt-2 text-lg text-mist-50">
                    {nextShow.source === "imported"
                      ? nextShow.ticketPrice !== null
                        ? formatCurrency(
                            nextShow.ticketPrice,
                            nextShow.tourCurrency,
                            "GBP"
                          )
                        : "—"
                      : nextShow.feeLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {nextShow.source === "imported"
                      ? t(locale, "Coûts de soirée", "Night costs")
                      : t(locale, "Deal", "Deal")}
                  </p>
                  <p className="mt-2 text-lg text-mist-50">
                    {nextShow.source === "imported"
                      ? formatCurrency(
                          getNightCostsTotal(nextShow),
                          nextShow.tourCurrency,
                          "GBP"
                        )
                      : nextShow.dealLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {t(locale, "Heure de set", "Set time")}
                  </p>
                  <p className="mt-2 text-lg text-mist-50">{nextShow.setTime}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {nextShow.source === "imported"
                      ? t(locale, "Validation", "Validation")
                      : t(locale, "Couchage", "Sleeping")}
                  </p>
                  <p className="mt-2 text-lg text-mist-50">
                    {nextShow.source === "imported"
                      ? nextShow.validated
                        ? t(locale, "Date validée", "Validated show")
                        : t(locale, "À compléter", "Needs setup")
                      : nextShow.sleeping}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Projection 80%", "80% projection")}
                </p>
                <p className="mt-2 text-lg text-mist-50">
                  {nextShowProjectionAtEighty
                    ? `${nextShowProjectionAtEighty.delta >= 0 ? "+" : "-"}${formatCurrency(
                        Math.abs(nextShowProjectionAtEighty.delta),
                        nextShow.tourCurrency,
                        "GBP"
                      )}`
                    : "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {nextShowProjectionAtEighty
                    ? t(
                        locale,
                        `${nextShowProjectionAtEighty.projectedAttendance} billets vendus si la salle remplit 80%, coûts déduits.`,
                        `${nextShowProjectionAtEighty.projectedAttendance} tickets sold if the room hits 80%, costs deducted.`
                      )
                    : t(
                        locale,
                        "Renseigne jauge + billet pour voir le net à 80% sur cette date.",
                        "Add capacity + ticket price to see the 80% net on this show."
                      )}
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-mist-300">
              {t(
                locale,
                "Aucun concert visible pour le moment. Importe une tournée ou garde au moins une date dans Concerts pour alimenter ce bloc.",
                "No visible shows yet. Import a tour or keep at least one show in Shows to feed this panel."
              )}
            </div>
          )}
        </Card>

        <RouteMap
          locale={locale}
          title={activeTourName}
          distanceLabel={
            activeImportedTour
              ? `${activeImportedTour.shows.length} ${t(locale, "dates suivies", "tracked dates")}`
              : activeTourStops.length
                ? `${activeTourStops.length} ${t(locale, "concerts visibles", "visible shows")}`
                : t(locale, "Aucun routing actif", "No active routing")
          }
          stops={activeTourStops}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-coral-300" />
            <h3 className="text-lg font-medium text-mist-50">
              {t(locale, "Tournée active", "Active tour")}
            </h3>
          </div>
          <p className="mt-4 text-2xl font-semibold text-mist-50">{activeTourName}</p>
          <p className="mt-2 text-sm text-mist-300">
            {activeImportedTour
              ? t(
                  locale,
                  `${activeImportedTour.shows.length} dates pilotées depuis Concerts et Tournée.`,
                  `${activeImportedTour.shows.length} dates managed from Shows and Tours.`
                )
              : allOperatingShows.length
                ? t(
                    locale,
                    `${allOperatingShows.length} date(s) visibles suivent maintenant tes suppressions, validations et imports.`,
                    `${allOperatingShows.length} visible show(s) now follow your deletions, validations, and imports.`
                  )
                : t(
                    locale,
                    "Aucune tournée ou date visible pour le moment.",
                    "No active tour or visible show right now."
                  )}
          </p>
          {activeImportedTour?.assignedVehicle ? (
            <p className="mt-2 text-sm text-mist-300">
              {activeImportedTour.assignedVehicle.name} • {activeImportedTour.transportDays}{" "}
              {t(locale, "jour(s)", "day(s)")} •{" "}
              {formatCurrency(activeImportedTour.transportCost, displayCurrency, "GBP")}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Devise", "Currency")}
              </p>
              <p className="mt-2 text-mist-50">
                {displayCurrency}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Dates confirmées", "Booked dates")}
              </p>
              <p className="mt-2 text-mist-50">
                {`${bookedShowsCount}/${allOperatingShows.length}`}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-coral-300" />
            <h3 className="text-lg font-medium text-mist-50">
              {t(locale, "Échéances à venir", "Upcoming deadlines")}
            </h3>
          </div>
          <div className="mt-5 space-y-3">
            {deadlineItems.length ? (
              deadlineItems.slice(0, 4).map((deadline) => (
                <div
                  key={deadline.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-100"
                >
                  {deadline.title}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-mist-300">
                {t(
                  locale,
                  "Aucune échéance immédiate. Les validations, prix billet et coûts salle sont à jour.",
                  "No immediate deadlines. Validations, ticket prices, and room costs are up to date."
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-coral-300" />
            <h3 className="text-lg font-medium text-mist-50">
              {t(locale, "État des documents de voyage", "Border checklist status")}
            </h3>
          </div>
          <p className="mt-4 text-sm text-mist-300">
            {allOperatingShows.length
              ? t(
                  locale,
                  "L'indicateur monte avec les validations, les statuts confirmés, les prix billet et les coûts salle réellement saisis.",
                  "This indicator improves with real validations, booked statuses, ticket prices, and room costs entered in the app."
                )
              : t(
                  locale,
                  "Aucune date visible: l'état voyage repart à zéro tant qu'aucune tournée ou concert n'alimente le dashboard.",
                  "No visible shows: travel readiness stays at zero until a tour or show feeds the dashboard."
                )}
          </p>
          <ProgressBar value={borderReadiness} className="mt-5" />
          <p className="mt-3 text-sm text-mist-200">
            {borderReadiness}% {t(locale, "prêt", "ready")}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h3 className="text-lg font-medium text-mist-50">
            {t(locale, "Activité récente", "Recent activity")}
          </h3>
          <div className="mt-5 space-y-3">
            {recentActivityItems.map((activity) => (
              <div
                key={activity}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-100"
              >
                {activity}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-mist-50">
            {t(locale, "Actions à traiter", "Actions to handle")}
          </h3>
          <div className="mt-5 space-y-3">
            {actionTasks.length ? (
              actionTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-medium text-mist-50">{task.title}</p>
                    <p className="mt-1 text-sm text-mist-300">
                      {task.assignee} • {t(locale, "échéance", "due")} {task.deadline}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="accent">
                      {translateTaskPriority(locale, task.priority)}
                    </Badge>
                    <Badge>{translateTaskStatus(locale, task.status)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-mist-300">
                {t(
                  locale,
                  "Rien de bloquant pour l'instant. Les actions réapparaîtront dès qu'une date demandera une validation ou un coût manquant.",
                  "Nothing is blocking right now. Actions will reappear as soon as a show needs validation or missing costs."
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
