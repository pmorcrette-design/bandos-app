import assert from "node:assert/strict";
import test from "node:test";

import { buildAutomaticRunningOrder } from "../lib/shows";

test("builds soundchecks in reverse stage order and live sets in stage order", () => {
  const entries = buildAutomaticRunningOrder({
    getInTime: "14:00",
    eventStartTime: "19:00",
    headlinerName: "Headliner",
    headlinerSetDurationMinutes: 75,
    localActs: [
      {
        id: "support",
        name: "Support",
        role: "support",
        setDurationMinutes: 45
      },
      {
        id: "opener",
        name: "Opener",
        role: "opener",
        setDurationMinutes: 30
      }
    ]
  });

  assert.deepEqual(
    entries.map((entry) => [
      entry.type,
      entry.artistName,
      entry.startTime,
      entry.endTime
    ]),
    [
      ["load-in", "Get in", "14:00", "15:00"],
      ["soundcheck", "Headliner", "15:00", "16:00"],
      ["changeover", "Changeover", "16:00", "16:15"],
      ["soundcheck", "Support", "16:15", "17:15"],
      ["changeover", "Changeover", "17:15", "17:30"],
      ["soundcheck", "Opener", "17:30", "18:30"],
      ["doors", "Event start", "19:00", ""],
      ["opener", "Opener", "19:30", "20:00"],
      ["changeover", "Changeover", "20:00", "20:15"],
      ["support", "Support", "20:15", "21:00"],
      ["changeover", "Changeover", "21:00", "21:15"],
      ["headliner", "Headliner", "21:15", "22:30"]
    ]
  );
});

test("rejects a lineup when a band set duration is missing", () => {
  assert.throws(
    () =>
      buildAutomaticRunningOrder({
        getInTime: "14:00",
        eventStartTime: "19:00",
        headlinerName: "Headliner",
        headlinerSetDurationMinutes: 60,
        localActs: [
          {
            id: "opener",
            name: "Opener",
            role: "opener",
            setDurationMinutes: null
          }
        ]
      }),
    /missing-act-duration:Opener/
  );
});

test("wraps generated times after midnight", () => {
  const entries = buildAutomaticRunningOrder({
    getInTime: "18:00",
    eventStartTime: "23:00",
    headlinerName: "Headliner",
    headlinerSetDurationMinutes: 90,
    localActs: [
      {
        id: "opener",
        name: "Opener",
        role: "opener",
        setDurationMinutes: 30
      }
    ]
  });
  const headliner = entries.find((entry) => entry.type === "headliner");

  assert.equal(headliner?.startTime, "00:15");
  assert.equal(headliner?.endTime, "01:45");
  assert.equal(headliner?.durationMinutes, 90);
});
