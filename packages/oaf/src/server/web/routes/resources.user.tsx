import { Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { useFetcher } from "react-router";

import { authenticate } from "../auth.server.js";
import { Route } from "./+types/resources.user.js";

export async function loader({ request, context }: Route.LoaderArgs) {
  await authenticate(request);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return { user: null };

  const { discordClient } = context;

  const user = await discordClient.users.fetch(id);

  if (!user) return { user: null };

  return {
    user: { name: user.username, avatar: user.displayAvatarURL() },
  };
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
