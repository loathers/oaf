import { Pvp } from "kol.js/domains/Pvp";

import { getLatestPvpSeason, upsertPvpSeason } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

/**
 * Seasons run two months from rollover (03:30 UTC) on the 1st. Working back
 * from the end date means a season we only manage to record late still gets
 * its real start date.
 */
function seasonStart(endsAt: Date | undefined) {
  if (!endsAt || Number.isNaN(endsAt.getTime())) return new Date();
  const start = new Date(endsAt);
  start.setUTCMonth(start.getUTCMonth() - 2);
  start.setUTCHours(3, 30, 0, 0);
  return start;
}

export function init() {
  kolClient.on("rollover", () => {
    void (async () => {
      try {
        const pvp = new Pvp(kolClient);
        const { seasonNumber, seasonName, endsAt } =
          await pvp.getCurrentSeason();

        const latestSeason = await getLatestPvpSeason();
        if (latestSeason?.seasonNumber === seasonNumber) return;

        await upsertPvpSeason({
          seasonNumber,
          seasonName,
          startDate: seasonStart(endsAt),
        });
      } catch (error) {
        await discordClient.alert(
          "Failed to sync PvP season",
          undefined,
          error,
        );
      }
    })();
  });
}
