import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

async function wikiSearch(
  interaction: CommandInteraction,
  wikiSearcher: WikiSearcher
): Promise<void> {
  const item = interaction.options.getString("term", true);
  await interaction.deferReply();
  const embed = await wikiSearcher.getEmbed(item);
  if (embed) {
    interaction.editReply({
      content: null,
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  } else {
    interaction.editReply({
      content: `"${item}" wasn't found. Please refine your search.`,
      allowedMentions: {
        parse: [],
      },
    });
  }
}

const command: Command = {
  attach: ({ discordClient, wikiSearcher }) =>
    discordClient.attachCommand(
      "wiki",
      [
        {
          name: "term",
          description: "The term to search for in the wiki.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => wikiSearch(interaction, wikiSearcher),
      "Search the KoL wiki for the given term."
    ),
};

export default command;
