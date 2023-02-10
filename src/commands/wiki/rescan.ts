import { CommandInteraction } from "discord.js";

import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

async function reloadMafiaData(
  interaction: CommandInteraction,
  wikiSearcher: WikiSearcher
): Promise<void> {
  await interaction.deferReply();
  if (await wikiSearcher.conditionallyReloadMafiaData())
    interaction.editReply("Information reloaded from KoLMafia Github data files.");
  else interaction.editReply("Information reloaded too recently, try again later.");
}

const command: Command = {
  attach: ({ discordClient, wikiSearcher }) =>
    discordClient.attachCommand(
      "rescan",
      [],
      async (interaction: CommandInteraction) => await reloadMafiaData(interaction, wikiSearcher),
      "Reload OAF's in-game information from mafia's datafiles."
    ),
};

export default command;
