import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

function volley(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive volleyball weight.`, ephemeral: true });
    return;
  }
  interaction.reply(`A ${weight}lb volleyball provides +${2 + 0.2 * weight} substats per combat.`);
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "volleyball",
      [
        {
          name: "weight",
          description: "The weight of the volleyball.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      volley,
      "Find the +stat gain supplied by a volleyball of a given weight."
    ),
};

export default command;
