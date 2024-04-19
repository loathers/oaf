/// <reference types="../../../../remix.env.d.ts" />
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
} from "@remix-run/server-runtime";
import { messageLink } from "discord.js";
import React, { useEffect, useRef } from "react";

import { DiscordClient } from "../../../clients/discord";
import { authenticator } from "../auth.server";

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
    url: e.url,
  }));
}

export async function loader({ context }: LoaderFunctionArgs) {
  const { discordClient } = context;
  return json({
    channels: await fetchChannels(discordClient),
    emoji: await fetchEmoji(discordClient),
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/",
  });
  const formData = await request.formData();
  const channelId = formData.get("channelId");
  const content = formData.get("content");

  if (
    !channelId ||
    typeof channelId !== "string" ||
    !content ||
    typeof content !== "string"
  )
    return json({ success: false });

  const { discordClient } = context;

  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) return json({ success: false });

  const message = await channel.send(content);
  await discordClient.alert(
    `${user.name} made me say ${messageLink(message.channelId, message.id)}`,
  );

  return json({ success: true });
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
        <FormControl isRequired>
          <FormLabel>Channel</FormLabel>
          <Select name="channelId">
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
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
