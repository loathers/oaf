import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, GuildMemberRoleManager, MessageEmbed } from "discord.js";
import { Pool } from "pg";
import { DREAD_BOSS_MAPPINGS, KILLMATCHER, SKILLMATCHER } from "./constants";
import { DiscordClient } from "./discord";
import { KOLClient } from "./kolclient";

type Clan = {
  name: string;
  synonyms: string[];
  id: number;
};

const dreadClans: Clan[] = [
  {
    name: "Collaborative Dungeon Running 1",
    synonyms: ["cdr1", "1"],
    id: 2047008362,
  },
  {
    name: "Collaborative Dungeon Running 2",
    synonyms: ["cdr2", "2"],
    id: 2047008363,
  },
];

const nonDreadClans: Clan[] = [
  {
    name: "Collaborative Dungeon Running Central",
    synonyms: ["central"],
    id: 2047008364,
  },
];

const allClans = dreadClans.concat(nonDreadClans);

let parsedRaids: string[] = [];

type PlayerData = {
  id?: string;
  kills: number;
  skills: number;
};

const killMap: Map<string, PlayerData> = new Map();

export function attachClanCommands(
  discordClient: DiscordClient,
  kolClient: KOLClient,
  databaseClientPool: Pool
) {
  discordClient.attachCommand(
    "status",
    [],
    (interaction: CommandInteraction) => clanStatus(interaction, kolClient),
    "Get the current status of all monitored Dreadsylvania instances."
  );
  discordClient.attachCommand(
    "clan",
    [
      {
        name: "clan",
        description: "The clan whose status you wish to check.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction: CommandInteraction) => detailedClanStatus(interaction, kolClient),
    "Get a detailed current status of the specified Dreadsylvania instance."
  );
  discordClient.attachCommand(
    "skills",
    [],
    (interaction: CommandInteraction) => getSkills(interaction, kolClient, databaseClientPool),
    "Get a list of everyone currently elgible for Dreadsylvania skills."
  );
  discordClient.attachCommand(
    "done",
    [
      {
        name: "player",
        description: "The player to set as done with skills.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction: CommandInteraction) => setDone(interaction, databaseClientPool),
    "Set a player as done with Dreadsylvania skills."
  );
  discordClient.attachCommand(
    "undone",
    [
      {
        name: "player",
        description: "The player to set as not done with skills.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction: CommandInteraction) => setNotDone(interaction, databaseClientPool),
    "Set a player as not done with Dreadsylvania skills."
  );
  discordClient.attachCommand(
    "brains",
    [],
    (interaction: CommandInteraction) => getBrains(interaction, kolClient),
    "Find players whose brains can be drained for Dreadsylvania skills."
  );
  discordClient.attachCommand(
    "whitelist",
    [
      {
        name: "player",
        description: "The name of the player to add to the whitelists.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction: CommandInteraction) => whitelist(interaction, kolClient),
    "Adds a player to the Dreadsylvania clan whitelists."
  );
}

export async function syncToDatabase(databaseClientPool: Pool): Promise<void> {
  parsedRaids = (await databaseClientPool.query("SELECT raid_id FROM tracked_instances;")).rows.map(
    (row) => row.raid_id
  );

  for (let player of (await databaseClientPool.query("SELECT * FROM players;")).rows) {
    killMap.set(player.username, {
      kills: player.kills,
      skills: player.skills,
      id: player.user_id,
    });
  }
}

async function clanStatus(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  let messageString = "";
  await interaction.deferReply();
  try {
    for (let clan of dreadClans) {
      const overview = await kolClient.getDreadStatusOverview(clan.id);
      const capacitorString = overview.capacitor
        ? `${!overview.castle ? 0 : overview.skills} skill${
            !overview.castle || overview.skills != 1 ? "s" : ""
          } left`
        : "Needs capacitor";
      messageString += `**${clan.name}**: ${overview.forest}/${overview.village}/${overview.castle} (${capacitorString})\n`;
    }
    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Dread Status",
          description: messageString,
        },
      ],
    });
  } catch {
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

async function detailedClanStatus(
  interaction: CommandInteraction,
  kolClient: KOLClient
): Promise<void> {
  const clanName = interaction.options.getString("clan", true);
  const clan = dreadClans.find(
    (clan) => clan.name.toLowerCase() === clanName || clan.synonyms.includes(clanName)
  );
  if (!clan) {
    interaction.reply({ content: "Clan not recognised.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const status = await kolClient.getDetailedDreadStatus(clan.id);
    const embed = new MessageEmbed().setTitle(`Status update for ${clan.name}`);
    embed.setDescription(
      `Kills remaining: ${status.overview.forest}/${status.overview.village}/${status.overview.castle}`
    );
    let forestString = "";
    if (status.overview.forest) {
      if (!status.forest.attic) forestString += "**Cabin attic needs unlocking.**\n";
      if (status.forest.watchtower)
        forestString += "Watchtower open, you can grab freddies if you like.\n";
      if (status.forest.auditor) forestString += "~~Auditor's badge claimed.~~\n";
      else
        forestString +=
          "Auditor's badge available.\n\u00a0\u00a0*(Cabin => Basement => Lockbox)*\n";
      if (status.forest.musicbox) forestString += "~~Intricate music box parts claimed.~~\n";
      else
        forestString +=
          "Intricate music box parts available.\n\u00a0\u00a0*(Cabin => Attic => Music Box)*\n\u00a0\u00a0*(Requires Accordion Thief)*\n\u00a0\u00a0*(Also banishes spooky from forest)*\n";
      if (status.forest.kiwi) forestString += "~~Blood kiwi claimed.~~\n";
      else
        forestString +=
          "Blood kiwi available.\n\u00a0\u00a0*(Tree, Root Around => Look Up + Climb => Stomp)*\n";
      if (status.forest.amber) forestString += "~~Moon-amber claimed.~~\n";
      else
        forestString +=
          "Moon-amber available.\n\u00a0\u00a0*(Tree => Climb => Shiny Thing)*\n\u00a0\u00a0*(Requires muscle class)*\n";
    } else forestString += "~~Forest fully cleared.~~\n";
    let villageString = "";
    if (status.overview.village) {
      if (status.village.schoolhouse)
        villageString += "Schoolhouse is open, go get your pencils!\n";
      if (status.village.suite) villageString += "Master suite is open, grab some eau de mort?\n";
      if (status.village.hanging) villageString += "~~Hanging complete.~~\n";
      else
        villageString +=
          "Hanging available.\n\u00a0\u00a0*(Square, Gallows => Stand on Trap Door + Gallows => Pull Lever)*\n";
    } else villageString += "~~Village fully cleared.~~\n";
    let castleString = "";
    if (status.overview.castle) {
      if (!status.castle.lab) castleString += "**Lab needs unlocking.**\n";
      else {
        if (status.overview.capacitor)
          castleString += status.overview.skills
            ? `${status.overview.skills} skill${
                status.overview.skills != 1 ? "s" : ""
              } available.\n`
            : "~~All skills claimed.~~\n";
        else castleString += "Machine needs repairing (with skull capacitor).\n";
      }
      if (status.castle.roast) castleString += "~~Dreadful roast claimed.~~\n";
      else
        castleString +=
          "Dreadful roast available.\n\u00a0\u00a0*(Great Hall => Dining Room => Grab roast)*\n";
      if (status.castle.banana) castleString += "~~Wax banana claimed.~~\n";
      else
        castleString +=
          "Wax banana available.\n\u00a0\u00a0*(Great Hall => Dining Room => Levitate)*\n\u00a0\u00a0*(Requires myst class)*\n";
      if (status.castle.agaricus) castleString += "~~Stinking agaricus claimed.~~\n";
      else
        castleString +=
          "Stinking agaricus available.\n\u00a0\u00a0*(Dungeons => Guard Room => Break off bits)*\n";
    } else castleString += "~~Castle fully cleared.~~\n";
    embed.addFields([
      {
        name: `__**Forest**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[0])})`,
        value: forestString,
        inline: true,
      },
      {
        name: `__**Village**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[1])})`,
        value: villageString,
        inline: true,
      },
      {
        name: `__**Castle**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[2])})`,
        value: castleString,
        inline: true,
      },
    ]);
    embed.setFooter({
      text: "Problems? Message DocRostov#7004 on discord.",
      iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
    });
    await interaction.editReply({ content: null, embeds: [embed] });
  } catch {
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

async function getSkills(
  interaction: CommandInteraction,
  kolClient: KOLClient,
  databaseClientPool: Pool
): Promise<void> {
  await interaction.deferReply();
  const doneWithSkillsList = (
    await databaseClientPool.query("SELECT username FROM players WHERE done_with_skills = TRUE;")
  ).rows.map((result) => result.username.toLowerCase());
  try {
    await parseOldLogs(kolClient, databaseClientPool);
    const currentKills: Map<string, PlayerData> = new Map();
    for (let entry of killMap.entries()) {
      currentKills.set(entry[0], { ...entry[1] });
    }
    await parseCurrentLogs(kolClient, currentKills);
    let skillArray = [];
    for (let entry of currentKills.entries()) {
      if (!doneWithSkillsList.includes(entry[0])) {
        const owedSkills = Math.floor((entry[1].kills + 450) / 900) - entry[1].skills;
        if (owedSkills > 0) {
          skillArray.push(
            `${entry[0].charAt(0).toUpperCase() + entry[0].slice(1)}: ${owedSkills} skill${
              owedSkills > 1 ? "s" : ""
            }.`
          );
        }
      }
    }
    skillArray.sort();

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Skills owed",
          fields: [
            {
              name: "\u200b",
              value: "\u200b" + skillArray.slice(0, Math.ceil(skillArray.length / 3)).join("\n"),
              inline: true,
            },
            {
              name: "\u200b",
              value:
                "\u200b" +
                skillArray
                  .slice(Math.ceil(skillArray.length / 3), Math.ceil(2 * (skillArray.length / 3)))
                  .join("\n"),
              inline: true,
            },
            {
              name: "\u200b",
              value: "\u200b" + skillArray.slice(Math.ceil(2 * (skillArray.length / 3))).join("\n"),
              inline: true,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.log(error);
    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

async function parseOldLogs(kolClient: KOLClient, databaseClientPool: Pool) {
  const newlyParsedRaids = [];
  for (let clan of dreadClans) {
    const raidsToParse = (await kolClient.getMissingRaidLogs(clan.id, parsedRaids)).filter(
      (id) => !parsedRaids.includes(id)
    );
    for (let raid of raidsToParse) {
      const raidLog = await kolClient.getFinishedRaidLog(raid);
      addParticipationFromRaidLog(raidLog, killMap);
      parsedRaids.push(raid);
      newlyParsedRaids.push(raid);
    }
  }
  for (let [player, participation] of killMap.entries()) {
    if (!participation.id) {
      participation.id = (await kolClient.getBasicDetailsForUser(player)).id;
    }
  }
  const databaseClient = await databaseClientPool.connect();
  await databaseClient.query("BEGIN;");
  for (let raid of newlyParsedRaids) {
    await databaseClient.query("INSERT INTO tracked_instances(raid_id) VALUES ($1);", [raid]);
  }
  for (let [player, participation] of killMap.entries()) {
    await databaseClient.query(
      "INSERT INTO players (username, kills, skills, user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET kills = $2, skills = $3, user_id = $4;",
      [player, participation.kills, participation.skills, participation.id]
    );
  }
  await databaseClient.query("COMMIT;");
  databaseClient.release();
}

async function setDone(interaction: CommandInteraction, databaseClientPool: Pool) {
  const username = interaction.options.getString("player");
  await interaction.deferReply();
  await databaseClientPool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, TRUE) ON CONFLICT (username) DO UPDATE SET done_with_skills = TRUE;",
    [username]
  );
  interaction.editReply(`Added user "${username}" to the list of players done with skills.`);
  return;
}

async function setNotDone(interaction: CommandInteraction, databaseClientPool: Pool) {
  const username = interaction.options.getString("player");
  await interaction.deferReply();
  await databaseClientPool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET done_with_skills = FALSE;",
    [username]
  );
  interaction.editReply(`Removed user "${username}" from the list of players done with skills.`);
  return;
}

async function parseCurrentLogs(kolClient: KOLClient, mapToUpdate: Map<string, PlayerData>) {
  for (let clan of dreadClans) {
    const raidLog = await kolClient.getRaidLog(clan.id);
    if (!raidLog) throw "Clan inaccessible";
    addParticipationFromRaidLog(raidLog, mapToUpdate);
  }
}

function addParticipationFromRaidLog(raidLog: string, mapToUpdate: Map<string, PlayerData>): void {
  const skillLines = raidLog.toLowerCase().match(new RegExp(SKILLMATCHER, "g"));
  const killLines = raidLog.toLowerCase().match(new RegExp(KILLMATCHER, "g"));
  if (killLines) {
    for (let kill of killLines) {
      const matchedKill = kill.match(KILLMATCHER);
      if (matchedKill) {
        const participation = mapToUpdate.get(matchedKill[1]);
        if (participation) {
          mapToUpdate.set(matchedKill[1], {
            kills: participation.kills + parseInt(matchedKill[2]),
            skills: participation.skills,
            id: participation.id,
          });
        } else {
          mapToUpdate.set(matchedKill[1], {
            kills: parseInt(matchedKill[2]),
            skills: 0,
          });
        }
      }
    }
  }
  if (skillLines) {
    for (let skill of skillLines) {
      const matchedSkill = skill.match(SKILLMATCHER);
      if (matchedSkill) {
        const participation = mapToUpdate.get(matchedSkill[1]);
        if (participation) {
          mapToUpdate.set(matchedSkill[1], {
            kills: participation.kills,
            skills: participation.skills + 1,
            id: participation.id,
          });
        } else {
          mapToUpdate.set(matchedSkill[1], {
            kills: 0,
            skills: 1,
          });
        }
      }
    }
  }
}

async function getBrains(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  interaction.deferReply();
  const baseClasses = [
    "Seal Clubber",
    "Turtle Tamer",
    "Pastamancer",
    "Sauceror",
    "Disco Bandit",
    "Accordion Thief",
  ];
  const classMap: Map<string, string[]> = new Map();
  for (let player of killMap.keys()) {
    if (!!killMap.get(player)?.skills) {
      const details = await kolClient.getBasicDetailsForUser(player);
      if (details.level >= 15) {
        if (!classMap.has(details.class)) {
          classMap.set(details.class, []);
        }
        classMap.get(details.class)?.push(player);
      }
    }
  }
  interaction.editReply({
    content: null,
    embeds: [
      {
        title: "Potentially available brains",
        description:
          "Somersaulter, kenny kamAKAzi, and 3BH can pilot dread multis for any class of brain, subject to multi restrictions.",
        fields: baseClasses.map((playerClass) => {
          if (!classMap.has(playerClass)) {
            return {
              name: `**__${playerClass}__**`,
              value: "None available.",
              inline: true,
            };
          }
          return {
            name: `**__${playerClass}__**`,
            value: (classMap.get(playerClass) as string[])
              .sort()
              .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
              .join("\n"),
            inline: true,
          };
        }),
      },
    ],
  });
}

async function whitelist(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  const roles = interaction.member?.roles as GuildMemberRoleManager;
  if (
    roles.cache.some(
      (role) => role.id === "473316929768128512" || role.id === "466624206126448641"
    ) ||
    interaction.user.id === "145957353487990784"
  ) {
    const player = interaction.options.getString("player", true);
    interaction.deferReply();
    const playerData = await kolClient.getBasicDetailsForUser(player);
    if (!playerData.id) {
      interaction.editReply({ content: "Player not found." });
      return;
    }
    for (let clan of allClans) {
      await kolClient.addToWhitelist(playerData.id, clan.id);
    }
    interaction.editReply({
      content: `Added player ${player} (#${playerData.id}) to all managed clan whitelists.`,
    });
  } else {
    interaction.reply({
      content: "You are not permitted to edit clan whitelists.",
      ephemeral: true,
    });
  }
}
