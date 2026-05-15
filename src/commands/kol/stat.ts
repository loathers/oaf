import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { levelForMainstat, statsForLevel } from "kol.js";

import { pluralize } from "../../utils.js";

export const data = new SlashCommandBuilder()
  .setName("stat")
  .setDescription("Find the substats and level for a given mainstat total.")
  .addIntegerOption((option) =>
    option
      .setName("stat")
      .setDescription("The amount of mainstat you are reaching.")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const mainstat = interaction.options.getInteger("stat", true);

  const { level, substat } = levelForMainstat(mainstat);

  let reply = `Mainstat ${mainstat.toLocaleString()} (reached at ${pluralize(
    substat,
    "total substat",
  )}) reaches ${level >= 255 ? "maximum " : ""}level ${level}.`;

  if (level <= 255) {
    const next = statsForLevel(level + 1);
    reply += ` An additional ${(
      next.mainstat - mainstat
    ).toLocaleString()} mainstat (requiring ${pluralize(
      next.substat - substat,
      "more substat",
    )}) is required to reach level ${next.level}.`;
  }

  await interaction.reply(reply);
}
