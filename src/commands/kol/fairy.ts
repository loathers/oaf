import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { toDrop } from "../../utils";

export const data = new SlashCommandBuilder()
  .setName("fairy")
  .setDescription("Find the +item drop supplied by a fairy of a given weight.")
  .addIntegerOption((option) =>
    option
      .setName("weight")
      .setDescription("The weight of the fairy.")
      .setRequired(true)
      .setMinValue(1)
  );

export function execute(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);

  interaction.reply(
    `A ${weight}lb fairy provides +${toDrop(weight).toFixed(2)}% item drop. ` +
      `(+${toDrop(weight, 1.25).toFixed(2)}% for Jumpsuited Hound Dog)`
  );
}
