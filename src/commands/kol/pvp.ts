import { Pvp } from "kol.js/domains/Pvp";

import { getLatestPvpSeason, upsertPvpSeason } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

const PVP_SEASON_MONTHS = new Set([0, 2, 4, 6, 8, 10]); // Jan, Mar, May, Jul, Sep, Nov

function isNewSeasonDay(now: Date) {
  return now.getUTCDate() === 1 && PVP_SEASON_MONTHS.has(now.getUTCMonth());
}

async function isMissingCurrentSeason(now: Date) {
  const latestSeason = await getLatestPvpSeason();
  const daysSinceLastSeason = latestSeason
    ? (now.getTime() - latestSeason.startDate.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  return daysSinceLastSeason >= 60;
}

export function init() {
  kolClient.on("rollover", () => {
    void (async () => {
      try {
        const now = new Date();

        if (!isNewSeasonDay(now) && !(await isMissingCurrentSeason(now)))
          return;

        const pvp = new Pvp(kolClient);
        const { seasonNumber, seasonName } = await pvp.getCurrentSeason();
        await upsertPvpSeason({ seasonNumber, seasonName, startDate: now });
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
