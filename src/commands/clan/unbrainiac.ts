import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { clanState } from "../../clans";
import { pool } from "../../db";

export const data = new SlashCommandBuilder()
  .setName("unbrainiac")
  .setDescription("Unset a player as always available for Dreadsylvania skills.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The player to unset as always available for brain draining.")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const username = interaction.options.getString("player", true).toLowerCase();

  await interaction.deferReply();

  await pool.query(
    "INSERT INTO players (username, brainiac) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET brainiac = FALSE;",
    [username]
  );

  if (clanState.killMap.has(username)) {
    clanState.killMap.get(username)!.brainiac = false;
  }

  await interaction.editReply(
    `Removed user "${username}" to the list of players always available to help with skills.`
  );

  return;
}
