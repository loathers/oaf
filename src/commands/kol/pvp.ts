import { Pvp } from "kol.js/domains/Pvp";

import { getLatestPvpSeason, upsertPvpSeason } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export function init() {
  kolClient.on("rollover", () => {
    void (async () => {
      try {
        const pvp = new Pvp(kolClient);
        const { seasonNumber, seasonName } = await pvp.getCurrentSeason();

        const latestSeason = await getLatestPvpSeason();
        if (latestSeason?.seasonNumber === seasonNumber) return;

        await upsertPvpSeason({
          seasonNumber,
          seasonName,
          startDate: new Date(),
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
