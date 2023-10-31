import { add, closestTo, format } from "date-fns";
import { ThreadAutoArchiveDuration, roleMention } from "discord.js";

import { discordClient } from "./clients/discord.js";
import { config } from "./config.js";

function determineIotmMonthYear() {
  const today = new Date();

  format(
    closestTo(today, [
      add(today, { months: 1 }).setDate(1),
      add(today, { months: -1 }).setDate(1),
    ]) ?? today,
    "MMMM y",
  );
}

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

  const message = await iotmChannel.send({
    content: `🚨${subRollEmoji} Attention ${roleMention(
      config.SUBSCRIBER_ROLE_ID,
    )}! This is an automated message to let you know that subscriptions are now rolling ${subRollEmoji}🚨
    
Feel free to discuss spading and speed strats here in the main channel; speculation about farming strategy should be done in the thread.`,
    allowedMentions: {
      roles: [config.SUBSCRIBER_ROLE_ID],
    },
  });

  await message.startThread({
    name: `Farming Discussion for ${determineIotmMonthYear()} IotM`,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    reason: `to discuss & speculate about farming strategy for the ${determineIotmMonthYear()} IotM`,
  });
}
