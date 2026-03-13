import { Router } from "express";

import {
  getAllDailyConsensus,
  getDailySubmissionsForKey,
} from "../../clients/database.js";
import { KNOWN_KEYS } from "../../commands/kol/crowdsource.js";

export const dailiesRouter = Router();

dailiesRouter.get("/", async (_req, res) => {
  const consensus = await getAllDailyConsensus();
  res.json({
    keys: KNOWN_KEYS,
    consensus: consensus.map((c) => ({ ...c, count: Number(c.count) })),
  });
});

dailiesRouter.get("/:key", async (req, res) => {
  const { key } = req.params;
  if (!KNOWN_KEYS.includes(key as (typeof KNOWN_KEYS)[number])) {
    res.status(400).json({ error: "Unknown key" });
    return;
  }

  const submissions = await getDailySubmissionsForKey(key);
  res.json({ key, submissions });
});
