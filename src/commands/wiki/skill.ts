import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";
import SuffixArrayMatcher from "../../utils/SuffixArrayMatcher.js";

export const data = new SlashCommandBuilder()
  .setName("skill")
  .setDescription("Get information about the given skill.")
  .addNumberOption((option) =>
    option
      .setName("skill")
      .setDescription("The KoL skill to query.")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const skillId = interaction.options.getNumber("skill", true);
  await interaction.deferReply();

  const skill = wikiClient.skills.find((i) => i.id === skillId);

  const embed = createEmbed();

  if (!skill) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Skill could not be found.")],
    });
    return;
  }

  embed.setTitle(skill.name).setURL(await wikiClient.getWikiLink(skill));

  await skill.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

const matcher = new SuffixArrayMatcher(wikiClient.skills, (skill) => skill.name.toLowerCase());

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = matcher
    .match(focusedValue.toLowerCase())
    .map((skill) => ({ name: skill.name, value: skill.id }))
    .slice(0, 25);
  await interaction.respond(filtered);
}
