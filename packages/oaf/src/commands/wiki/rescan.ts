import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { mafiaClient } from "../../clients/mafia.js";

export const data = new SlashCommandBuilder()
  .setName("rescan")
  .setDescription("Reload my in-game information from KoLmafia's datafiles.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (await mafiaClient.reloadMafiaData()) {
    return interaction.editReply(
      "Information reloaded from KoLMafia Github data files.",
    );
  }

  return interaction.editReply(
    "Information reloaded too recently, try again later.",
  );
}
