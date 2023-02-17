import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { toDrop, toWeight } from "../../utils";

export const data = new SlashCommandBuilder()
  .setName("reverseleprechaun")
  .setDescription("Find the weight necessary to supply a given meat drop % from a leprechaun.")
  .addNumberOption((option) =>
    option
      .setName("meat")
      .setDescription("The meat drop % you are looking to get from your leprechaun.")
      .setRequired(true)
  );

export function execute(interaction: CommandInteraction) {
  const meatDrop = interaction.options.getNumber("meat", true);
  if (meatDrop <= 0) {
    interaction.reply({ content: "Please supply a positive meat drop value.", ephemeral: true });
    return;
  }

  interaction.reply(
    `To get ${meatDrop}% meat drop from a leprechaun, ` +
      `it should weigh at least ${toWeight(meatDrop).toFixed(1)} lbs, ` +
      `or be a Hobo Monkey that weighs at least ${toWeight(meatDrop).toFixed(1)} lbs.`
  );
}
