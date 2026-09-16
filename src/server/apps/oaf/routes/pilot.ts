import {
  Colors,
  EmbedBuilder,
  type Message,
  type MessageCreateOptions,
  messageLink,
} from "discord.js";
import { Router } from "express";

import { discordClient } from "../../../../clients/discord.js";
import { config } from "../../../../config.js";

export const pilotRouter = Router();

export function buildPilotMessage(
  content: string,
  moderatorNotice?: boolean,
): MessageCreateOptions {
  if (!moderatorNotice) return { content };
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Moderator Notice")
        .setDescription(content)
        .setColor(Colors.Green),
    ],
  };
}

async function fetchSendableChannel(channelId: string) {
  const channel = await discordClient.channels.fetch(channelId);
  if (!channel?.isSendable()) throw new Error("Invalid channel");
  return channel;
}

async function fetchReplyTarget(link: string) {
  const { pathname } = new URL(link);
  const [, , guildId, channelId, messageId] = pathname.split("/");
  if (guildId !== discordClient.guild?.id) throw new Error("Outside of guild");
  const channel = await discordClient.channels.fetch(channelId);
  if (!channel?.isTextBased()) throw new Error("Invalid channel");
  return await channel.messages.fetch(messageId);
}

async function crosspostModeratorNotice(message: Message) {
  const channelId = config.MODERATOR_NOTICES_CHANNEL_ID;
  if (!channelId) throw new Error("No notices channel configured");
  await message.forward(await fetchSendableChannel(channelId));
}

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

  const { channelId, content, reply, moderatorNotice } = req.body as {
    channelId?: string;
    content?: string;
    reply?: string;
    moderatorNotice?: boolean;
  };

  if (!channelId || !content) {
    res.json({ success: false });
    return;
  }

  const payload = buildPilotMessage(content, moderatorNotice);

  try {
    let message: Message;

    if (reply) {
      const replyee = await fetchReplyTarget(reply);
      message = await replyee.reply(payload);
    } else {
      const channel = await fetchSendableChannel(channelId);
      message = await channel.send(payload);
    }

    await discordClient.alert(
      `${user.name} made me say ${messageLink(message.channelId, message.id)}`,
    );

    if (moderatorNotice) {
      try {
        await crosspostModeratorNotice(message);
      } catch (error) {
        await discordClient.alert(
          "Failed to crosspost a moderator notice",
          undefined,
          error,
        );
        res.json({
          success: true,
          warning: "Sent, but could not crosspost to the notices channel",
        });
        return;
      }
    }

    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});
