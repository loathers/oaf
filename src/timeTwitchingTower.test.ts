import { LoathingDate } from "kol.js";
import { describe, expect, it } from "vitest";

import { getTowerOpenGamedays, getTowerStatus } from "./timeTwitchingTower.js";

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

describe("getTowerStatus", () => {
  it("reports opened on the day the toolbelt enters the store", () => {
    const status = getTowerStatus(
      { addedToStore: rollover(100), removedFromStore: null },
      rollover(100),
    );
    expect(status).toBe("opened");
  });

  it("reports open on subsequent in-store days", () => {
    const status = getTowerStatus(
      { addedToStore: rollover(100), removedFromStore: null },
      rollover(101),
    );
    expect(status).toBe("open");
  });

  it("treats a predicted future removal as still open", () => {
    const status = getTowerStatus(
      { addedToStore: rollover(100), removedFromStore: rollover(102) },
      rollover(101),
    );
    expect(status).toBe("open");
  });

  it("reports closed on the day of removal", () => {
    const status = getTowerStatus(
      { addedToStore: rollover(100), removedFromStore: rollover(103) },
      rollover(103),
    );
    expect(status).toBe("closed");
  });

  it("reports nothing after the day of removal", () => {
    const status = getTowerStatus(
      { addedToStore: rollover(100), removedFromStore: rollover(103) },
      rollover(104),
    );
    expect(status).toBeNull();
  });

  it("reports nothing when the toolbelt was never tracked", () => {
    expect(getTowerStatus(undefined, rollover(100))).toBeNull();
    expect(
      getTowerStatus(
        { addedToStore: null, removedFromStore: null },
        rollover(100),
      ),
    ).toBeNull();
  });
});
