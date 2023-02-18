import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { toDrop } from "../../utils";

export const data = new SlashCommandBuilder()
  .setName("leprechaun")
  .setDescription("Find the +meat drop supplied by a leprechaun of a given weight.")
  .addIntegerOption((option) =>
    option.setName("weight").setDescription("The weight of the leprechaun.").setRequired(true)
  );

export function execute(interaction: CommandInteraction) {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive leprechaun weight.`, ephemeral: true });
    return;
  }

  interaction.reply(
    `A ${weight}lb leprechaun provides +${toDrop(weight).toFixed(2)}% meat drop. ` +
      `(+${toDrop(weight, 1.25).toFixed(2)}% for Hobo Monkey)`
  );
}
