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
  const username = interaction.options.getString("player", true).toLowerCase();
  const done = interaction.options.getBoolean("done", false) ?? true;

  await interaction.deferReply();

  const existing = await prisma.players.findFirst({ where: { username } });

  if (!existing) {
    const player = await kolClient.getPartialPlayerFromName(username);

    if (!player) {
      await interaction.editReply(`User ${italic(username)} could not be found`);
      return;
    }

    await prisma.players.create({
      data: { playerId: player.id, username, done_with_skills: done },
    });
  } else {
    await prisma.players.update({
      where: { playerId: existing.playerId },
      data: { done_with_skills: done },
    });
  }

  await interaction.editReply(
    `${done ? "Added" : "Removed"} user ${italic(username)} ${
      done ? "to" : "from"
    } the list of players done with skills.`
  );
}
