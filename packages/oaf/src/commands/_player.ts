import type { Player, Prisma } from "@prisma/client";

import { prisma } from "../clients/database.js";
import { kolClient } from "../clients/kol.js";

export function validPlayerIdentifier(identifier: string) {
  // If a player id: a number!
  // If a username: 3 to 30 alphanumeric characters, starting with alpha, may contain underscores or spaces
  return /^([a-zA-Z][a-zA-Z0-9_ ]{2,29})|[0-9]+$/.test(identifier);
}

const _getFullPlayer = (x: string) => kolClient.players.fetch(x, true);
type KoLPlayer = Awaited<ReturnType<typeof _getFullPlayer>>;

export type FindPlayerResult =
  | (Player & {
      greenbox: {
        id: number;
        playerId: number;
        data: string;
        createdAt: Date;
      } | null;
    })
  | null;

export async function findPlayer(
  where: Prisma.PlayerWhereInput,
): Promise<FindPlayerResult> {
  const player = await prisma.player.findFirst({
    where,
    include: { greenbox: { orderBy: { id: "desc" }, take: 1 } },
  });
  if (!player) return null;
  return { ...player, greenbox: player.greenbox.at(0) ?? null };
}

export async function identifyPlayer(
  input: string,
): Promise<string | [KoLPlayer, FindPlayerResult]> {
  // If the input is a Discord mention, we'll try to set a player identifier there. Otherwise this just gets set to
  // the same value as input.
  let playerIdentifier;

  // Whatever happens we'll try to ascertain whether this is a known player. Because we either do so at the start or
  // at the end, declare a null variable here.
  let knownPlayer: Awaited<ReturnType<typeof findPlayer>> = null;

  // Check if this is a mention first of all
  if (input.match(/^<@\d+>$/)) {
    knownPlayer = await findPlayer({ discordId: input.slice(2, -1) });

    if (knownPlayer === null) {
      return "That user hasn't claimed a KoL account.";
    }

    playerIdentifier = knownPlayer.playerId;
  } else {
    playerIdentifier = input;
  }

  if (
    typeof playerIdentifier === "string" &&
    !validPlayerIdentifier(playerIdentifier)
  ) {
    return "Come now, you know that isn't a player. Can't believe you'd try and trick me like this. After all we've been through? 😔";
  }

  const player = await kolClient.players.fetch(playerIdentifier, true);

  if (!knownPlayer) {
    knownPlayer = await findPlayer({ playerId: player.id });
  }

  if (!player)
    return `According to KoL, player ${typeof playerIdentifier === "number" ? "#" : ""}${playerIdentifier} does not exist.`;

  return [player, knownPlayer] as const;
}
