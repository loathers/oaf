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
      years: 0,
      months: 0,
      days: 0,
      hours: 3,
      minutes: 40,
      seconds: 0,
    });
  });

  test("Can parse rollover from midday", () => {
    vi.setSystemTime(new Date(2000, 1, 1, 12));

    expect(parseDuration("rollover")).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 15,
      minutes: 40,
      seconds: 0,
    });
  });

  test("Can parse rollover from rollover", () => {
    vi.setSystemTime(new Date(2000, 1, 1, 3, 40));

    expect(parseDuration("rollover")).toEqual({
      years: 0,
      months: 0,
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  test("Can parse custom duration string", () => {
    vi.setSystemTime(new Date(2000, 1, 1));

    expect(parseDuration("2w3d5m")).toEqual({
      weeks: 2,
      days: 3,
      hours: 0,
      minutes: 5,
      seconds: 0,
    });
  });
});
