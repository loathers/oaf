import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { fairyWeightForItemDrop } from "kol.js/domains/Familiar";

export const data = new SlashCommandBuilder()
  .setName("reversefairy")
  .setDescription(
    "Find the weight necessary to supply a given item drop % from a fairy.",
  )
  .addNumberOption((option) =>
    option
      .setName("itemdrop")
      .setDescription("The item drop % you are looking to get from your fairy.")
      .setRequired(true)
      .setMinValue(0.1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const itemDrop = interaction.options.getNumber("itemdrop", true);

  await interaction.reply(
    `To get ${itemDrop}% item drop from a fairy, ` +
      `it should be weigh at least ${fairyWeightForItemDrop(itemDrop).toFixed(1)} lbs, ` +
      `or be a Jumpsuited Hounddog that weighs at least ${fairyWeightForItemDrop(
        itemDrop,
        1.25,
      ).toFixed(1)} lbs.`,
  );
}
