import type { Duration } from "date-fns";

export type Range = "1D" | "1W" | "1M" | "YTD" | "1Y" | "10Y";

export function formatTime(dateStr: string, range: Range): string {
  const date = new Date(dateStr);
  switch (range) {
    case "1D":
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    case "1W":
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        hour: "numeric",
      });
    case "1M":
    case "YTD":
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
      });
    case "1Y":
    case "10Y":
      return date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
  }
}

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
