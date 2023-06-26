import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { wikiClient } from "../../clients/wiki";

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

  const embed = new EmbedBuilder();

  if (!item) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Item could not be found.")],
    });
    return;
  }

  await item.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = wikiClient.items
    .map(({ name, id }) => ({ name, value: id }))
    .filter(({ name }) => name.toLowerCase().includes(focusedValue.toLowerCase()))
    .slice(0, 25);
  await interaction.respond(filtered);
}
