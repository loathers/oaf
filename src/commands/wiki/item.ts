import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";
import { itemAutocomplete, itemOption } from "../_options.js";

export const data = new SlashCommandBuilder()
  .setName("item")
  .setDescription("Get information about the given item.")
  .addIntegerOption(itemOption());

export async function execute(interaction: ChatInputCommandInteraction) {
  const itemId = interaction.options.getInteger("item", true);
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

export async function autocomplete(interaction: AutocompleteInteraction) {
  await interaction.respond(itemAutocomplete(interaction.options.getFocused()));
}
