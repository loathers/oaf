import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { toDrop } from "../../utils.js";

export const data = new SlashCommandBuilder()
  .setName("leprechaun")
  .setDescription(
    "Find the +meat drop supplied by a leprechaun of a given weight.",
  )
  .addIntegerOption((option) =>
    option
      .setName("weight")
      .setDescription("The weight of the leprechaun.")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const weight = interaction.options.getInteger("weight", true);

  await interaction.reply(
    `A ${weight}lb leprechaun provides +${(2 * toDrop(weight)).toFixed(
      2,
    )}% meat drop. ` +
      `(+${(2 * toDrop(weight, 1.25)).toFixed(2)}% for Hobo Monkey)`,
  );
}
