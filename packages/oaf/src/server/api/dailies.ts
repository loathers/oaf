import { Router } from "express";
import { LoathingDate } from "kol.js";

import {
  getDailiesForGameday,
  getDailySubmissionsForKey,
  getSubmissionCountsForGameday,
  setCrowdsourcingIgnored,
} from "../../clients/database.js";
import { DAILY_GLOBALS } from "../../commands/misc/_globals.js";

export const dailiesRouter = Router();

dailiesRouter.post("/ignore/:playerId", async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  if (isNaN(playerId)) {
    res.status(400).json({ error: "Invalid player ID" });
    return;
  }
  await setCrowdsourcingIgnored(playerId, true);
  res.json({ ok: true });
});

dailiesRouter.delete("/ignore/:playerId", async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  if (isNaN(playerId)) {
    res.status(400).json({ error: "Invalid player ID" });
    return;
  }
  await setCrowdsourcingIgnored(playerId, false);
  res.json({ ok: true });
});

dailiesRouter.get("/", async (_req, res) => {
  const gameday = LoathingDate.gameDayFromRealDate(new Date());
  const [dailies, submissionCounts] = await Promise.all([
    getDailiesForGameday(gameday),
    getSubmissionCountsForGameday(gameday),
  ]);
  const dailyByKey = new Map(dailies.map((d) => [d.key, d]));

  res.json({
    dailies: DAILY_GLOBALS.map((k) => {
      const daily = dailyByKey.get(k.key);
      return {
        key: k.key,
        displayName: k.displayName,
        crowdsourced: k.crowdsourced,
        value: daily?.value ?? null,
        thresholdReached: daily?.thresholdReached ?? null,
        submissionCount: submissionCounts.get(k.key) ?? 0,
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

  const gameday = LoathingDate.gameDayFromRealDate(new Date());
  const submissions = await getDailySubmissionsForKey(key, gameday);
  res.json({ key, submissions });
});
