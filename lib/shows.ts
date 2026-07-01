import type { Show } from "@/lib/mock-data";
import type {
  ShowGearChecklistItem,
  ShowSetlistEntry,
  ImportedShowFolder,
  ShowGuestlistEntry,
  ShowRunningOrderEntry
} from "@/lib/workspace-data";
import type { TicketSalesSnapshot } from "@/lib/ticketing/types";

type AttendanceProjectionInput = {
  capacity: number | null;
  ticketPrice: number | null;
  fixedCosts: number;
  occupancyRate?: number;
};

export function getAttendanceProjectionMetrics({
  capacity,
  ticketPrice,
  fixedCosts,
  occupancyRate = 0.8
}: AttendanceProjectionInput) {
  if (!capacity || capacity <= 0 || !ticketPrice || ticketPrice <= 0) {
    return null;
  }

  const normalizedOccupancyRate = Math.min(Math.max(occupancyRate, 0), 1);
  const projectedAttendance = Math.floor(capacity * normalizedOccupancyRate);
  const totalCosts = Math.max(fixedCosts, 0);
  const grossPotential = capacity * ticketPrice;
  const projectedGross = projectedAttendance * ticketPrice;
  const delta = projectedGross - totalCosts;
  const breakEvenTickets =
    totalCosts > 0 ? Math.ceil(totalCosts / ticketPrice) : 0;

  return {
    breakEvenTickets,
    grossPotential,
    projectedAttendance,
    projectedGross,
    totalCosts,
    delta,
    occupancyRate: normalizedOccupancyRate,
    isProfitable: delta >= 0
  };
}

export function getShowBreakEvenMetrics(show: Show) {
  const occupancyRate = show.capacity
    ? show.projectedAttendance / show.capacity
    : 0;
  const projection = getAttendanceProjectionMetrics({
    capacity: show.capacity,
    ticketPrice: show.ticketPrice,
    fixedCosts: show.roomHire,
    occupancyRate
  });

  if (!projection) {
    return {
      breakEvenTickets: 0,
      grossPotential: 0,
      projectedGross: 0,
      delta: -show.roomHire,
      occupancyRate: 0,
      isAtBreakEven: false
    };
  }

  return {
    breakEvenTickets: projection.breakEvenTickets,
    grossPotential: projection.grossPotential,
    projectedGross: projection.projectedGross,
    delta: projection.delta,
    occupancyRate: projection.occupancyRate,
    isAtBreakEven: projection.delta >= 0
  };
}

function parseClockMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function getImportedShowNightCosts(
  folder: Pick<
    ImportedShowFolder,
    "roomHire" | "soundEngineerCost" | "localSupportActs"
  >
) {
  return (
    (folder.roomHire ?? 0) +
    (folder.soundEngineerCost ?? 0) +
    folder.localSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0)
  );
}

function parseImportedShowDate(value: string) {
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

export function getTourCalendarDayCount(
  folders: Array<Pick<ImportedShowFolder, "date">>
) {
  const timestamps = folders
    .map((folder) => parseImportedShowDate(folder.date))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  if (!timestamps.length) {
    return 0;
  }

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const days = Math.floor((last - first) / 86_400_000) + 1;

  return Math.max(days, 1);
}

export function getImportedShowManualFeeNet(
  folder: Pick<ImportedShowFolder, "showFee" | "roomHire" | "soundEngineerCost" | "localSupportActs">
) {
  if (typeof folder.showFee !== "number") {
    return null;
  }

  return folder.showFee - getImportedShowNightCosts(folder);
}

export function getRunningOrderConflicts(entries: ShowRunningOrderEntry[]) {
  const conflicts = new Set<string>();
  const normalized = entries
    .map((entry, index) => ({
      id: entry.id,
      index,
      start: parseClockMinutes(entry.startTime),
      end: parseClockMinutes(entry.endTime)
    }))
    .filter(
      (entry): entry is { id: string; index: number; start: number; end: number } =>
        entry.start !== null && entry.end !== null && entry.end > entry.start
    )
    .sort((left, right) => left.start - right.start);

  for (let index = 0; index < normalized.length - 1; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];

    if (current.end > next.start) {
      conflicts.add(current.id);
      conflicts.add(next.id);
    }
  }

  return conflicts;
}

export function getGuestlistUsage(
  entries: ShowGuestlistEntry[],
  capacity: number | null
) {
  const usedSpots = entries.reduce((sum, entry) => sum + Math.max(entry.spots, 0), 0);
  const remainingSpots =
    typeof capacity === "number" ? Math.max(capacity - usedSpots, 0) : null;
  const overCapacity =
    typeof capacity === "number" ? usedSpots > capacity : false;

  return {
    usedSpots,
    remainingSpots,
    overCapacity
  };
}

export function getTicketingSnapshotMetrics(
  snapshot: TicketSalesSnapshot | null,
  show: Pick<ImportedShowFolder, "capacity" | "ticketPrice">
) {
  if (snapshot) {
    return {
      grossRevenue: snapshot.grossRevenue,
      netRevenue: snapshot.netRevenue,
      fees: snapshot.fees,
      ticketsSold: snapshot.ticketsSold,
      remainingCapacity: snapshot.remainingCapacity,
      capacitySoldPercentage: snapshot.capacitySoldPercentage,
      averageTicketPrice: snapshot.averageTicketPrice,
      guestlistCount: snapshot.guestlistCount,
      refundCount: snapshot.refundCount
    };
  }

  const projection = getAttendanceProjectionMetrics({
    capacity: show.capacity,
    ticketPrice: show.ticketPrice,
    fixedCosts: 0
  });

  return {
    grossRevenue: 0,
    netRevenue: 0,
    fees: 0,
    ticketsSold: 0,
    remainingCapacity: show.capacity,
    capacitySoldPercentage: 0,
    averageTicketPrice: show.ticketPrice,
    guestlistCount: 0,
    refundCount: 0,
    projectedGrossPotential: projection?.grossPotential ?? 0
  };
}

export function getSetlistTotalDuration(entries: ShowSetlistEntry[]) {
  return entries.reduce(
    (sum, entry) => sum + (typeof entry.durationMinutes === "number" ? entry.durationMinutes : 0),
    0
  );
}

export function getGearChecklistSummary(items: ShowGearChecklistItem[]) {
  return items.reduce(
    (summary, item) => {
      summary.total += item.quantity;

      switch (item.status) {
        case "loaded":
          summary.loaded += item.quantity;
          break;
        case "missing":
          summary.missing += item.quantity;
          break;
        case "damaged":
          summary.damaged += item.quantity;
          break;
        default:
          summary.pending += item.quantity;
          break;
      }

      return summary;
    },
    {
      total: 0,
      loaded: 0,
      missing: 0,
      damaged: 0,
      pending: 0
    }
  );
}
