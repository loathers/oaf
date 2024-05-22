import { add } from "date-fns";
import { afterEach, beforeEach } from "node:test";
import { describe, expect, test, vi } from "vitest";

import { parseDuration } from "./remind.js";

describe("Parsing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("Can parse rollover from midnight", () => {
    vi.setSystemTime(new Date(2000, 1, 1));

    expect(parseDuration("rollover")).toEqual({
      hours: 3,
      minutes: 40,
    });
  });

  test("Can parse rollover from midday", () => {
    vi.setSystemTime(new Date(2000, 1, 1, 12));

    expect(parseDuration("rollover")).toEqual({
      hours: 15,
      minutes: 40,
    });
  });

  test("Can parse rollover from rollover", () => {
    vi.setSystemTime(new Date(2000, 1, 1, 3, 40));

    expect(parseDuration("rollover")).toEqual({
      days: 1,
    });
  });

  test("Can parse custom duration string", () => {
    vi.setSystemTime(new Date(2000, 1, 1));

    expect(parseDuration("2w3d5m")).toEqual({
      weeks: 2,
      days: 3,
      minutes: 5,
    });
  });

  test("Can use custom duration string", () => {
    vi.setSystemTime(new Date(2000, 1, 1));

    expect(add(new Date(), parseDuration("1d")!)).toEqual(new Date(2000, 1, 2));
  });
});
