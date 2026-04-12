import { afterEach, beforeEach } from "node:test";
import { describe, expect, test, vi } from "vitest";

import { determineIotmMonthYear } from "./subs.js";

describe("Can parse dates correctly", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("Correctly rolls forward to the next month", () => {
    vi.setSystemTime(new Date(2023, 9, 27));
    expect(determineIotmMonthYear()).toEqual("November 2023");
  });

  test("Correctly rolls backward to the current month", () => {
    vi.setSystemTime(new Date(2023, 9, 6));
    expect(determineIotmMonthYear()).toEqual("October 2023");
  });

  test("Correctly rolls forward to the next year", () => {
    vi.setSystemTime(new Date(2023, 11, 30));
    expect(determineIotmMonthYear()).toEqual("January 2024");
  });
});
