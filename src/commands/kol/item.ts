import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

function item(interaction: CommandInteraction): void {
  const drop = interaction.options.getNumber("droprate", true);
  if (drop <= 0) {
    interaction.reply({ content: `Please supply a positive droprate.`, ephemeral: true });
    return;
  }
  if (drop > 99.9) {
    interaction.reply(`A 100% drop does not require any item drop bonus to cap.`);
    return;
  }
  interaction.reply(
    `A ${Number(drop.toFixed(1))}% drop requires a +${
      Math.ceil(10000 / Number(drop.toFixed(1))) - 100
    }% item drop bonus to cap.`
  );
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "item",
      [
        {
          name: "droprate",
          description: "The droprate of the item in question.",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
      item,
      "Find the +item drop required to cap a drop."
    ),
};

export default command;
