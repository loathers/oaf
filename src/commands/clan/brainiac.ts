import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { clanState } from "../../clans";
import { pool } from "../../db";

export const data = new SlashCommandBuilder()
  .setName("brainiac")
  .setDescription("Set a player as always available for Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as always available for brain draining.")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const username = interaction.options.getString("player", true).toLowerCase();

  await interaction.deferReply();

  await pool.query(
    "INSERT INTO players (username, brainiac) VALUES ($1, TRUE) ON CONFLICT (username) DO UPDATE SET brainiac = TRUE;",
    [username]
  );

  if (clanState.killMap.has(username)) {
    clanState.killMap.get(username)!.brainiac = true;
  } else {
    clanState.killMap.set(username, {
      kills: 0,
      skills: 0,
      brainiac: true,
    });
  }

  await interaction.editReply(
    `Added user "${username}" to the list of players always available to help with skills.`
  );

  return;
}
