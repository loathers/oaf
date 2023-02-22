import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const sombreroSubstats = (weight: number, ml: number) => (ml / 4) * (0.1 + 0.005 * weight);

export const data = new SlashCommandBuilder()
  .setName("sombrero")
  .setDescription("Find the +stat gain supplied by a sombrero of a given weight and ML.")
  .addIntegerOption((option) =>
    option
      .setName("weight")
      .setDescription("The weight of the sombrero.")
      .setRequired(true)
      .setMinValue(1)
  )
  .addIntegerOption((option) =>
    option.setName("ml").setDescription("Monster Level modifier").setRequired(true)
  );

export function execute(interaction: ChatInputCommandInteraction) {
  const weight = interaction.options.getInteger("weight", true);
  const ml = interaction.options.getInteger("ml", true);

  interaction.reply(
    `A ${weight}lb sombrero with ${ml} ML provides +${sombreroSubstats(
      weight,
      ml
    )} substats per combat.`
  );
}
