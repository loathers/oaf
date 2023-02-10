import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

const sombreroSubstats = (weight: number, ml: number) => (ml / 4) * (0.1 + 0.005 * weight);

function sombreroCommand(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  const ml = interaction.options.getInteger("ml", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive sombrero weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb sombrero with ${ml} ML provides +${sombreroSubstats(
      weight,
      ml
    )} substats per combat.`
  );
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "sombrero",
      [
        {
          name: "weight",
          description: "The weight of the sombrero.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
        {
          name: "monsterLevel",
          description: "ML modifier",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      sombreroCommand,
      "Find the +stat gain supplied by a sombrero of a given weight and ML."
    ),
};

export default command;
