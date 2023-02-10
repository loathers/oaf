import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { lf } from "../../utils";
import { Command } from "../type";

function rollCommand(interaction: CommandInteraction) {
  const diceCount = interaction.options.getInteger("count", true);
  const diceSize = interaction.options.getInteger("size", true);
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

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "roll",
      [
        {
          name: "count",
          description: "Number of dice to roll",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
        {
          name: "size",
          description: "Number of sides on each die",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      rollCommand,
      "Roll the specified dice of the form."
    ),
};

export default command;
