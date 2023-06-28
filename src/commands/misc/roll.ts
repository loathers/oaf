import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { lf } from "../../utils/index.js";

export const data = new SlashCommandBuilder()
  .setName("roll")
  .setDescription("Roll the specified dice of the form.")
  .addIntegerOption((option) =>
    option
      .setName("size")
      .setDescription("Number of sides on each die")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1000000)
  )
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Number of dice to roll (default 1)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100)
  );

export function execute(interaction: ChatInputCommandInteraction) {
  const diceSize = interaction.options.getInteger("size", true);
  const diceCount = interaction.options.getInteger("count", false) || 1;

  const dnd = `${diceCount}d${diceSize}`;
  const rolls = Array(diceCount)
    .fill(0)
    .map(() => Math.floor(Math.random() * diceSize) + 1);
  const total = rolls.reduce((acc, v) => acc + v);

  if (diceCount === 1) {
    return interaction.reply(`Rolled ${total} on ${dnd}.`);
  }

  return interaction.reply(
    `Rolled a total of ${total} on ${dnd} (individal rolls ${lf.format(
      rolls.map((n) => n.toString())
    )})`
  );
}
