import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";
import SuffixArrayMatcher from "../../utils/SuffixArrayMatcher.js";

export const data = new SlashCommandBuilder()
  .setName("effect")
  .setDescription("Get information about the given effect.")
  .addNumberOption((option) =>
    option
      .setName("effect")
      .setDescription("The KoL effect to query.")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const effectId = interaction.options.getNumber("effect", true);
  await interaction.deferReply();

  const effect = wikiClient.effects.find((i) => i.id === effectId);

  const embed = createEmbed();

  if (!effect) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Effect could not be found.")],
    });
    return;
  }

  embed.setTitle(effect.name).setURL(await wikiClient.getWikiLink(effect));

  await effect.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

const matcher = new SuffixArrayMatcher(wikiClient.effects, (effect) => effect.name.toLowerCase());

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = matcher
    .match(focusedValue.toLowerCase())
    .map((effect) => ({ name: effect.name, value: effect.id }))
    .slice(0, 25);
  await interaction.respond(filtered);
}
