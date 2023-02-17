import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

const sombreroSubstats = (weight: number, ml: number) => (ml / 4) * (0.1 + 0.005 * weight);

export function execute(interaction: CommandInteraction) {
  const weight = interaction.options.getInteger("weight", true);
  const ml = interaction.options.getInteger("ml", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive sombrero weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb sombrero with ${ml} ML provides +${sombreroSubstats(
      weight,
      ml
    )} substats per combat.`
  );
}

export const data = new SlashCommandBuilder()
  .setName("sombrero")
  .setDescription("Find the +stat gain supplied by a sombrero of a given weight and ML.")
  .addNumberOption((option) =>
    option.setName("weight").setDescription("The weight of the sombrero.").setRequired(true)
  )
  .addNumberOption((option) =>
    option.setName("ml").setDescription("Monster Level modifier").setRequired(true)
  );
