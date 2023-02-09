import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

class StatBlock {
  level: number;
  mainstat: number;
  substat: number;

  constructor(level: number, mainstat: number, substat: number) {
    this.level = level;
    this.mainstat = mainstat;
    this.substat = substat;
  }
  static fromLevel(level: number): StatBlock {
    return new StatBlock(
      level,
      Math.pow(level, 2) - level * 2 + 5,
      Math.pow(Math.pow(level - 1, 2) + 4, 2)
    );
  }
  static fromMainstat(mainstat: number): StatBlock {
    return new StatBlock(
      1 + Math.floor(Math.sqrt(Math.max(0, mainstat - 4))),
      mainstat,
      Math.pow(mainstat, 2)
    );
  }
  static fromSubstat(substat: number): StatBlock {
    const mainstat = Math.floor(Math.sqrt(Math.max(0, substat)));
    return new StatBlock(1 + Math.floor(Math.sqrt(Math.max(0, mainstat - 4))), mainstat, substat);
  }
}

function level(interaction: CommandInteraction): void {
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
  const statBlock = StatBlock.fromLevel(level);

  interaction.reply(
    `Level ${
      statBlock.level
    } requires ${statBlock.mainstat.toLocaleString()} mainstat or ${statBlock.substat.toLocaleString()} total substats.`
  );
}

function stat(interaction: CommandInteraction): void {
  const mainstat = interaction.options.getInteger("stat", true);
  if (mainstat <= 0) {
    interaction.reply({ content: `Please supply a positive mainstat.`, ephemeral: true });
    return;
  }
  const statBlock = StatBlock.fromMainstat(mainstat);
  if (statBlock.level >= 255) {
    interaction.reply(
      `Mainstat ${mainstat.toLocaleString()} (reached at ${statBlock.substat.toLocaleString()} total substat${
        statBlock.substat > 1 ? "s" : ""
      }) reaches maximum level 255.`
    );
    return;
  }
  const nextLevel = StatBlock.fromLevel(statBlock.level + 1);
  interaction.reply(
    `Mainstat ${mainstat.toLocaleString()} (reached at ${statBlock.substat.toLocaleString()} total substats) reaches level ${
      statBlock.level
    }.` +
      ` An additional ${(
        nextLevel.mainstat - statBlock.mainstat
      ).toLocaleString()} mainstat (requiring ${(
        nextLevel.substat - statBlock.substat
      ).toLocaleString()} more substat${
        nextLevel.substat - statBlock.substat > 1 ? "s" : ""
      }) is required to reach level ${nextLevel.level}.`
  );
}

function substat(interaction: CommandInteraction): void {
  const substat = interaction.options.getInteger("substat", true);
  if (substat <= 0) {
    interaction.reply({ content: `Please supply a positive substat.`, ephemeral: true });
    return;
  }
  const statBlock = StatBlock.fromSubstat(substat);
  if (statBlock.level >= 255) {
    interaction.reply(
      `Substat total ${substat.toLocaleString()} reaches mainstat ${statBlock.mainstat.toLocaleString()} and maximum level 255.`
    );
    return;
  }
  const nextLevel = StatBlock.fromLevel(statBlock.level + 1);
  interaction.reply(
    `Substat total ${substat.toLocaleString()} reaches mainstat ${statBlock.mainstat.toLocaleString()} and level ${
      statBlock.level
    }.` +
      ` An additional ${(nextLevel.substat - statBlock.substat).toLocaleString()} total substat${
        nextLevel.substat - statBlock.substat > 1 ? "s are" : " is"
      } required to reach level ${nextLevel.level}.`
  );
}

const command: Command = {
  attach: ({ discordClient }) => {
    discordClient.attachCommand(
      "stat",
      [
        {
          name: "stat",
          description: "The amount of mainstat you are reaching.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      stat,
      "Find the substats and level for a given mainstat total."
    );
    discordClient.attachCommand(
      "substat",
      [
        {
          name: "substat",
          description: "The amount of substat you are reaching.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      substat,
      "Find the mainstat and level for a given substat total"
    );
    discordClient.attachCommand(
      "level",
      [
        {
          name: "level",
          description: "The level you are looking to reach.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      level,
      "Find the stats and substats needed for a given level."
    );
  },
};

export default command;
