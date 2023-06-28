import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { pluralize } from "../../utils/index.js";
import { fromLevel } from "./level.js";

export const fromMainstat = (mainstat: number) => ({
  level: 1 + Math.floor(Math.sqrt(Math.max(0, mainstat - 4))),
  mainstat,
  substat: Math.pow(mainstat, 2),
});

export const data = new SlashCommandBuilder()
  .setName("stat")
  .setDescription("Find the substats and level for a given mainstat total.")
  .addIntegerOption((option) =>
    option
      .setName("stat")
      .setDescription("The amount of mainstat you are reaching.")
      .setRequired(true)
      .setMinValue(1)
  );

export function execute(interaction: ChatInputCommandInteraction): void {
  const mainstat = interaction.options.getInteger("stat", true);

  const { level, substat } = fromMainstat(mainstat);

  let reply = `Mainstat ${mainstat.toLocaleString()} (reached at ${pluralize(
    substat,
    "total substat"
  )}) reaches ${level >= 255 ? "maximum " : ""}level ${level}.`;

  if (level <= 255) {
    const next = fromLevel(level + 1);
    reply += ` An additional ${(
      next.mainstat - mainstat
    ).toLocaleString()} mainstat (requiring ${pluralize(
      next.substat - substat,
      "more substat"
    )}) is required to reach level ${next.level}.`;
  }

  interaction.reply(reply);
}
