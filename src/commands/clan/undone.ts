import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { pool } from "../../db";

export const data = new SlashCommandBuilder()
  .setName("undone")
  .setDescription("Set a player as not done with Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as not done with skills.")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await pool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET done_with_skills = FALSE;",
    [username]
  );
  interaction.editReply(`Removed user "${username}" from the list of players done with skills.`);
  return;
}
