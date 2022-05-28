import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, Interaction, Message } from "discord.js";
import { type } from "os";
import { Pool } from "pg";
import { KILLMATCHER, SKILLMATCHER } from "./constants";
import { DiscordClient } from "./discord";
import { KOLClient } from "./kolclient";

type Clan = {
  name: string;
  synonyms: string[];
  id: number;
};

const clans: Clan[] = [
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

let parsedRaids: string[] = [];

type DreadParticipation = {
  kills: number;
  skills: number;
};

const killMap: Map<string, DreadParticipation> = new Map();

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
}

export async function syncToDatabase(databaseClientPool: Pool): Promise<void> {
  parsedRaids = (await databaseClientPool.query("SELECT raid_id FROM tracked_instances;")).rows.map(
    (row) => row.raid_id
  );

  for (let player of (await databaseClientPool.query("SELECT * FROM players;")).rows) {
    killMap.set(player.username, { kills: player.kills, skills: player.skills });
  }
}

async function clanStatus(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  let messageString = "__DREAD STATUS__\n";
  await interaction.deferReply();
  try {
    for (let clan of clans) {
      const overview = await kolClient.getDreadStatusOverview(clan.id);
      const capacitorString = overview.capacitor
        ? `${!overview.castle ? 0 : overview.skills} skill${
            !overview.castle || overview.skills != 1 ? "s" : ""
          } left`
        : "Needs capacitor";
      messageString += `**${clan.name}**: ${overview.forest}/${overview.village}/${overview.castle} (${capacitorString})\n`;
    }
    await interaction.editReply(messageString);
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
  const clan = clans.find(
    (clan) => clan.name.toLowerCase() === clanName || clan.synonyms.includes(clanName)
  );
  if (!clan) {
    interaction.reply({ content: "Clan not recognised.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const status = await kolClient.getDetailedDreadStatus(clan.id);
    let returnString = `__**STATUS UPDATE FOR ${clan.name.toUpperCase()}**__\n`;
    returnString += `${status.overview.forest}/${status.overview.village}/${status.overview.castle} kills remaining.\n\n`;
    returnString += "__FOREST__\n";
    if (status.overview.forest) {
      if (!status.forest.attic) returnString += "**Cabin attic needs unlocking.**\n";
      if (status.forest.watchtower)
        returnString += "Watchtower open, you can grab freddies if you like.\n";
      if (status.forest.auditor) returnString += "~~Auditor's badge claimed.~~\n";
      else returnString += "Auditor's badge available. (Cabin -> Basement -> Lockbox)\n";
      if (status.forest.musicbox) returnString += "~~Intricate music box parts claimed.~~\n";
      else
        returnString +=
          "Intricate music box parts available. (Cabin -> Attic -> Music Box as AT (also banishes spooky from forest))\n";
      if (status.forest.kiwi) returnString += "~~Blood kiwi claimed.~~\n";
      else
        returnString += "Blood kiwi available. (Tree, Root Around -> Look Up + Climb -> Stomp)\n";
      if (status.forest.amber) returnString += "~~Moon-amber claimed.~~\n";
      else
        returnString +=
          "Moon-amber available. (Tree -> Climb -> Shiny Thing (requires muscle class)\n";
    } else returnString += "~~Forest fully cleared.~~\n";
    returnString += "\n";
    returnString += "__VILLAGE__\n";
    if (status.overview.village) {
      if (status.village.schoolhouse) returnString += "Schoolhouse is open, go get your pencils!\n";
      if (status.village.suite) returnString += "Master suite is open, grab some eau de mort?\n";
      if (status.village.hanging) returnString += "~~Hanging complete.~~\n";
      else
        returnString +=
          "Hanging available. (Square, Gallows -> Stand on Trap Door + Gallows -> Pull Lever)\n";
    } else returnString += "~~Village fully cleared.~~\n";
    returnString += "\n";
    returnString += "__CASTLE__\n";
    if (status.overview.castle) {
      if (!status.castle.lab) returnString += "**Lab needs unlocking.**\n";
      else {
        if (status.overview.capacitor)
          returnString += status.overview.skills
            ? `${status.overview.skills} skill${
                status.overview.skills != 1 ? "s" : ""
              } available.\n`
            : "~~All skills claimed.~~\n";
        else returnString += "Machine needs repairing (with skull capacitor).\n";
      }
      if (status.castle.roast) returnString += "~~Dreadful roast claimed.~~\n";
      else returnString += "Dreadful roast available. (Great Hall -> Dining Room -> Grab roast)\n";
      if (status.castle.banana) returnString += "~~Wax banana claimed.~~\n";
      else
        returnString +=
          "Wax banana available. (Great Hall -> Dining Room -> Levitate (requires myst class))\n";
      if (status.castle.agaricus) returnString += "~~Stinking agaricus claimed.~~\n";
      else
        returnString += "Stinking agaricus available. (Dungeons -> Guard Room -> Break off bits)\n";
    } else returnString += "~~Castle fully cleared.~~\n";
    await interaction.editReply(returnString);
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
    const currentKills: Map<string, DreadParticipation> = new Map();
    for (let entry of killMap.entries()) {
      currentKills.set(entry[0], { ...entry[1] });
    }
    await parseCurrentLogs(kolClient, currentKills);
    let skillString = "__SKILLS OWED__\n\n";
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
    skillString += skillArray.sort().join("\n");
    await interaction.editReply(skillString);
  } catch {
    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

async function parseOldLogs(kolClient: KOLClient, databaseClientPool: Pool) {
  const newlyParsedRaids = [];
  for (let clan of clans) {
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
  const databaseClient = await databaseClientPool.connect();
  await databaseClient.query("BEGIN;");
  for (let raid of newlyParsedRaids) {
    await databaseClient.query("INSERT INTO tracked_instances(raid_id) VALUES ($1);", [raid]);
  }
  for (let [player, participation] of killMap.entries()) {
    await databaseClient.query(
      "INSERT INTO players (username, kills, skills) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET kills = $2, skills = $3;",
      [player, participation.kills, participation.skills]
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
  interaction.reply(`Added user "${username}" to players done with skills.`);
  return;
}

async function setNotDone(interaction: CommandInteraction, databaseClientPool: Pool) {
  const username = interaction.options.getString("player");
  await interaction.deferReply();
  await databaseClientPool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET done_with_skills = FALSE;",
    [username]
  );
  interaction.reply(`Removed user "${username}" to players done with skills.`);
  return;
}

async function parseCurrentLogs(
  kolClient: KOLClient,
  mapToUpdate: Map<string, DreadParticipation>
) {
  for (let clan of clans) {
    const raidLog = await kolClient.getRaidLog(clan.id);
    if (!raidLog) throw "Clan inaccessible";
    addParticipationFromRaidLog(raidLog, mapToUpdate);
  }
}

function addParticipationFromRaidLog(
  raidLog: string,
  mapToUpdate: Map<string, DreadParticipation>
): void {
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
