import { LoathingDate } from "kol.js";
import { describe, expect, it } from "vitest";

import { getTowerOpenGamedays } from "./towerOpen.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const rollover = (gameday: number) =>
  new Date(LoathingDate.EPOCH.getTime() + gameday * DAY_MS);

describe("getTowerOpenGamedays", () => {
  it("spans from the day added up to the day before removal", () => {
    const days = getTowerOpenGamedays(
      [{ addedToStore: rollover(100), removedFromStore: rollover(103) }],
      90,
      110,
      200,
    );
    expect(days).toEqual([100, 101, 102]);
  });

  it("caps an open-ended span at today", () => {
    const days = getTowerOpenGamedays(
      [{ addedToStore: rollover(100), removedFromStore: null }],
      90,
      110,
      105,
    );
    expect(days).toEqual([100, 101, 102, 103, 104, 105]);
  });

  it("clamps to the requested range", () => {
    const days = getTowerOpenGamedays(
      [{ addedToStore: rollover(100), removedFromStore: rollover(120) }],
      105,
      107,
      200,
    );
    expect(days).toEqual([105, 106, 107]);
  });

  it("returns nothing for a same-day add and remove", () => {
    const days = getTowerOpenGamedays(
      [{ addedToStore: rollover(100), removedFromStore: rollover(100) }],
      90,
      110,
      200,
    );
    expect(days).toEqual([]);
  });

  it("skips rows that were never added to the store", () => {
    const days = getTowerOpenGamedays(
      [{ addedToStore: null, removedFromStore: null }],
      90,
      110,
      200,
    );
    expect(days).toEqual([]);
  });

  it("merges and dedupes overlapping spans", () => {
    const days = getTowerOpenGamedays(
      [
        { addedToStore: rollover(100), removedFromStore: rollover(103) },
        { addedToStore: rollover(102), removedFromStore: rollover(105) },
      ],
      90,
      110,
      200,
    );
    expect(days).toEqual([100, 101, 102, 103, 104]);
  });
});
