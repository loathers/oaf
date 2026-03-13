import { Router } from "express";

import { LoathingDate } from "../../clients/LoathingDate.js";
import {
  getAllDailyConsensus,
  getDailySubmissionsForKey,
} from "../../clients/database.js";
import {
  CONSENSUS_THRESHOLD,
  KNOWN_KEYS,
} from "../../commands/kol/crowdsource.js";

export const dailiesRouter = Router();

dailiesRouter.get("/", async (_req, res) => {
  const gameday = LoathingDate.fromRealDate(new Date());
  const consensus = await getAllDailyConsensus(gameday);
  res.json({
    keys: KNOWN_KEYS,
    threshold: CONSENSUS_THRESHOLD,
    consensus: consensus.map((c) => ({ ...c, count: Number(c.count) })),
  });
});

dailiesRouter.get("/:key", async (req, res) => {
  const { key } = req.params;
  if (!KNOWN_KEYS.includes(key as (typeof KNOWN_KEYS)[number])) {
    res.status(400).json({ error: "Unknown key" });
    return;
  }

  const gameday = LoathingDate.fromRealDate(new Date());
  const submissions = await getDailySubmissionsForKey(key, gameday);
  res.json({ key, submissions });
});
