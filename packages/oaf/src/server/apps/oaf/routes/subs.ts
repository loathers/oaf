import { add, closestTo, format } from "date-fns";
import { ThreadAutoArchiveDuration, roleMention } from "discord.js";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";

import { discordClient } from "../../../../clients/discord.js";
import { config } from "../../../../config.js";

export function determineIotmMonthYear(): string {
  const today = new Date();

  return format(
    closestTo(today, [
      add(today, { months: 1 }).setDate(1),
      new Date(today).setDate(1),
    ]) ?? today,
    "MMMM y",
  );
}

export const subsRouter = Router();

subsRouter.get("/", async (req, res) => {
  const token = req.query.token;

  if (!token)
    return void res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "No token" });
  if (token !== config.SUBS_ROLLING_TOKEN)
    return void res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Invalid token" });

  try {
    const guild = await discordClient.guilds.fetch(config.GUILD_ID);
    const iotmChannel = guild?.channels.cache.get(config.IOTM_CHANNEL_ID);

    const today = new Date();
    if (today.getMonth() === 3 && today.getDate() === 1) {
      discordClient.parka = today;
    }

    if (!iotmChannel?.isTextBased()) {
      await discordClient.alert(
        "Someone has tried to hit a subs rolling webhook but the guild or iotm channel are incorrectly configured",
      );
      throw new Error("Something is configured wrong");
    }

    const subRollEmoji =
      guild.emojis.cache.find((e) => e.name === "subsRolling")?.toString() ??
      "";

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

    return void res.status(StatusCodes.OK).json({ status: "Thanks Chris!" });
  } catch (e) {
    if (e instanceof Error) {
      return void res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: e.message });
    }

    throw e;
  }
});
