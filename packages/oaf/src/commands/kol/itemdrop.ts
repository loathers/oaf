import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { itemDropBonusToCap } from "kol.js/domains/Familiar";

export const data = new SlashCommandBuilder()
  .setName("itemdrop")
  .setDescription("Find the +item drop required to cap a drop.")
  .addNumberOption((option) =>
    option
      .setName("droprate")
      .setDescription("The droprate of the item in question.")
      .setRequired(true)
      .setMinValue(0.1)
      .setMaxValue(99.9),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const drop = interaction.options.getNumber("droprate", true);

  await interaction.reply(
    `A ${drop.toFixed(1)}% drop requires a +${itemDropBonusToCap(
      drop,
    )}% item drop bonus to cap.`,
  );
}
