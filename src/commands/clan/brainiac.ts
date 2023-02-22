import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { clanState } from "./_clans";
import { prisma } from "../../clients/database";

export const data = new SlashCommandBuilder()
  .setName("brainiac")
  .setDescription("Set a player as always available for Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as always available for brain draining.")
      .setRequired(true)
  )
  .addBooleanOption((option) =>
    option
      .setName("available")
      .setDescription("Whether the player is available or not (default: true)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const username = interaction.options.getString("player", true).toLowerCase();
  const available = interaction.options.getBoolean("available", false) ?? true;

  await interaction.deferReply();

  await prisma.players.upsert({
    where: { username },
    update: { brainiac: available },
    create: { username, brainiac: available },
  });

  if (clanState.killMap.has(username)) {
    clanState.killMap.get(username)!.brainiac = available;
  } else {
    clanState.killMap.set(username, {
      kills: 0,
      skills: 0,
      brainiac: available,
    });
  }

  await interaction.editReply(
    `${available ? "Added" : "Removed"} user "${username}" ${
      available ? "to" : "from"
    } the list of players always available to help with skills.`
  );
}
