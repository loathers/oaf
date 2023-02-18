import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { lf } from "../../utils";

export const data = new SlashCommandBuilder()
  .setName("roll")
  .setDescription("Roll the specified dice of the form.")
  .addIntegerOption((option) =>
    option.setName("size").setDescription("Number of sides on each die").setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("count").setDescription("Number of dice to roll (default 1)").setRequired(false)
  );

export function execute(interaction: CommandInteraction) {
  const diceSize = interaction.options.getInteger("size", true);
  const diceCount = interaction.options.getInteger("count", false) || 1;
  if (diceCount > 100) {
    return interaction.reply(
      "The number of dice you tried to roll is greater than 100. Try 100 or less."
    );
  }
  if (diceCount < 1) return interaction.reply("Please roll at least one die.");

  if (diceSize > 1000000) {
    return interaction.reply(
      "The size of dice you tried to roll is greater than 1,000,000. Try 1,000,000 or less."
    );
  }

  if (diceSize < 0) return interaction.reply("Please roll positive integer sized dice.");

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
