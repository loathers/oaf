import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { clamp } from "../../utils/index.js";

export const fromLevel = (level: number) => ({
  level,
  mainstat: Math.pow(level, 2) - level * 2 + 5,
  substat: Math.pow(Math.pow(level - 1, 2) + 4, 2),
});

export const data = new SlashCommandBuilder()
  .setName("level")
  .setDescription("Find the stats and substats needed for a given level.")
  .addIntegerOption((option) =>
    option
      .setName("level")
      .setDescription("The level you are looking to reach.")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(255)
  );

export function execute(interaction: ChatInputCommandInteraction) {
  const level = clamp(interaction.options.getInteger("level", true), 1, 255);

  const { mainstat, substat } = fromLevel(level);

  interaction.reply(
    `Level ${level}${
      level === 255 ? " (the maximum)" : ""
    } requires ${mainstat.toLocaleString()} mainstat or ${substat.toLocaleString()} total substats.`
  );
}
