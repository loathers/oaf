import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

async function wikiCommand(interaction: CommandInteraction, wikiSearcher: WikiSearcher) {
  const item = interaction.options.getString("term", true);
  await interaction.deferReply();
  const embed = await wikiSearcher.getEmbed(item);
  if (!embed) {
    return interaction.editReply({
      content: `"${item}" wasn't found. Please refine your search.`,
      allowedMentions: {
        parse: [],
      },
    });
  }

  return interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: {
      parse: [],
    },
  });
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
      (interaction: CommandInteraction) => wikiCommand(interaction, wikiSearcher),
      "Search the KoL wiki for the given term."
    ),
};

export default command;
