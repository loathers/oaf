/// <reference types="../../../../remix.env.d.ts" />
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
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

import { authenticator } from "../auth.server";

export async function loader({ context }: LoaderFunctionArgs) {
  const { discordClient } = context;

  if (!discordClient.guild) return json({ channels: [] });

  const channels = [...discordClient.guild.channels.cache.values()];

  return json({
    channels: channels
      .filter((c) => c.isTextBased())
      .map((c) => ({ name: c.name, id: c.id })),
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
  const { channels } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const success = fetcher.data?.success;

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
          <Textarea name="content" ref={messageInput} />
        </FormControl>
        <Button type="submit">Send</Button>
      </Stack>
    </Stack>
  );
}
