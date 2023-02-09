import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

function roll(interaction: CommandInteraction): void {
  const diceCount = interaction.options.getInteger("count", true);
  const diceSize = interaction.options.getInteger("size", true);
  if (diceCount > 100)
    interaction.reply("The number of dice you tried to roll is greater than 100. Try 100 or less.");
  else if (diceCount < 1) interaction.reply("Please roll at least one die.");
  else if (diceSize > 1000000)
    interaction.reply(
      "The size of dice you tried to roll is greater than 1000000. Try 1000000 or less."
    );
  else if (diceSize < 0) interaction.reply("Please roll positive integer sized dice.");
  else {
    let rolls = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(Math.floor(Math.random() * diceSize) + 1);
    }
    interaction.reply(
      `Rolled ${diceCount > 1 ? "a total of " : ""}${rolls.reduce(
        (acc, curr) => acc + curr
      )} on ${diceCount}d${diceSize}${
        diceCount > 1 ? ` (Individual rolls: ${rolls.join(", ")})` : "."
      }`
    );
  }
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
      roll,
      "Roll the specified dice of the form."
    ),
};

export default command;
