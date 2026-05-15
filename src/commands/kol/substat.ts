import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { levelForSubstat, statsForLevel } from "kol.js";

export const data = new SlashCommandBuilder()
  .setName("substat")
  .setDescription("Find the mainstat and level for a given substat total")
  .addIntegerOption((option) =>
    option
      .setName("substat")
      .setDescription("The amount of substat you are reaching.")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const substat = interaction.options.getInteger("substat", true);

  const { level, mainstat } = levelForSubstat(substat);

  let reply = `Substat total ${substat.toLocaleString()} reaches mainstat ${mainstat.toLocaleString()} and ${
    level >= 255 ? "maximum " : ""
  }level ${level}.`;

  if (level < 255) {
    const next = statsForLevel(level + 1);

    reply += ` An additional ${(
      next.substat - substat
    ).toLocaleString()} total substat${
      next.substat - substat > 1 ? "s are" : " is"
    } required to reach level ${next.level}.`;
  }

  await interaction.reply(reply);
}
