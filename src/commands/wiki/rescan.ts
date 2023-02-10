import { CommandInteraction } from "discord.js";

import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

async function rescanCommand(interaction: CommandInteraction, wikiSearcher: WikiSearcher) {
  await interaction.deferReply();

  if (await wikiSearcher.conditionallyReloadMafiaData()) {
    return interaction.editReply("Information reloaded from KoLMafia Github data files.");
  }

  return interaction.editReply("Information reloaded too recently, try again later.");
}

const command: Command = {
  attach: ({ discordClient, wikiSearcher }) =>
    discordClient.attachCommand(
      "rescan",
      [],
      async (interaction: CommandInteraction) => await rescanCommand(interaction, wikiSearcher),
      "Reload OAF's in-game information from mafia's datafiles."
    ),
};

export default command;
