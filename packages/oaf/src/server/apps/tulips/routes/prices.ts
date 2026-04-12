import { startOfYear, sub } from "date-fns";
import { Router } from "express";

import {
  getFlowerPriceHistory,
  getFlowerPriceHistoryBucketed,
} from "../../../../clients/database.js";

const RANGES: Record<string, { since: () => Date; bucket: string | null }> = {
  "1D": { since: () => sub(new Date(), { days: 1 }), bucket: null },
  "1W": { since: () => sub(new Date(), { weeks: 1 }), bucket: null },
  "1M": { since: () => sub(new Date(), { months: 1 }), bucket: "hour" },
  YTD: { since: () => startOfYear(new Date()), bucket: "hour" },
  "1Y": { since: () => sub(new Date(), { years: 1 }), bucket: "day" },
  "10Y": { since: () => sub(new Date(), { years: 10 }), bucket: "day" },
};

export const pricesRouter = Router();

pricesRouter.get("/", async (req, res) => {
  const range = typeof req.query.range === "string" ? req.query.range : "1D";
  const config = RANGES[range] ?? RANGES["1D"];
  const since = config.since();

  const prices = config.bucket
    ? await getFlowerPriceHistoryBucketed(since, config.bucket)
    : await getFlowerPriceHistory(since);

  res.json({ prices });
});
