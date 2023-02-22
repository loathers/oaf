import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { databaseClient } from "../../clients/database";

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

  await databaseClient.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET done_with_skills = $2;",
    [username, done]
  );

  await interaction.editReply(
    `${done ? "Added" : "Removed"} user "${username}" ${
      done ? "to" : "from"
    } the list of players done with skills.`
  );
}
