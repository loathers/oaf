import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { wikiClient } from "../../clients/wiki.js";

export const data = new SlashCommandBuilder()
  .setName("rescan")
  .setDescription("Reload OAF's in-game information from mafia's datafiles.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (await wikiClient.reloadMafiaData()) {
    return interaction.editReply("Information reloaded from KoLMafia Github data files.");
  }

  return interaction.editReply("Information reloaded too recently, try again later.");
}
