"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  t,
  translateShowStatus,
  type Locale
} from "@/lib/i18n";
import { shows } from "@/lib/mock-data";
import {
  getAttendanceProjectionMetrics,
  getImportedShowNightCosts,
  getTourCalendarDayCount
} from "@/lib/shows";
import type { TicketSalesSnapshot, TicketingEvent } from "@/lib/ticketing/types";
import {
  convertCurrency,
  formatCurrency,
  normalizeCurrency,
  type SupportedCurrency
} from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";
import type { ImportedShowFolder } from "@/lib/workspace-data";

type FinanceViewProps = {
  currency: SupportedCurrency;
  locale: Locale;
  showDemoData: boolean;
};

type TicketingSummaryItem = {
  showId: string;
  event: TicketingEvent;
  snapshot: TicketSalesSnapshot | null;
};

type FinanceDateRow = {
  id: string;
  source: "tour" | "single";
  href: string;
  groupKey: string | null;
  date: string;
  venue: string;
  city: string;
  country: string;
  statusLabel: string;
  statusTone: "neutral" | "accent" | "success" | "warning";
  currency: SupportedCurrency;
  fixedCosts: number;
  linkedTicketing: boolean;
  manualFee: number | null;
  grossRevenue: number;
  netRevenue: number;
  fees: number;
  ticketsSold: number;
  capacitySoldPercentage: number | null;
  averageTicketPrice: number | null;
  refundCount: number;
  guestlistCount: number;
  notes: string;
};

function parseFinanceDateValue(value: string) {
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

function compareFinanceDates(left: string, right: string) {
  const leftTimestamp = parseFinanceDateValue(left);
  const rightTimestamp = parseFinanceDateValue(right);

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

function getStatusTone(status: ImportedShowFolder["status"]) {
  if (status === "booked") {
    return "success" as const;
  }

  if (status === "cancelled") {
    return "warning" as const;
  }

  return "accent" as const;
}

function buildFinanceCsv(rows: FinanceDateRow[]) {
  const escapeCell = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  return [
    [
      "group",
      "date",
      "venue",
      "city",
      "status",
      "gross_revenue",
      "net_revenue",
      "fees",
      "tickets_sold",
      "capacity_sold_percentage",
      "fixed_costs"
    ]
      .map(escapeCell)
      .join(","),
    ...rows.map((row) =>
      [
        row.groupKey ?? "date unique",
        row.date,
        row.venue,
        row.city,
        row.statusLabel,
        row.grossRevenue,
        row.netRevenue,
        row.fees,
        row.ticketsSold,
        row.capacitySoldPercentage ?? "",
        row.fixedCosts
      ]
        .map(escapeCell)
        .join(",")
    )
  ].join("\n");
}

function getSummaryMetrics(
  summary: TicketingSummaryItem | undefined,
  capacity: number | null,
  ticketPrice: number | null,
  fixedCosts: number,
  showFee: number | null
) {
  if (summary) {
    const sourceCurrency = normalizeCurrency(summary.event.currency);
    const snapshot = summary.snapshot;
    const capacitySoldPercentage =
      snapshot?.capacitySoldPercentage ??
      (summary.event.capacity && summary.event.capacity > 0
        ? (summary.event.ticketsSold / summary.event.capacity) * 100
        : null);

    return {
      linkedTicketing: true,
      sourceCurrency,
      manualFee: null,
      grossRevenue: snapshot?.grossRevenue ?? summary.event.grossRevenue,
      netRevenue: snapshot?.netRevenue ?? summary.event.netRevenue,
      fees: snapshot?.fees ?? summary.event.fees,
      ticketsSold: snapshot?.ticketsSold ?? summary.event.ticketsSold,
      capacitySoldPercentage,
      averageTicketPrice:
        snapshot?.averageTicketPrice ?? summary.event.averageTicketPrice,
      refundCount: snapshot?.refundCount ?? summary.event.refundCount,
      guestlistCount: snapshot?.guestlistCount ?? summary.event.guestlistCount
    };
  }

  if (typeof showFee === "number") {
    return {
      linkedTicketing: false,
      sourceCurrency: "GBP" as const,
      manualFee: showFee,
      grossRevenue: showFee,
      netRevenue: showFee - fixedCosts,
      fees: 0,
      ticketsSold: 0,
      capacitySoldPercentage: null,
      averageTicketPrice: null,
      refundCount: 0,
      guestlistCount: 0
    };
  }

  const projection = getAttendanceProjectionMetrics({
    capacity,
    ticketPrice,
    fixedCosts
  });

  return {
    linkedTicketing: false,
    sourceCurrency: "GBP" as const,
    manualFee: null,
    grossRevenue: 0,
    netRevenue: 0,
    fees: 0,
    ticketsSold: 0,
    capacitySoldPercentage:
      projection && capacity && capacity > 0
        ? (projection.projectedAttendance / capacity) * 100
        : null,
    averageTicketPrice: ticketPrice,
    refundCount: 0,
    guestlistCount: 0
  };
}

function FinanceRow({
  row,
  displayCurrency,
  locale
}: {
  row: FinanceDateRow;
  displayCurrency: SupportedCurrency;
  locale: Locale;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={row.href} className="text-base font-medium text-mist-50 hover:text-coral-200">
              {row.venue}
            </Link>
            <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
            {!row.linkedTicketing ? (
              <Badge>{t(locale, "ticketing non lié", "ticketing not linked")}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-mist-300">
            {row.date} • {[row.city, row.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <Link
          href={row.href}
          className="inline-flex items-center gap-2 text-sm text-mist-200 hover:text-coral-200"
        >
          {t(locale, "Ouvrir", "Open")}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
            {t(locale, "Gross", "Gross")}
          </p>
          <p className="mt-2 text-sm font-medium text-mist-50">
            {row.linkedTicketing || row.manualFee !== null
              ? formatCurrency(row.grossRevenue, displayCurrency, row.currency)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
            {t(locale, "Net", "Net")}
          </p>
          <p className="mt-2 text-sm font-medium text-mist-50">
            {row.linkedTicketing || row.manualFee !== null
              ? formatCurrency(row.netRevenue, displayCurrency, row.currency)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
            {t(locale, "Tickets", "Tickets")}
          </p>
          <p className="mt-2 text-sm font-medium text-mist-50">{row.ticketsSold}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
            {t(locale, "Frais fixes", "Fixed costs")}
          </p>
          <p className="mt-2 text-sm font-medium text-mist-50">
            {formatCurrency(row.fixedCosts, displayCurrency, "GBP")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
            {t(locale, "Billet moyen", "Avg ticket")}
          </p>
          <p className="mt-2 text-sm font-medium text-mist-50">
            {row.averageTicketPrice != null
              ? formatCurrency(row.averageTicketPrice, displayCurrency, row.currency)
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-mist-300">
          <span>{t(locale, "Niveau de billetterie", "Ticketing level")}</span>
          <span>
            {row.capacitySoldPercentage != null
              ? `${row.capacitySoldPercentage.toFixed(1)}%`
              : "—"}
          </span>
        </div>
        <ProgressBar value={row.capacitySoldPercentage ?? 0} />
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-mist-300">
          {row.manualFee !== null ? (
            <span>{t(locale, "cachet manuel", "manual show fee")}</span>
          ) : null}
          <span>
            {row.refundCount} {t(locale, "refunds", "refunds")}
          </span>
          <span>
            {row.guestlistCount} {t(locale, "guestlist", "guestlist")}
          </span>
          <span>
            {formatCurrency(row.fees, displayCurrency, row.currency)} {t(locale, "fees", "fees")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FinanceView({
  currency,
  locale,
  showDemoData
}: FinanceViewProps) {
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const hiddenStandaloneShowIds = useBandosUIStore(
    (state) => state.hiddenStandaloneShowIds
  );
  const vehicleCatalog = useBandosUIStore((state) => state.vehicleCatalog);
  const tourVehicleAssignments = useBandosUIStore((state) => state.tourVehicleAssignments);
  const [ticketingSummaries, setTicketingSummaries] = useState<TicketingSummaryItem[]>([]);
  const [ticketingError, setTicketingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTicketingSummary() {
      try {
        const response = await fetch("/api/ticketing/summary", {
          method: "GET",
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => null)) as
          | { summaries?: TicketingSummaryItem[]; error?: string }
          | null;

        if (!response.ok || !payload?.summaries) {
          throw new Error(payload?.error || "Unable to load ticketing summary.");
        }

        if (!cancelled) {
          setTicketingSummaries(payload.summaries);
          setTicketingError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setTicketingError(
            error instanceof Error ? error.message : "Unable to load ticketing summary."
          );
        }
      }
    }

    void loadTicketingSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryByShowId = useMemo(
    () =>
      new Map(
        ticketingSummaries.map((summary) => [summary.showId, summary] as const)
      ),
    [ticketingSummaries]
  );
  const vehicleById = useMemo(
    () => new Map(vehicleCatalog.map((vehicle) => [vehicle.id, vehicle])),
    [vehicleCatalog]
  );
  const assignmentByTour = useMemo(
    () => new Map(tourVehicleAssignments.map((assignment) => [assignment.tourName, assignment])),
    [tourVehicleAssignments]
  );

  const tourRows = useMemo(() => {
    const rows = importedShowFolders.map((folder) => {
      const metrics = getSummaryMetrics(
        summaryByShowId.get(folder.id),
        folder.capacity,
        folder.ticketPrice,
        getImportedShowNightCosts(folder),
        folder.showFee
      );

      return {
        id: folder.id,
        source: folder.isStandalone ? ("single" as const) : ("tour" as const),
        href: `/app/shows/date/${encodeURIComponent(folder.id)}`,
        groupKey: folder.isStandalone ? null : folder.tourName,
        date: folder.date,
        venue: folder.venue,
        city: folder.city,
        country: folder.country,
        statusLabel: translateShowStatus(locale, folder.status),
        statusTone: getStatusTone(folder.status),
        currency: metrics.sourceCurrency as SupportedCurrency,
        fixedCosts: getImportedShowNightCosts(folder),
        linkedTicketing: metrics.linkedTicketing,
        manualFee: metrics.manualFee,
        grossRevenue: metrics.grossRevenue,
        netRevenue: metrics.netRevenue,
        fees: metrics.fees,
        ticketsSold: metrics.ticketsSold,
        capacitySoldPercentage: metrics.capacitySoldPercentage,
        averageTicketPrice: metrics.averageTicketPrice,
        refundCount: metrics.refundCount,
        guestlistCount: metrics.guestlistCount,
        notes: folder.notes
      };
    });

    return Array.from(
      rows.reduce((groups, row) => {
        if (row.groupKey === null) {
          return groups;
        }

        const group = groups.get(row.groupKey) ?? [];
        group.push(row);
        groups.set(row.groupKey, group);
        return groups;
      }, new Map<string | null, FinanceDateRow[]>())
    )
      .map(([tourName, rowsForTour]) => ({
        tourName: tourName ?? "Imported tour",
        rows: rowsForTour.sort((left, right) => compareFinanceDates(left.date, right.date)),
        assignedVehicle:
          (tourName ? vehicleById.get(assignmentByTour.get(tourName)?.vehicleId ?? "") : null) ??
          null,
        transportDays: getTourCalendarDayCount(rowsForTour.map((row) => ({ date: row.date }))),
        transportCost: 0
      }))
      .map((group) => ({
        ...group,
        transportCost: group.assignedVehicle
          ? group.assignedVehicle.estimatedDailyPrice * group.transportDays
          : 0
      }))
      .sort((left, right) => {
        const leftDate = left.rows[0]?.date ?? "";
        const rightDate = right.rows[0]?.date ?? "";
        return compareFinanceDates(leftDate, rightDate);
      });
  }, [assignmentByTour, importedShowFolders, locale, summaryByShowId, vehicleById]);

  const singleDateRows = useMemo<FinanceDateRow[]>(() => {
    const workspaceSingleDates = importedShowFolders
      .filter((folder) => folder.isStandalone)
      .map((folder) => {
        const metrics = getSummaryMetrics(
          summaryByShowId.get(folder.id),
          folder.capacity,
          folder.ticketPrice,
          getImportedShowNightCosts(folder),
          folder.showFee
        );

        return {
          id: folder.id,
          source: "single" as const,
          href: `/app/shows/date/${encodeURIComponent(folder.id)}`,
          groupKey: null,
          date: folder.date,
          venue: folder.venue,
          city: folder.city,
          country: folder.country,
          statusLabel: translateShowStatus(locale, folder.status),
          statusTone: getStatusTone(folder.status),
          currency: metrics.sourceCurrency as SupportedCurrency,
          fixedCosts: getImportedShowNightCosts(folder),
          linkedTicketing: metrics.linkedTicketing,
          manualFee: metrics.manualFee,
          grossRevenue: metrics.grossRevenue,
          netRevenue: metrics.netRevenue,
          fees: metrics.fees,
          ticketsSold: metrics.ticketsSold,
          capacitySoldPercentage: metrics.capacitySoldPercentage,
          averageTicketPrice: metrics.averageTicketPrice,
          refundCount: metrics.refundCount,
          guestlistCount: metrics.guestlistCount,
          notes: folder.notes
        };
      });

    const demoSingleDates = showDemoData
      ? shows
          .filter((show) => !hiddenStandaloneShowIds.includes(show.id))
          .map((show) => {
            const projection = getAttendanceProjectionMetrics({
              capacity: show.capacity,
              ticketPrice: show.ticketPrice,
              fixedCosts: show.roomHire,
              occupancyRate: show.projectedAttendance / show.capacity
            });

            return {
              id: show.id,
              source: "single" as const,
              href: `/app/shows/${show.id}`,
              groupKey: null,
              date: show.date,
              venue: show.venue,
              city: show.city,
              country: show.country,
              statusLabel: translateShowStatus(locale, show.status),
              statusTone:
                show.status === "booked"
                  ? ("success" as const)
                  : show.status === "cancelled"
                    ? ("warning" as const)
                    : ("accent" as const),
              currency: "GBP" as const,
              fixedCosts: show.roomHire,
              linkedTicketing: false,
              manualFee: null,
              grossRevenue: 0,
              netRevenue: 0,
              fees: 0,
              ticketsSold: show.projectedAttendance,
              capacitySoldPercentage:
                show.capacity > 0
                  ? (show.projectedAttendance / show.capacity) * 100
                  : null,
              averageTicketPrice: show.ticketPrice,
              refundCount: 0,
              guestlistCount: 0,
              notes: show.notes
            };
          })
      : [];

    return [...workspaceSingleDates, ...demoSingleDates].sort((left, right) =>
      compareFinanceDates(left.date, right.date)
    );
  }, [
    hiddenStandaloneShowIds,
    importedShowFolders,
    locale,
    showDemoData,
    summaryByShowId
  ]);

  const allRows = useMemo(
    () => [...tourRows.flatMap((entry) => entry.rows), ...singleDateRows],
    [singleDateRows, tourRows]
  );
  const totalTransportCosts = useMemo(
    () => tourRows.reduce((sum, group) => sum + group.transportCost, 0),
    [tourRows]
  );

  const grossRevenue = allRows.reduce(
    (sum, row) =>
      sum + convertCurrency(row.grossRevenue, row.currency as SupportedCurrency, "GBP"),
    0
  );
  const netRevenue = allRows.reduce(
    (sum, row) =>
      sum + convertCurrency(row.netRevenue, row.currency as SupportedCurrency, "GBP"),
    0
  ) - totalTransportCosts;
  const fixedCosts =
    allRows.reduce((sum, row) => sum + row.fixedCosts, 0) + totalTransportCosts;
  const ticketsSold = allRows.reduce((sum, row) => sum + row.ticketsSold, 0);
  const linkedDatesCount = allRows.filter((row) => row.linkedTicketing).length;
  const averageCapacitySoldPercentage =
    allRows.filter((row) => row.capacitySoldPercentage != null).length > 0
      ? allRows
          .filter((row) => row.capacitySoldPercentage != null)
          .reduce((sum, row) => sum + (row.capacitySoldPercentage ?? 0), 0) /
        allRows.filter((row) => row.capacitySoldPercentage != null).length
      : null;

  if (!tourRows.length && !singleDateRows.length) {
    return (
      <EmptyState
        title={t(locale, "Aucune date dans Finance", "No show in Finance yet")}
        body={t(
          locale,
          "Importe une tournée ou crée une date pour suivre ici la billetterie, les revenus nets et les coûts fixes.",
          "Import a tour or create a show to track ticketing, net revenue, and fixed costs here."
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Gross revenue", "Gross revenue")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(grossRevenue, currency, "GBP")}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Net revenue", "Net revenue")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(netRevenue, currency, "GBP")}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Fixed costs", "Fixed costs")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(fixedCosts, currency, "GBP")}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Tickets sold", "Tickets sold")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">{ticketsSold}</p>
          <p className="mt-1 text-sm text-mist-300">
            {linkedDatesCount} {t(locale, "date(s) reliée(s)", "linked show(s)")}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Avg capacity sold", "Avg capacity sold")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {averageCapacitySoldPercentage != null
              ? `${averageCapacitySoldPercentage.toFixed(1)}%`
              : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Vue finance par tournée", "Finance view by tour")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Toutes les dates sont regroupées par dossier tournée. Les dates sans dossier sont listées plus bas dans Dates uniques.",
                "All show dates are grouped by tour folder. Dates without a tour folder are listed below in Single dates."
              )}
            </p>
            {ticketingError ? (
              <p className="mt-3 text-sm text-amber-300">{ticketingError}</p>
            ) : null}
          </div>
          <a
            download="bandos-finance-ticketing-export.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(
              buildFinanceCsv(allRows)
            )}`}
          >
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              {t(locale, "Exporter CSV", "Export CSV")}
            </Button>
          </a>
        </div>
      </Card>

      <div className="space-y-4">
        {tourRows.map((group) => {
          const groupGross = group.rows.reduce(
            (sum, row) =>
              sum +
              convertCurrency(row.grossRevenue, row.currency as SupportedCurrency, "GBP"),
            0
          );
          const groupNet = group.rows.reduce(
            (sum, row) =>
              sum +
              convertCurrency(row.netRevenue, row.currency as SupportedCurrency, "GBP"),
            0
          ) - group.transportCost;
          const groupFixedCosts =
            group.rows.reduce((sum, row) => sum + row.fixedCosts, 0) + group.transportCost;
          const groupSold = group.rows.reduce((sum, row) => sum + row.ticketsSold, 0);

          return (
            <Card key={group.tourName}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-medium text-mist-50">{group.tourName}</p>
                  <p className="mt-2 text-sm text-mist-300">
                    {group.rows.length} {t(locale, "date(s)", "show(s)")}
                  </p>
                  {group.assignedVehicle ? (
                    <p className="mt-1 text-sm text-mist-300">
                      {group.assignedVehicle.name} • {group.transportDays}{" "}
                      {t(locale, "jour(s)", "day(s)")} •{" "}
                      {formatCurrency(group.transportCost, currency, "GBP")}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-mist-300">Gross</p>
                    <p className="mt-2 text-sm font-medium text-mist-50">
                      {formatCurrency(groupGross, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-mist-300">Net</p>
                    <p className="mt-2 text-sm font-medium text-mist-50">
                      {formatCurrency(groupNet, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Coûts fixes", "Fixed costs")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-mist-50">
                      {formatCurrency(groupFixedCosts, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Tickets", "Tickets")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-mist-50">{groupSold}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {group.rows.map((row) => (
                  <FinanceRow
                    key={row.id}
                    row={row}
                    displayCurrency={currency}
                    locale={locale}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Dates uniques", "Single dates")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Les dates qui ne vivent pas dans un dossier tournée restent suivies ici individuellement.",
                "Dates that do not belong to a tour folder stay tracked here individually."
              )}
            </p>
          </div>
          <Badge>{singleDateRows.length}</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {singleDateRows.length ? (
            singleDateRows.map((row) => (
              <FinanceRow
                key={row.id}
                row={row}
                displayCurrency={currency}
                locale={locale}
              />
            ))
          ) : (
            <EmptyState
              title={t(locale, "Aucune date unique", "No single date")}
              body={t(
                locale,
                "Toutes les dates actives sont actuellement rangées dans des dossiers tournée.",
                "All active dates are currently filed inside tour folders."
              )}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
