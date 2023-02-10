import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { pluralize } from "../../utils";
import { Command } from "../type";

type Stats = {
  level: number;
  mainstat: number;
  substat: number;
};

const fromLevel = (level: number): Stats => ({
  level,
  mainstat: Math.pow(level, 2) - level * 2 + 5,
  substat: Math.pow(Math.pow(level - 1, 2) + 4, 2),
});

const fromMainstat = (mainstat: number): Stats => ({
  level: 1 + Math.floor(Math.sqrt(Math.max(0, mainstat - 4))),
  mainstat,
  substat: Math.pow(mainstat, 2),
});

const fromSubstat = (substat: number): Stats =>
  fromMainstat(Math.floor(Math.sqrt(Math.max(0, substat))));

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
  const { mainstat, substat } = fromLevel(level);

  interaction.reply(
    `Level ${level} requires ${mainstat.toLocaleString()} mainstat or ${substat.toLocaleString()} total substats.`
  );
}

function statCommand(interaction: CommandInteraction): void {
  const mainstat = interaction.options.getInteger("stat", true);
  if (mainstat <= 0) {
    interaction.reply({ content: `Please supply a positive mainstat.`, ephemeral: true });
    return;
  }
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

function substat(interaction: CommandInteraction): void {
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
      statCommand,
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
