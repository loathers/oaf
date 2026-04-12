import type { Duration } from "date-fns";

export type Range = "1D" | "1W" | "1M" | "YTD" | "1Y" | "10Y";

export const RANGES: Record<
  Range,
  { duration: Duration | "YTD"; bucket: "hour" | "day" | null }
> = {
  "1D": { duration: { days: 1 }, bucket: null },
  "1W": { duration: { weeks: 1 }, bucket: null },
  "1M": { duration: { months: 1 }, bucket: "hour" },
  YTD: { duration: "YTD", bucket: "hour" },
  "1Y": { duration: { years: 1 }, bucket: "day" },
  "10Y": { duration: { years: 10 }, bucket: "day" },
};
