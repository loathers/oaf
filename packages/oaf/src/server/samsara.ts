import { bold } from "discord.js";

import { discordClient } from "../clients/discord.js";
import { config } from "../config.js";

type Details = {
  player: {
    name: string;
    id: number;
  };
  days: number;
  turns: number;
  lifestyle: string;
  pathName: string;
};

export async function samsara({
  player,
  lifestyle,
  pathName,
  turns,
  days,
}: Details) {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const iotmChannel = guild?.channels.cache.get(config.UNRESTRICTED_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit a Samsara webhook but the guild or unrestricted channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const goldStarEmoji =
    guild.emojis.cache.find((e) => e.name === "goldstar") ?? "";

  await iotmChannel.send({
    content: `🚨${goldStarEmoji} ${player.name} (#${player.id}) has achieved the best ${bold(`${lifestyle} ${pathName}`)} with ${days}/${turns}.`,
  });
}
