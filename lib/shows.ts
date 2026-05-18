import type { Show } from "@/lib/mock-data";

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
