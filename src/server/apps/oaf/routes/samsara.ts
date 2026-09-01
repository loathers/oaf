import { bold, hyperlink } from "discord.js";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import * as z from "zod";

import { discordClient } from "../../../../clients/discord.js";
import { config } from "../../../../config.js";
import { titleCase } from "../../../../utils.js";

const boardSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const bodySchema = z.object({
  player: z.object({
    name: z.string(),
    id: z.number(),
  }),
  days: z.number(),
  turns: z.number(),
  lifestyle: z.string(),
  pathName: z.string(),
  board: boardSchema.nullish(),
  url: z.url().optional(),
});

export function formatRecord({
  lifestyle,
  pathName,
  board,
  url,
}: Pick<
  z.infer<typeof bodySchema>,
  "lifestyle" | "pathName" | "board" | "url"
>) {
  const path = pathName === "None" ? "No Path" : pathName;
  const record = bold(
    `${titleCase(lifestyle)} ${board ? `${path} (${board.label})` : path}`,
  );
  return url ? hyperlink(record, url) : record;
}

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
    const { player, turns, days } = body.data;
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

    await unrestrictedChannel.send({
      content: `🚨${goldStarEmoji} ${player.name} (#${player.id}) has achieved the best ${formatRecord(body.data)} with ${days}/${turns}.`,
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
