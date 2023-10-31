import { channelMention, roleMention } from "discord.js";

import { discordClient } from "./clients/discord.js";
import { config } from "./config.js";

export async function rollSubs() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const iotmChannel = guild?.channels.cache.get(config.IOTM_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit a subs rolling webhook but the guild or iotm channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const subRollEmoji =
    guild.emojis.cache.find((e) => e.name === "subsRolling") ?? "";

  await iotmChannel.send({
    content: `🚨${subRollEmoji} Attention ${roleMention(
      config.SUBSCRIBER_ROLE_ID,
    )}! This is an automated message to let you know that subscriptions are now rolling ${subRollEmoji}🚨
    
    Discuss spading and speed strats here in ${channelMention(
      config.IOTM_CHANNEL_ID,
    )}; discuss farming over in ${channelMention(config.FARMING_CHANNEL_ID)}.`,
    allowedMentions: {
      roles: [config.SUBSCRIBER_ROLE_ID],
    },
  });
}
