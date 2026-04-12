import { startOfYear, sub } from "date-fns";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";

import {
  getFlowerPriceHistory,
  getFlowerPriceHistoryBucketed,
} from "../../../../clients/database.js";
import { RANGES, type Range } from "../types.js";

export const pricesRouter = Router();

pricesRouter.get("/", async (req, res) => {
  const range = typeof req.query.range === "string" ? req.query.range : "1D";
  const config = RANGES[range as Range] ?? RANGES["1D"];
  const since =
    config.duration === "YTD"
      ? startOfYear(new Date())
      : sub(new Date(), config.duration);

  try {
    const prices = config.bucket
      ? await getFlowerPriceHistoryBucketed(since, config.bucket)
      : await getFlowerPriceHistory(since);

    res.json({ prices });
  } catch (e) {
    if (e instanceof Error) {
      return void res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: e.message });
    }
    throw e;
  }
});
