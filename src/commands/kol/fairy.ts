import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { toDrop, toWeight } from "../../utils";
import { Command } from "../type";

function fairyCommand(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive fairy weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb fairy provides +${toDrop(weight).toFixed(2)}% item drop. ` +
      `(+${toDrop(weight, 1.25).toFixed(2)}% for Jumpsuited Hound Dog)`
  );
}

function reverseFairyCommand(interaction: CommandInteraction): void {
  const itemDrop = interaction.options.getNumber("item", true);
  if (itemDrop <= 0) {
    interaction.reply({ content: "Please supply a positive item drop value.", ephemeral: true });
    return;
  }

  interaction.reply(
    `To get ${itemDrop}% item drop from a fairy, ` +
      `it should be weigh at least ${toWeight(itemDrop).toFixed(1)} lbs, ` +
      `or be a Jumpsuited Hounddog that weighs at least ${toWeight(itemDrop, 1.25).toFixed(1)} lbs.`
  );
}

const command: Command = {
  attach: ({ discordClient }) => {
    discordClient.attachCommand(
      "fairy",
      [
        {
          name: "weight",
          description: "The weight of the fairy.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      fairyCommand,
      "Find the +item drop supplied by a fairy of a given weight."
    );
    discordClient.attachCommand(
      "reversefairy",
      [
        {
          name: "item",
          description: "The item drop % you are looking to get from your fairy.",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
      reverseFairyCommand,
      "Find the weight necessary to supply a given item drop % from a fairy."
    );
  },
};

export default command;
