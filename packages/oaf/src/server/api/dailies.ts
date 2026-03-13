import { Router } from "express";

import { LoathingDate } from "../../clients/LoathingDate.js";
import {
  getAllDailyConsensus,
  getDailiesForGameday,
  getDailySubmissionsForKey,
} from "../../clients/database.js";
import {
  CONSENSUS_THRESHOLD,
  DAILY_GLOBALS,
} from "../../commands/misc/_globals.js";

export const dailiesRouter = Router();

dailiesRouter.get("/", async (_req, res) => {
  const gameday = LoathingDate.fromRealDate(new Date());
  const [consensus, dailies] = await Promise.all([
    getAllDailyConsensus(gameday),
    getDailiesForGameday(gameday),
  ]);

  const dailyByKey = new Map(dailies.map((d) => [d.key, d.value]));

  res.json({
    threshold: CONSENSUS_THRESHOLD,
    consensus: consensus.map((c) => ({ ...c, count: Number(c.count) })),
    dailies: DAILY_GLOBALS.map((k) => ({
      key: k.key,
      displayName: k.displayName,
      crowdsourced: k.crowdsourced,
      value: dailyByKey.get(k.key) ?? null,
    })),
  });
});

dailiesRouter.get("/:key", async (req, res) => {
  const { key } = req.params;
  const entry = DAILY_GLOBALS.find((k) => k.key === key);
  if (!entry?.crowdsourced) {
    res.status(400).json({ error: "Unknown key" });
    return;
  }

  const gameday = LoathingDate.fromRealDate(new Date());
  const submissions = await getDailySubmissionsForKey(key, gameday);
  res.json({ key, submissions });
});
