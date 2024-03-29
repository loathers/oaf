import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";

export const data = new SlashCommandBuilder()
  .setName("monster")
  .setDescription("Get information about the given monster.")
  .addNumberOption((option) =>
    option
      .setName("monster")
      .setDescription("The KoL monster to query.")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const monsterId = interaction.options.getNumber("monster", true);
  await interaction.deferReply();

  const monster = wikiClient.monsters.find((i) => i.id === monsterId);

  const embed = createEmbed();

  if (!monster) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Monster could not be found.")],
    });
    return;
  }

  embed.setTitle(monster.name).setURL(await wikiClient.getWikiLink(monster));
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
    .filter(({ name }) =>
      name.toLowerCase().includes(focusedValue.toLowerCase()),
    )
    .slice(0, 25);

  await interaction.respond(filtered);
}
