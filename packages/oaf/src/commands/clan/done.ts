import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  italic,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { identifyPlayer } from "../_player.js";

export const data = new SlashCommandBuilder()
  .setName("done")
  .setDescription("Set whether a player is done with Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as done with skills.")
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName("done")
      .setDescription("Whether the player is done or not (default: true)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", true);
  const doneWithSkills = interaction.options.getBoolean("done", false) ?? true;

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
      doneWithSkills,
    },
    update: { doneWithSkills },
  });

  await interaction.editReply(
    `${doneWithSkills ? "Added" : "Removed"} user ${italic(player.name)} ${
      doneWithSkills ? "to" : "from"
    } the list of players done with skills.`,
  );
}
