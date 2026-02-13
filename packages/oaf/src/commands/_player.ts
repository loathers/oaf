import { Player } from "kol.js";

import { findPlayerWithRaffleWins } from "../clients/database.js";
import { kolClient } from "../clients/kol.js";

export function validPlayerIdentifier(identifier: string) {
  // If a player id: a number!
  // If a username: 3 to 30 alphanumeric characters, starting with alpha, may contain underscores or spaces
  return /^([a-zA-Z][a-zA-Z0-9_ ]{2,29})|[0-9]+$/.test(identifier);
}

export async function findPlayer(where: {
  playerId?: number;
  discordId?: string;
}) {
  return await findPlayerWithRaffleWins(where);
}

type FoundPlayer = Awaited<ReturnType<typeof findPlayer>>;

export async function identifyPlayer(
  input: string,
): Promise<string | [Player<true>, FoundPlayer]> {
  // Check if this is a discord mention
  if (input.match(/^<@\d+>$/)) {
    const knownPlayer = await findPlayer({ discordId: input.slice(2, -1) });

    if (knownPlayer === null) {
      return "That user hasn't claimed a KoL account.";
    }

    return [
      await kolClient.players.fetch(knownPlayer.playerId, true),
      knownPlayer,
    ];
  }

  // Validate if the string identifies a KoL player, either as a player ID or a user name
  if (typeof input === "string" && !validPlayerIdentifier(input)) {
    return "Come now, you know that isn't a player. Can't believe you'd try and trick me like this. After all we've been through? 😔";
  }

  const player = await kolClient.players.fetch(input, true);

  if (!player)
    return `According to KoL, player ${typeof input === "number" ? "#" : ""}${input} does not exist.`;

  const knownPlayer = await findPlayer({ playerId: player.id });

  return [player, knownPlayer];
}
