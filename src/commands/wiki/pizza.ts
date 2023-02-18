import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { wikiClient } from "../../kol";

export const data = new SlashCommandBuilder()
  .setName("pizza")
  .setDescription("Find what effects a diabolic pizza with the given letters can grant you.")
  .addStringOption((option) =>
    option
      .setName("letters")
      .setDescription("The first letters of the items you want to bake into a pizza.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const letters = interaction.options.getString("letters", true);

  if (letters.length < 1 || letters.length > 4) {
    await interaction.reply({
      content: "Invalid pizza length. Please supply a sensible number of letters.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();
  await interaction.editReply({
    content: null,
    embeds: [await wikiClient.getPizzaEmbed(letters.toLowerCase())],
    allowedMentions: {
      parse: [],
    },
  });
}
