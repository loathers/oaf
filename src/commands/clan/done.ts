import { ChatInputCommandInteraction, SlashCommandBuilder, italic } from "discord.js";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";

export const data = new SlashCommandBuilder()
  .setName("done")
  .setDescription("Set whether a player is done with Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as done with skills.")
      .setRequired(true)
  )
  .addBooleanOption((option) =>
    option
      .setName("done")
      .setDescription("Whether the player is done or not (default: true)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const playerName = interaction.options.getString("player", true);
  const doneWithSkills = interaction.options.getBoolean("done", false) ?? true;

  await interaction.deferReply();

  const existing = await prisma.player.findFirst({
    where: {
      playerName: {
        equals: playerName,
        mode: "insensitive",
      },
    },
  });

  if (!existing) {
    const player = await kolClient.getPartialPlayerFromName(playerName);

    if (!player) {
      await interaction.editReply(`User ${italic(playerName)} could not be found`);
      return;
    }

    await prisma.player.create({
      data: { playerId: player.id, playerName: player.name, doneWithSkills },
    });
  } else {
    await prisma.player.update({
      where: { playerId: existing.playerId },
      data: { doneWithSkills },
    });
  }

  await interaction.editReply(
    `${doneWithSkills ? "Added" : "Removed"} user ${italic(playerName)} ${
      doneWithSkills ? "to" : "from"
    } the list of players done with skills.`
  );
}
