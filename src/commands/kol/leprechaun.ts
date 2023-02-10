import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { toDrop, toWeight } from "../../utils";
import { Command } from "../type";

function lep(interaction: CommandInteraction): void {
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

function reverseLep(interaction: CommandInteraction): void {
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

const command: Command = {
  attach: ({ discordClient }) => {
    discordClient.attachCommand(
      "leprechaun",
      [
        {
          name: "weight",
          description: "The weight of the leprechaun.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      lep,
      "Find the +meat drop supplied by a leprechaun of a given weight."
    );
    discordClient.attachCommand(
      "reverseleprechaun",
      [
        {
          name: "meat",
          description: "The meat drop % you are looking to get from your leprechaun.",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
      reverseLep,
      "Find the weight necessary to supply a given meat drop % from a leprechaun."
    );
  },
};

export default command;
