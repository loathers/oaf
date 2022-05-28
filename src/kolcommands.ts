import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, Message, MessageEmbed } from "discord.js";
import { PATH_MAPPINGS } from "./constants";
import { DiscordClient } from "./discord";
import { KOLClient } from "./kolclient";

export function attachKoLCommands(client: DiscordClient, kolClient: KOLClient) {
  client.attachCommand(
    "item",
    [
      {
        name: "droprate",
        description: "The droprate of the item in question.",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
    item,
    "Find the +item drop required to cap a drop."
  );
  client.attachCommand(
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
  client.attachCommand(
    "stat",
    [
      {
        name: "droprate",
        description: "The amount of mainstat you are reaching.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    stat,
    "Find the substats and level for a given mainstat total."
  );
  client.attachCommand(
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
  client.attachCommand(
    "fairy",
    [
      {
        name: "weight",
        description: "The weight of the fairy.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    fairy,
    "Find the +item drop supplied by a fairy of a given weight."
  );
  client.attachCommand(
    "leprechaun",
    [
      {
        name: "weight",
        description: "The weight of the leprechaun.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    lep,
    "Find the +meat drop supplied by a leprechaun of a given weight."
  );
  client.attachCommand(
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
  );
  client.attachCommand(
    "reversefairy",
    [
      {
        name: "item",
        description: "The item drop % you are looking to get from your fairy.",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
    reverseFairy,
    "Find the weight necessary to supply a given item drop % from a fairy."
  );
  client.attachCommand(
    "reverseleprechaun",
    [
      {
        name: "meat",
        description: "The meat drop % you are looking to get from your leprechaun.",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
    reverseLep,
    "Find the weight necessary to supply a given meat drop % from a leprechaun."
  );
  client.attachCommand(
    "leaderboard",
    [
      {
        name: "leaderboard",
        description: "The name or id of the leaderboard you want to display.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction: CommandInteraction) => leaderboard(interaction, kolClient),
    "Display the specified leaderboard."
  );
}

function item(interaction: CommandInteraction): void {
  const drop = interaction.options.getNumber("droprate", true);
  if (drop <= 0) {
    interaction.reply({ content: `Please supply a positive droprate.`, ephemeral: true });
    return;
  }
  if (drop > 99.9) {
    interaction.reply(`A 100% drop does not require any item drop bonus to cap.`);
    return;
  }
  interaction.reply(
    `A ${Number(drop.toFixed(1))}% drop requires a +${
      Math.ceil(10000 / Number(drop.toFixed(1))) - 100
    }% item drop bonus to cap.`
  );
}

function fairy(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive fairy weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb fairy provides +${Number(
      (Math.sqrt(55 * weight) + weight - 3).toFixed(2)
    )}% item drop. (+${Number(
      (Math.sqrt(55 * weight * 1.25) + weight * 1.25 - 3).toFixed(2)
    )}% for Jumpsuited Hound Dog)`
  );
}

function lep(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive leprechaun weight.`, ephemeral: true });
    return;
  }
  interaction.reply(
    `A ${weight}lb leprechaun provides +${Number(
      (2 * (Math.sqrt(55 * weight) + weight - 3)).toFixed(2)
    )}% meat drop. (+${Number(
      (2 * (Math.sqrt(55 * weight * 1.25) + weight * 1.25 - 3)).toFixed(2)
    )}% for Hobo Monkey)`
  );
}

function volley(interaction: CommandInteraction): void {
  const weight = interaction.options.getInteger("weight", true);
  if (weight <= 0) {
    interaction.reply({ content: `Please supply a positive volleyball weight.`, ephemeral: true });
    return;
  }
  interaction.reply(`A ${weight}lb volleyball provides +${2 + 0.2 * weight} substats per combat.`);
}

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
    } requires ${statBlock.mainstat.toLocaleString()} mainstat or ${statBlock.substat.toLocaleString()} total substats..`
  );
}

function stat(interaction: CommandInteraction): void {
  const mainstat = interaction.options.getInteger("mainstat", true);
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

function reverseFairy(interaction: CommandInteraction): void {
  const itemDrop = interaction.options.getNumber("item", true);
  if (itemDrop <= 0) {
    interaction.reply({ content: "Please supply a positive item drop value.", ephemeral: true });
    return;
  }
  interaction.reply(
    `To get ${itemDrop}% item drop from a fairy, it should be weigh at least ${(
      (2 * itemDrop + 61 - Math.sqrt(220 * itemDrop + 3685)) /
      2
    ).toFixed(1)} lbs, or be a Jumpsuited Hounddog that weighs at least ${(
      (2 * itemDrop + 61 - Math.sqrt(220 * itemDrop + 3685)) /
      2 /
      1.25
    ).toFixed(1)} lbs.`
  );
}

function reverseLep(interaction: CommandInteraction): void {
  const meatDrop = interaction.options.getNumber("meat", true);
  if (meatDrop <= 0) {
    interaction.reply({ content: "Please supply a positive meat drop value.", ephemeral: true });
    return;
  }
  interaction.reply(
    `To get ${meatDrop}% meat drop from a leprechaun, it should weigh at least ${(
      (meatDrop + 61 - Math.sqrt(110 * meatDrop + 3685)) /
      2
    ).toFixed(1)} lbs, or be a Hobo Monkey that weighs at least ${(
      (meatDrop + 61 - Math.sqrt(110 * meatDrop + 3685)) /
      2 /
      1.25
    ).toFixed(1)} lbs.`
  );
}

async function leaderboard(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  const boardref = interaction.options.getString("board", true);

  let board =
    PATH_MAPPINGS.get(boardref.toLowerCase().replace(/\W/g, "")) || parseInt(boardref) || 0;
  if (board > 2000) board = board === new Date(Date.now()).getFullYear() ? 999 : 998 + 2015 - board;
  await interaction.deferReply();
  const leaderboardInfo = await kolClient.getLeaderboard(board);
  if (!leaderboardInfo || leaderboardInfo.name === "Weird Leaderboards") {
    interaction.editReply("I don't think that's a real leaderboard, sorry.");
  } else if (leaderboardInfo.boards.length === 0) {
    interaction.editReply({
      content: null,
      embeds: [
        new MessageEmbed()
          .setTitle(leaderboardInfo.name || "...")
          .setDescription("I wasn't able to understand this leaderboard, sorry.")
          .setFooter({
            text: "Problems? Message DocRostov#7004 on discord.",
            iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
          }),
      ],
    });
  } else {
    interaction.editReply({
      content: null,
      embeds: [
        new MessageEmbed()
          .setTitle(leaderboardInfo.name || "...")
          .addFields(
            leaderboardInfo.boards.map((subboard) => {
              const runs = subboard.runs.map(
                (run) => `${run.player} - ${run.days ? `${run.days}/` : ""}${run.turns}`
              );
              if (runs.length > 12) runs.splice(12, 0, "🥉 Bronze Buttons 🥉");
              if (runs.length > 1) runs.splice(1, 0, "🥈 Silver Moons 🥈");
              if (runs.length) runs.splice(0, 0, "🥇 Gold Star 🥇");
              return {
                title: subboard.name || "...",
                name: subboard.name || "...",
                value: runs.join("\n").slice(0, 1024) || "No runs yet!",
                inline: true,
              };
            })
          )
          .setFooter({
            text: "Problems? Message DocRostov#7004 on discord.",
            iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
          }),
      ],
    });
  }
}
