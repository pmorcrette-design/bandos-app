import assert from "node:assert/strict";
import test from "node:test";

import {
  findClosestForecastHourIndex,
  getCalendarDayDifference,
  getIsoDateInTimeZone,
  normalizeOpenMeteoDate,
  normalizeOpenMeteoTime
} from "../lib/open-meteo";

test("normalizes supported show date and time formats", () => {
  assert.equal(normalizeOpenMeteoDate("2026-07-21"), "2026-07-21");
  assert.equal(normalizeOpenMeteoDate("21/07/2026"), "2026-07-21");
  assert.equal(normalizeOpenMeteoDate("31/02/2026"), null);
  assert.equal(normalizeOpenMeteoTime("9:30"), "09:30");
  assert.equal(normalizeOpenMeteoTime("25:00"), null);
});

test("computes the venue-local forecast window", () => {
  assert.equal(
    getIsoDateInTimeZone(new Date("2026-07-21T22:30:00Z"), "Europe/Paris"),
    "2026-07-22"
  );
  assert.equal(getCalendarDayDifference("2026-07-21", "2026-08-05"), 15);
  assert.equal(getCalendarDayDifference("2026-07-21", "2026-08-06"), 16);
});

test("selects the hourly forecast closest to show time", () => {
  const hours = [
    "2026-07-21T18:00",
    "2026-07-21T19:00",
    "2026-07-21T20:00",
    "2026-07-22T00:00"
  ];

  assert.equal(findClosestForecastHourIndex(hours, "2026-07-21", "19:35"), 2);
  assert.equal(findClosestForecastHourIndex(hours, "2026-07-23", "19:00"), -1);
});
