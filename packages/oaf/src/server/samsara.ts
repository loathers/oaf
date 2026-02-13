import { bold } from "discord.js";
import * as z from "zod";

import { discordClient } from "../clients/discord.js";
import { config } from "../config.js";
import { titleCase } from "../utils.js";

export const samsaraRecordsSchema = z.object({
  player: z.object({
    name: z.string(),
    id: z.number(),
  }),
  days: z.number(),
  turns: z.number(),
  lifestyle: z.string(),
  pathName: z.string(),
});

export async function samsara({
  player,
  lifestyle,
  pathName,
  turns,
  days,
}: z.infer<typeof samsaraRecordsSchema>) {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const unrestrictedChannel = guild?.channels.cache.get(
    config.UNRESTRICTED_CHANNEL_ID,
  );

  if (!unrestrictedChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit a Samsara webhook but the guild or unrestricted channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const goldStarEmoji =
    guild.emojis.cache.find((e) => e.name === "goldstar")?.toString() ?? "";

  const path = pathName === "None" ? "No Path" : pathName;

  await unrestrictedChannel.send({
    content: `🚨${goldStarEmoji} ${player.name} (#${player.id}) has achieved the best ${bold(`${titleCase(lifestyle)} ${path}`)} with ${days}/${turns}.`,
  });
}
