import { Router } from "express";

import { LoathingDate } from "../../clients/LoathingDate.js";
import {
  getDailiesForGameday,
  getDailySubmissionsForKey,
  getSubmissionSummaries,
} from "../../clients/database.js";
import { DAILY_GLOBALS } from "../../commands/misc/_globals.js";

export const dailiesRouter = Router();

dailiesRouter.get("/", async (_req, res) => {
  const gameday = LoathingDate.fromRealDate(new Date());
  const [summaries, dailies] = await Promise.all([
    getSubmissionSummaries(gameday),
    getDailiesForGameday(gameday),
  ]);

  const dailyByKey = new Map(dailies.map((d) => [d.key, d]));

  res.json({
    summaries,
    dailies: DAILY_GLOBALS.map((k) => {
      const daily = dailyByKey.get(k.key);
      return {
        key: k.key,
        displayName: k.displayName,
        crowdsourced: k.crowdsourced,
        value: daily?.value ?? null,
        thresholdReached: daily?.thresholdReached ?? null,
      };
    }),
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
