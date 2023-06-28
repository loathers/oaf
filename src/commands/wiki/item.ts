import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";
import SuffixArrayMatcher from "../../utils/SuffixArrayMatcher.js";

export const data = new SlashCommandBuilder()
  .setName("item")
  .setDescription("Get information about the given item.")
  .addNumberOption((option) =>
    option
      .setName("item")
      .setDescription("The KoL item to query.")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const itemId = interaction.options.getNumber("item", true);
  await interaction.deferReply();

  const item = wikiClient.items.find((i) => i.id === itemId);

  const embed = createEmbed();

  if (!item) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Item could not be found.")],
    });
    return;
  }

  embed.setTitle(item.name).setURL(await wikiClient.getWikiLink(item));

  await item.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

const matcher = new SuffixArrayMatcher(wikiClient.items, (item) => item.name.toLowerCase());

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = matcher
    .match(focusedValue.toLowerCase())
    .map((item) => ({ name: item.name, value: item.id }))
    .slice(0, 25);
  await interaction.respond(filtered);
}
