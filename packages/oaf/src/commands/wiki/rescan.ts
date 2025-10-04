import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";

export const data = new SlashCommandBuilder()
  .setName("rescan")
  .setDescription("Reload oaf's in-game information from Data of Loathing.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (await dataOfLoathingClient.reload()) {
    return interaction.editReply("Information reloaded from Data of Loathing.");
  }

  return interaction.editReply(
    "Information reloaded too recently, try again later.",
  );
}
