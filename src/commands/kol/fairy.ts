import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

function fairy(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive fairy weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb fairy provides +${Number(
      (Math.sqrt(55 * weight) + weight - 3).toFixed(2)
    )}% item drop. (+${Number(
      (Math.sqrt(55 * weight * 1.25) + weight * 1.25 - 3).toFixed(2)
    )}% for Jumpsuited Hound Dog)`
  );
}

function reverseFairy(interaction: CommandInteraction): void {
  const itemDrop = interaction.options.getNumber("item", true);
  if (itemDrop <= 0) {
    interaction.reply({ content: "Please supply a positive item drop value.", ephemeral: true });
    return;
  }
  interaction.reply(
    `To get ${itemDrop}% item drop from a fairy, it should be weigh at least ${(
      (2 * itemDrop + 61 - Math.sqrt(220 * itemDrop + 3685)) /
      2
    ).toFixed(1)} lbs, or be a Jumpsuited Hounddog that weighs at least ${(
      (2 * itemDrop + 61 - Math.sqrt(220 * itemDrop + 3685)) /
      2 /
      1.25
    ).toFixed(1)} lbs.`
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
      fairy,
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
      reverseFairy,
      "Find the weight necessary to supply a given item drop % from a fairy."
    );
  },
};

export default command;
