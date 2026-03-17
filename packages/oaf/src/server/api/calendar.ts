import { Router } from "express";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import {
  getDailiesForGamedayRange,
  getRafflesForGamedayRange,
} from "../../clients/database.js";
import { DAILY_GLOBALS } from "../../commands/misc/_globals.js";
import type { CalendarData } from "../web/types/calendar.js";

export const calendarRouter = Router();

calendarRouter.get("/", async (req, res) => {
  const from = Number(req.query.from);
  const to = Number(req.query.to);

  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    res.status(400).json({ error: "Invalid from/to parameters" });
    return;
  }

  if (to - from > 400) {
    res.status(400).json({ error: "Range too large (max 400 days)" });
    return;
  }

  const [dailies, raffles] = await Promise.all([
    getDailiesForGamedayRange(from, to),
    getRafflesForGamedayRange(from, to),
  ]);

  const dailyDisplayNames = new Map(
    DAILY_GLOBALS.map((g) => [g.key, g.displayName]),
  );

  const dailiesByGameday = Map.groupBy(dailies, (d) => d.gameday);

  const result: CalendarData = {
    dailies: Object.fromEntries(
      [...dailiesByGameday.entries()].map(([gameday, entries]) => [
        gameday,
        entries
          .filter((e) => dailyDisplayNames.has(e.key))
          .map((e) => ({
            key: e.key,
            displayName: dailyDisplayNames.get(e.key)!,
            value: e.value,
            thresholdReached: e.thresholdReached,
          })),
      ]),
    ),
    raffles: Object.fromEntries(
      raffles.map((r) => {
        const firstItem = dataOfLoathingClient.findItemById(r.firstPrize);
        const secondItem = dataOfLoathingClient.findItemById(r.secondPrize);
        return [
          r.gameday,
          {
            firstPrize: {
              id: r.firstPrize,
              name: firstItem?.name ?? `Unknown item #${r.firstPrize}`,
            },
            secondPrize: {
              id: r.secondPrize,
              name: secondItem?.name ?? `Unknown item #${r.secondPrize}`,
            },
            winners: r.winners,
          },
        ];
      }),
    ),
  };

  res.json(result);
});
