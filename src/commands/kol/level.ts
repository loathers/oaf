import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

export const fromLevel = (level: number) => ({
  level,
  mainstat: Math.pow(level, 2) - level * 2 + 5,
  substat: Math.pow(Math.pow(level - 1, 2) + 4, 2),
});

export function execute(interaction: CommandInteraction) {
  const level = interaction.options.getInteger("level", true);
  if (level <= 0) {
    interaction.reply({ content: `Please supply a positive level.`, ephemeral: true });
    return;
  }

  if (level === 1) {
    interaction.reply("Level 1 requires 0 mainstat or 0 total substats.");
    return;
  }
  if (level >= 255) {
    interaction.reply(
      "Maximum level 255 requires 64,520 mainstat or 4,162,830,400 total substats."
    );
    return;
  }

  const { mainstat, substat } = fromLevel(level);

  interaction.reply(
    `Level ${level} requires ${mainstat.toLocaleString()} mainstat or ${substat.toLocaleString()} total substats.`
  );
}

export const data = new SlashCommandBuilder()
  .setName("level")
  .setDescription("Find the stats and substats needed for a given level.")
  .addIntegerOption((option) =>
    option.setName("level").setDescription("The level you are looking to reach.").setRequired(true)
  );
