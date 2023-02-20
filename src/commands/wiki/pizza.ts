import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { wikiClient } from "../../clients/kol";

export const data = new SlashCommandBuilder()
  .setName("pizza")
  .setDescription("Find what effects a diabolic pizza with the given letters can grant you.")
  .addStringOption((option) =>
    option
      .setName("letters")
      .setDescription("The first letters of the items you want to bake into a pizza.")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(4)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const letters = interaction.options.getString("letters", true);

  await interaction.deferReply();
  await interaction.editReply({
    content: null,
    embeds: [await wikiClient.getPizzaEmbed(letters.toLowerCase())],
    allowedMentions: {
      parse: [],
    },
  });
}
