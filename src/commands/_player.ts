import {
  type ChatInputCommandInteraction,
  FormattingPatterns,
  inlineCode,
} from "discord.js";
import type { Player } from "kol.js";

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

type Identification = string | [Player, FoundPlayer];

/** Thrown when a Discord user has no KoL account linked to them. */
export class UnclaimedAccountError extends Error {
  constructor(readonly discordId: string) {
    super(`Discord user ${discordId} has not claimed a KoL account`);
    this.name = "UnclaimedAccountError";
  }
}

/** Thrown when a claimed KoL account can no longer be found in-game. */
export class PlayerNotInGameError extends Error {
  constructor(readonly playerId: number) {
    super(`KoL player #${playerId} could not be found in-game`);
    this.name = "PlayerNotInGameError";
  }
}

async function identifyClaimedPlayer(
  discordId: string,
): Promise<[Player, FoundPlayer]> {
  const knownPlayer = await findPlayer({ discordId });

  if (knownPlayer === null) throw new UnclaimedAccountError(discordId);

  const player = await kolClient.players.resolve(knownPlayer.playerId);

  if (!player) throw new PlayerNotInGameError(knownPlayer.playerId);

  return [player, knownPlayer];
}

export async function identifyPlayer(input: string): Promise<Identification> {
  // Check if this is a discord mention
  const mention = FormattingPatterns.User.exec(input);

  if (mention?.groups) {
    try {
      return await identifyClaimedPlayer(mention.groups.id);
    } catch (error) {
      if (error instanceof UnclaimedAccountError)
        return "That user hasn't claimed a KoL account, so I don't know who they are in-game.";
      if (error instanceof PlayerNotInGameError)
        return "That user has claimed a KoL account, but I can't find it in-game.";
      throw error;
    }
  }

  // Validate if the string identifies a KoL player, either as a player ID or a user name
  if (typeof input === "string" && !validPlayerIdentifier(input)) {
    return "Come now, you know that isn't a player. Can't believe you'd try and trick me like this. After all we've been through? 😔";
  }

  const player = await kolClient.players.resolve(input);

  if (!player)
    return `According to KoL, player ${typeof input === "number" ? "#" : ""}${input} does not exist.`;

  const knownPlayer = await findPlayer({ playerId: player.id });

  return [player, knownPlayer];
}

/** Identify the player named in an option, defaulting to the caller's own claimed account. */
export async function identifyPlayerOrSelf(
  interaction: ChatInputCommandInteraction,
  option = "player",
): Promise<Identification> {
  const input = interaction.options.getString(option, false);

  if (input) return await identifyPlayer(input);

  try {
    return await identifyClaimedPlayer(interaction.user.id);
  } catch (error) {
    if (error instanceof UnclaimedAccountError)
      return `You haven't claimed a KoL account, so you'll have to tell me which player you mean or link one by running ${inlineCode("/claim")}.`;
    if (error instanceof PlayerNotInGameError)
      return "You've claimed a KoL account, but I can't find it in-game.";
    throw error;
  }
}
