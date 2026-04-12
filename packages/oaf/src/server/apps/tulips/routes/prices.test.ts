import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RANGES, type Range } from "../types.js";

describe("RANGES config", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("all ranges have valid bucket values", () => {
    for (const [key, config] of Object.entries(RANGES)) {
      expect(
        [null, "hour", "day"],
        `${key} has invalid bucket "${config.bucket}"`,
      ).toContain(config.bucket);
    }
  });

  test("1D produces a date 1 day ago", () => {
    const config = RANGES["1D"];
    expect(config.duration).toEqual({ days: 1 });
  });

  test("1W produces a duration of 1 week", () => {
    const config = RANGES["1W"];
    expect(config.duration).toEqual({ weeks: 1 });
  });

  test("1M produces a duration of 1 month", () => {
    const config = RANGES["1M"];
    expect(config.duration).toEqual({ months: 1 });
    expect(config.bucket).toBe("hour");
  });

  test("YTD uses the YTD sentinel", () => {
    const config = RANGES["YTD"];
    expect(config.duration).toBe("YTD");
    expect(config.bucket).toBe("hour");
  });

  test("1Y and 10Y bucket by day", () => {
    expect(RANGES["1Y"].bucket).toBe("day");
    expect(RANGES["10Y"].bucket).toBe("day");
  });

  test("short ranges (1D, 1W) have no bucketing", () => {
    expect(RANGES["1D"].bucket).toBeNull();
    expect(RANGES["1W"].bucket).toBeNull();
  });

  test("all expected range keys exist", () => {
    const expected: Range[] = ["1D", "1W", "1M", "YTD", "1Y", "10Y"];
    expect(Object.keys(RANGES).sort()).toEqual(expected.sort());
  });
});
