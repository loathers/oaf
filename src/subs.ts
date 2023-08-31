import { roleMention } from "discord.js";

import { discordClient } from "./clients/discord.js";

export async function rollSubs() {
  const GUILD_ID = process.env.GUILD_ID!;
  const IOTM_CHANNEL_ID = process.env.IOTM_CHANNEL_ID!;
  const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;

  const guild = await discordClient.guilds.fetch(GUILD_ID!);
  const iotmChannel = guild?.channels.cache.get(IOTM_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit a subs rolling webhook but the guild or iotm channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const subRollEmoji = guild.emojis.cache.find((e) => e.name === "subsRolling") || "";

  await iotmChannel.send({
    content: `🚨${subRollEmoji} Attention ${roleMention(
      SUBSCRIBER_ROLE_ID,
    )}! This is an automated message to let you know that subscriptions are now rolling ${subRollEmoji}🚨`,
    allowedMentions: {
      roles: [SUBSCRIBER_ROLE_ID],
    },
  });
}
