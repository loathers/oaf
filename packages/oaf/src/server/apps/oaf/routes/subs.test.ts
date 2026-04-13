import { afterEach, beforeEach } from "node:test";
import { describe, expect, test, vi } from "vitest";

import { determineIotmMonth, formatIotmMonth } from "./subs.js";

describe("determineIotmMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("Correctly rolls forward to the next month", () => {
    vi.setSystemTime(new Date(2023, 9, 27));
    expect(determineIotmMonth()).toEqual(new Date(2023, 10, 1));
  });

  test("Correctly rolls backward to the current month", () => {
    vi.setSystemTime(new Date(2023, 9, 6));
    expect(determineIotmMonth()).toEqual(new Date(2023, 9, 1));
  });

  test("Correctly rolls forward to the next year", () => {
    vi.setSystemTime(new Date(2023, 11, 30));
    expect(determineIotmMonth()).toEqual(new Date(2024, 0, 1));
  });
});

describe("formatIotmMonth", () => {
  test("Formats a month correctly", () => {
    expect(formatIotmMonth(new Date(2023, 9, 1))).toEqual("October 2023");
  });
});
