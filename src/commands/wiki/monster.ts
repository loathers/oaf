import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { wikiClient } from "../../clients/wiki";

export const data = new SlashCommandBuilder()
  .setName("monster")
  .setDescription("Get information about the given monster.")
  .addNumberOption((option) =>
    option
      .setName("monster")
      .setDescription("The KoL monster to query.")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const monsterId = interaction.options.getNumber("monster", true);
  await interaction.deferReply();

  const monster = wikiClient.monsters.find((i) => i.id === monsterId);

  const embed = new EmbedBuilder();

  if (!monster) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Monster could not be found.")],
    });
    return;
  }

  await monster.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = wikiClient.monsters
    .map(({ name, id }) => ({ name, value: id }))
    .filter(({ name }) => name.toLowerCase().includes(focusedValue.toLowerCase()))
    .slice(0, 25);

  await interaction.respond(filtered);
}
