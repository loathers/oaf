import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { pool } from "../../db";

export const data = new SlashCommandBuilder()
  .setName("done")
  .setDescription("Set a player as done with Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to set as done with skills.")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await pool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, TRUE) ON CONFLICT (username) DO UPDATE SET done_with_skills = TRUE;",
    [username]
  );
  interaction.editReply(`Added user "${username}" to the list of players done with skills.`);
  return;
}
