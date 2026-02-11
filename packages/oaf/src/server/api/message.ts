import { Router } from "express";

import { discordClient } from "../../clients/discord.js";

export const messageRouter = Router();

messageRouter.get("/", async (req, res) => {
  const guildId = req.query.guildId as string | undefined;
  const channelId = req.query.channelId as string | undefined;
  const messageId = req.query.messageId as string | undefined;

  if (!guildId || !channelId || !messageId) {
    res.json({ message: null });
    return;
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel?.isTextBased()) {
      res.json({ message: null });
      return;
    }

    const message = await channel.messages.fetch(messageId);

    res.json({
      message: {
        authorName: message.author.username,
        authorAvatar: message.author.displayAvatarURL(),
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch {
    res.json({ message: null });
  }
});
