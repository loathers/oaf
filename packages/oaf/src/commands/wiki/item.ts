import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { mafiaClient } from "../../clients/mafia.js";
import { itemAutocomplete, itemOption } from "../_options.js";

export const data = new SlashCommandBuilder()
  .setName("item")
  .setDescription("Get information about the given item.")
  .addIntegerOption(itemOption());

export async function embedForItem(id: number) {
  const item = mafiaClient.items.find((i) => i.id === id);
  if (!item) return null;
  const embed = createEmbed();
  embed.setTitle(item.name).setURL(await mafiaClient.getWikiLink(item));
  await item.addToEmbed(embed);
  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const itemId = interaction.options.getInteger("item", true);
  await interaction.deferReply();

  const embed = await embedForItem(itemId);

  if (!embed) {
    await interaction.editReply({
      content: null,
      embeds: [createEmbed().setDescription("Item could not be found.")],
    });
    return;
  }

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await interaction.respond(itemAutocomplete(interaction.options.getFocused()));
}
