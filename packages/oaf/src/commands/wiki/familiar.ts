import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { createEmbed } from "../../clients/discord.js";

export const data = new SlashCommandBuilder()
  .setName("familiar")
  .setDescription("Get information about the given familiar.")
  .addNumberOption((option) =>
    option
      .setName("familiar")
      .setDescription("The KoL familiar to query.")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const familiarId = interaction.options.getNumber("familiar", true);
  await interaction.deferReply();

  const familiar = dataOfLoathingClient.familiars.find(
    (f) => f.id === familiarId,
  );

  const embed = createEmbed();

  if (!familiar) {
    await interaction.editReply({
      content: null,
      embeds: [embed.setDescription("Familiar could not be found.")],
    });
    return;
  }

  embed
    .setTitle(familiar.name)
    .setURL(dataOfLoathingClient.getWikiLink(familiar));
  await familiar.addToEmbed(embed);

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = dataOfLoathingClient.familiars
    .map(({ name, id }) => ({ name, value: id }))
    .filter(({ name }) =>
      name.toLowerCase().includes(focusedValue.toLowerCase()),
    )
    .slice(0, 25);

  await interaction.respond(filtered);
}
