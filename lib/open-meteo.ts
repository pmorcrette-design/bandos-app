const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})/;
const dayFirstDatePattern = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/;
const clockPattern = /^(\d{1,2}):(\d{2})$/;

function buildValidIsoDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

export function normalizeOpenMeteoDate(value?: string | null) {
  const normalized = value?.trim() ?? "";
  const isoMatch = isoDatePattern.exec(normalized);

  if (isoMatch) {
    return buildValidIsoDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  const dayFirstMatch = dayFirstDatePattern.exec(normalized);

  if (!dayFirstMatch) {
    return null;
  }

  return buildValidIsoDate(
    Number(dayFirstMatch[3]),
    Number(dayFirstMatch[2]),
    Number(dayFirstMatch[1])
  );
}

export function normalizeOpenMeteoTime(value?: string | null) {
  const match = clockPattern.exec(value?.trim() ?? "");

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getIsoDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getCalendarDayDifference(fromIsoDate: string, toIsoDate: string) {
  const from = normalizeOpenMeteoDate(fromIsoDate);
  const to = normalizeOpenMeteoDate(toIsoDate);

  if (!from || !to) {
    return null;
  }

  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000
  );
}

export function findClosestForecastHourIndex(
  hourlyTimes: string[],
  targetDate: string,
  targetTime: string
) {
  const normalizedTime = normalizeOpenMeteoTime(targetTime) ?? "18:00";
  const [targetHour, targetMinute] = normalizedTime.split(":").map(Number);
  const targetTotal = targetHour * 60 + targetMinute;
  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  hourlyTimes.forEach((time, index) => {
    if (!time.startsWith(`${targetDate}T`)) {
      return;
    }

    const timeMatch = /T(\d{2}):(\d{2})/.exec(time);

    if (!timeMatch) {
      return;
    }

    const total = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
    const distance = Math.abs(total - targetTotal);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}
