import { bold } from "discord.js";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import * as z from "zod";

import { discordClient } from "../../../../clients/discord.js";
import { config } from "../../../../config.js";
import { titleCase } from "../../../../utils.js";

const bodySchema = z.object({
  player: z.object({
    name: z.string(),
    id: z.number(),
  }),
  days: z.number(),
  turns: z.number(),
  lifestyle: z.string(),
  pathName: z.string(),
});

export const samsaraRouter = Router();

samsaraRouter.post("/", async (req, res) => {
  const token = req.query.token;

  if (!token)
    return void res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "No token" });
  if (token !== config.SAMSARA_TOKEN)
    return void res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Invalid token" });

  const body = bodySchema.safeParse(req.body);

  if (!body.success) {
    return void res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid body" });
  }

  try {
    const { player, lifestyle, pathName, turns, days } = body.data;
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

    return void res.status(StatusCodes.OK).json({ success: "true" });
  } catch (e) {
    if (e instanceof Error) {
      return void res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: e.message });
    }

    throw e;
  }
});
