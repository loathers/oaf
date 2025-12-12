import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  italic,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { identifyPlayer } from "../_player.js";

export const data = new SlashCommandBuilder()
  .setName("brainiac")
  .setDescription("Set a player as always available for Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription(
        "The player to set as always available for brain draining.",
      )
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName("available")
      .setDescription("Whether the player is available or not (default: true)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", true);
  const available = interaction.options.getBoolean("available", false) ?? true;

  await interaction.deferReply();

  const identification = await identifyPlayer(input);

  if (typeof identification === "string") {
    await interaction.editReply(identification);
    return;
  }

  const [player] = identification;

  await prisma.player.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      playerName: player.name,
      brainiac: available,
    },
    update: { brainiac: available },
  });

  await interaction.editReply(
    `${available ? "Added" : "Removed"} user ${italic(player.name)} ${
      available ? "to" : "from"
    } the list of players always available to help with skills.`,
  );
}
