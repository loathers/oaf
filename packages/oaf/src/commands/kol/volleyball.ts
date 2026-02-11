import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("volleyball")
  .setDescription(
    "Find the +stat gain supplied by a volleyball of a given weight.",
  )
  .addIntegerOption((option) =>
    option
      .setName("weight")
      .setDescription("The weight of the volleyball.")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const weight = interaction.options.getInteger("weight", true);

  await interaction.reply(
    `A ${weight}lb volleyball provides +${
      2 + 0.2 * weight
    } substats per combat.`,
  );
}
