import axios from "axios";
import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

type SearchResponse = {
  items: [{ link: string }];
};

async function mafiaCommand(interaction: CommandInteraction) {
  const item = interaction.options.getString("term", true);

  await interaction.deferReply();

  const googleSearchResponse = await axios.get<SearchResponse>(
    `https://www.googleapis.com/customsearch/v1`,
    {
      params: {
        key: process.env.GOOGLE_API_KEY || "",
        cx: process.env.MAFIA_CUSTOM_SEARCH || "",
        q: item,
      },
    }
  );

  if (!googleSearchResponse.data.items?.length) {
    return interaction.editReply({
      content: `"${item}" wasn't found. Please refine your search.`,
      allowedMentions: {
        parse: [],
      },
    });
  }

  return interaction.editReply({
    content: googleSearchResponse.data.items[0].link,
    embeds: [],
    allowedMentions: {
      parse: [],
    },
  });
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "mafia",
      [
        {
          name: "term",
          description: "The term to search for in the mafia wiki.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      mafiaCommand,
      "Search the KoLmafia wiki for the given term."
    ),
};

export default command;
