/// <reference types="../../../../remix.env.d.ts" />
import { Text } from "@chakra-ui/react";
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import React from "react";

import { authenticator } from "../auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, { failureRedirect: "/" });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return json({ user: null });

  const { discordClient } = context;

  const user = await discordClient.users.fetch(id);

  if (!user) return json({ user: null });

  return json({
    user: { name: user.username, avatar: user.displayAvatarURL() },
  });
}

type Props = {
  id: string;
};

export function DiscordUser({ id }: Props) {
  const userFetcher = useFetcher<typeof loader>();

  useEffect(() => {
    userFetcher.submit({ id }, { method: "GET", action: "/resources/user" });
  }, [id]);

  const user = userFetcher.data?.user;

  if (!user) {
    return <Text>{id}</Text>;
  }

  return <Text>{user.name}</Text>;
}
