/// <reference types="../../../../remix.env.d.ts" />
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import React from "react";

import { authenticate } from "../auth.server";
import DiscordMessage from "../components/DiscordMessage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await authenticate(request);

  const url = new URL(request.url);
  const guildId = url.searchParams.get("guildId");
  const channelId = url.searchParams.get("channelId");
  const messageId = url.searchParams.get("messageId");

  if (!guildId || !channelId || !messageId) return { message: null };

  const { discordClient } = context;

  const guild = await discordClient.guilds.fetch(guildId);

  const channel = await guild.channels.fetch(channelId);

  if (!channel?.isTextBased()) return { message: null };

  const message = await channel.messages.fetch(messageId);

  return {
    message: {
      authorName: message.author.username,
      authorAvatar: message.author.displayAvatarURL(),
      content: message.content,
      createdAt: message.createdAt,
    },
  };
}

type Props = {
  guildId: string;
  channelId: string;
  messageId: string;
};

export function DynamicDiscordMessage({
  guildId,
  channelId,
  messageId,
}: Props) {
  const messageFetcher = useFetcher<typeof loader>();

  useEffect(() => {
    messageFetcher.submit(
      { guildId, channelId, messageId },
      { method: "GET", action: "/resources/message" },
    );
  }, [guildId, channelId, messageId]);

  const message = messageFetcher.data?.message ?? null;

  return <DiscordMessage message={message} />;
}
