import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { Message, messageLink } from "discord.js";
import React, { useEffect, useRef } from "react";
import { useFetcher, useLoaderData } from "react-router";

import { DiscordClient } from "../../../clients/discord.js";
import { authenticate } from "../auth.server.js";
import { Route } from "./+types/admin.pilot.js";

async function fetchChannels(discordClient: DiscordClient) {
  if (!discordClient.guild) return [];

  return [...discordClient.guild.channels.cache.values()]
    .filter((c) => c.isTextBased())
    .map((c) => ({ name: c.name, id: c.id }));
}

async function fetchEmoji(discordClient: DiscordClient) {
  if (!discordClient.guild) return [];

  return [...discordClient.guild.emojis.cache.values()].map((e) => ({
    name: e.name,
    id: e.id,
    url: e.imageURL(),
  }));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await authenticate(request);
  const { discordClient } = context;
  return {
    channels: await fetchChannels(discordClient),
    emoji: await fetchEmoji(discordClient),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = await authenticate(request);

  const formData = await request.formData();
  const channelId = formData.get("channelId");
  const content = formData.get("content");
  const reply = formData.get("reply");

  if (
    !channelId ||
    typeof channelId !== "string" ||
    !content ||
    typeof content !== "string"
  )
    return { success: false };

  const { discordClient } = context;

  let message: Message;

  if (reply && typeof reply === "string") {
    try {
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
    } catch (error) {
      return { success: false };
    }
  } else {
    const channel = await discordClient.channels.fetch(channelId);
    if (!channel || !channel.isSendable()) return { success: false };
    message = await channel.send(content);
  }

  await discordClient.alert(
    `${user.name} made me say ${messageLink(message.channelId, message.id)}`,
  );

  return { success: true };
}

export default function Pilot() {
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const { channels, emoji } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const success = fetcher.data?.success;

  function addEmoji({ name, id }: (typeof emoji)[number]) {
    const el = messageInput.current;
    if (!el) return;
    el.value += `${el.value.endsWith(" ") ? "" : " "}<:${name}:${id}>`;
    return false;
  }

  useEffect(() => {
    if (success && messageInput.current) messageInput.current.value = "";
  }, [fetcher.data, messageInput.current]);

  return (
    <Stack>
      {success !== undefined && (
        <Alert status={success ? "success" : "error"}>
          <AlertIcon />
          {success ? "Message sent successfully" : "Something went wrong"}
        </Alert>
      )}
      <Stack as={fetcher.Form} method="POST">
        <FormControl>
          <FormLabel>Channel</FormLabel>
          <Select name="channelId">
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Reply to (optional)</FormLabel>
          <Input
            name="reply"
            placeholder="Paste a message link here if you want the bot to send a reply. Ignores any specified channel."
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Message</FormLabel>
          <HStack alignItems="start">
            <Textarea name="content" ref={messageInput} />
            <Menu>
              <MenuButton
                as={Button}
                size="xs"
                type="button"
                title="Emoji Picker"
              >
                🙂
              </MenuButton>
              <MenuList
                maxWidth="80px"
                maxHeight="200px"
                overflowY="scroll"
                display="flex"
                flexWrap="wrap"
              >
                {emoji.map((e) => (
                  <MenuItem
                    key={e.id}
                    display="inline"
                    width="auto"
                    paddingInlineStart={1}
                    paddingInlineEnd={1}
                    type="button"
                    onClick={() => addEmoji(e)}
                  >
                    <Image width="30px" title={e.name || ""} src={e.url} />
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>
        </FormControl>
        <Button type="submit">Send</Button>
      </Stack>
    </Stack>
  );
}
