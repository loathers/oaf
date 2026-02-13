import { messageLink } from "discord.js";
import { Router } from "express";

import { discordClient } from "../../clients/discord.js";

export const pilotRouter = Router();

pilotRouter.get("/", (_req, res) => {
  const guild = discordClient.guild;

  const channels = guild
    ? [...guild.channels.cache.values()]
        .filter((c) => c.isTextBased())
        .map((c) => ({ name: c.name, id: c.id }))
    : [];

  const emoji = guild
    ? [...guild.emojis.cache.values()].map((e) => ({
        name: e.name,
        id: e.id,
        url: e.imageURL(),
      }))
    : [];

  res.json({ channels, emoji });
});

pilotRouter.post("/", async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { channelId, content, reply } = req.body as {
    channelId?: string;
    content?: string;
    reply?: string;
  };

  if (!channelId || !content) {
    res.json({ success: false });
    return;
  }

  try {
    let message;

    if (reply) {
      const url = new URL(reply);
      const [, , replyGuildId, replyChannelId, replyMessageId] =
        url.pathname.split("/");
      if (replyGuildId !== discordClient.guild?.id)
        throw new Error("Outside of guild");
      const channel = await discordClient.channels.fetch(replyChannelId);
      if (!channel || !channel.isTextBased())
        throw new Error("Invalid channel");
      const replyee = await channel.messages.fetch(replyMessageId);
      message = await replyee.reply(content);
    } else {
      const channel = await discordClient.channels.fetch(channelId);
      if (!channel || !channel.isSendable()) {
        res.json({ success: false });
        return;
      }
      message = await channel.send(content);
    }

    await discordClient.alert(
      `${user.name} made me say ${messageLink(message.channelId, message.id)}`,
    );

    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});
