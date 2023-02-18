import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { wikiClient } from "../../kol";

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search the KoL wiki for the given term.")
  .addStringOption((option) =>
    option.setName("term").setDescription("The term to search for in the wiki.").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const item = interaction.options.getString("term", true);
  await interaction.deferReply();
  const embed = await wikiClient.getEmbed(item);
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
