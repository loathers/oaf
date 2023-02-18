import { SlashCommandBuilder } from "@discordjs/builders";
import axios from "axios";
import { CommandInteraction } from "discord.js";

type SearchResponse = {
  items: [{ link: string }];
};

export const data = new SlashCommandBuilder()
  .setName("mafia")
  .setDescription("Search the KoLmafia wiki for the given term.")
  .addStringOption((option) =>
    option
      .setName("term")
      .setDescription("The term to search for in the mafia wiki.")
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
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
