import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { fromLevel } from "./level";
import { fromMainstat } from "./stat";

const fromSubstat = (substat: number) => fromMainstat(Math.floor(Math.sqrt(Math.max(0, substat))));

export const data = new SlashCommandBuilder()
  .setName("substat")
  .setDescription("Find the mainstat and level for a given substat total")
  .addNumberOption((option) =>
    option
      .setName("substat")
      .setDescription("The amount of substat you are reaching.")
      .setRequired(true)
  );

export function execute(interaction: CommandInteraction) {
  const substat = interaction.options.getInteger("substat", true);
  if (substat <= 0) {
    interaction.reply({ content: `Please supply a positive substat.`, ephemeral: true });
    return;
  }

  const { level, mainstat } = fromSubstat(substat);

  let reply = `Substat total ${substat.toLocaleString()} reaches mainstat ${mainstat.toLocaleString()} and ${
    level >= 255 ? "maximum " : ""
  }level ${level}.`;

  if (level < 255) {
    const next = fromLevel(level + 1);

    reply += ` An additional ${(next.substat - substat).toLocaleString()} total substat${
      next.substat - substat > 1 ? "s are" : " is"
    } required to reach level ${next.level}.`;
  }

  interaction.reply(reply);
}
