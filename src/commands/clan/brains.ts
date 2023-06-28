import { Player, PrismaPromise } from "@prisma/client";
import { ChatInputCommandInteraction, SlashCommandBuilder, bold, underscore } from "discord.js";

import { prisma } from "../../clients/database.js";
import { kolClient } from "../../clients/kol.js";
import { formatPlayer } from "../../utils/index.js";

const BASE_CLASSES = [
  "Seal Clubber",
  "Turtle Tamer",
  "Pastamancer",
  "Sauceror",
  "Disco Bandit",
  "Accordion Thief",
] as const;

export const data = new SlashCommandBuilder()
  .setName("brains")
  .setDescription("Find players whose brains can be drained for Dreadsylvania skills.");

/**
 * @param players List of players to format
 * @returns A text list of players formatted for Discord and trimmed to a maximum of 1024 characters as per API requirements
 */
function formatPlayerList(players: Player[]) {
  if (players.length === 0) return "None available.";

  let output = "";

  for (const player of players.sort()) {
    const formattedPlayer = formatPlayer(player);
    if (output.length + formattedPlayer.length > 1020) {
      return output + "...";
    }
    output += formattedPlayer + "\n";
  }

  return output.slice(0, -1);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const classToPlayers = Object.fromEntries(BASE_CLASSES.map((c) => [c, [] as Player[]]));

  const players = await prisma.player.findMany({
    where: { OR: [{ brainiac: true }, { skills: { gt: 0 } }] },
  });

  const playerNameUpdates: PrismaPromise<Player>[] = [];

  for (const player of players) {
    const current = await kolClient.getPartialPlayerFromId(player.playerId);

    // If not found, continue
    if (!current) continue;

    // While we're here, let's update any player name changes
    if (current.name !== player.playerName) {
      playerNameUpdates.push(
        prisma.player.update({
          where: { playerId: player.playerId },
          data: { playerName: current.name },
        })
      );
    }

    // Lower than level 15
    if (current.level < 15) continue;
    // Not in a standard class
    if (!(current.class in classToPlayers)) continue;

    classToPlayers[current.class].push(player);
  }

  await interaction.editReply({
    content: null,
    embeds: [
      {
        title: "Potentially available brains",
        description:
          "Captain Scotch, kenny kamAKAzi, and 3BH can pilot dread multis for any class of brain, subject to multi restrictions.",
        fields: BASE_CLASSES.map((playerClass) => ({
          name: bold(underscore(playerClass)),
          value: formatPlayerList(classToPlayers[playerClass]),
          inline: true,
        })),
      },
    ],
  });

  await prisma.$transaction(playerNameUpdates);
}
