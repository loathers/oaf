import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { leprechaunWeightForMeatDrop } from "kol.js/domains/Familiar";

export const data = new SlashCommandBuilder()
  .setName("reverseleprechaun")
  .setDescription(
    "Find the weight necessary to supply a given meat drop % from a leprechaun.",
  )
  .addNumberOption((option) =>
    option
      .setName("meatdrop")
      .setDescription(
        "The meat drop % you are looking to get from your leprechaun.",
      )
      .setRequired(true)
      .setMinValue(0.1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const meatDrop = interaction.options.getNumber("meatdrop", true);

  await interaction.reply(
    `To get ${meatDrop}% meat drop from a leprechaun, ` +
      `it should weigh at least ${leprechaunWeightForMeatDrop(meatDrop).toFixed(1)} lbs, ` +
      `or be a Hobo Monkey that weighs at least ${leprechaunWeightForMeatDrop(
        meatDrop,
        1.25,
      ).toFixed(1)} lbs.`,
  );
}
