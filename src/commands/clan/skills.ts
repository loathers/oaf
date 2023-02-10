import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { Pool } from "pg";
import { clanState, DREAD_CLANS, PlayerData } from "../../clans";
import { KOLClient } from "../../kol";
import { Command } from "../type";

const KILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+defeated\D+(\d+)/;
const SKILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+used the machine/;

async function parseCurrentLogs(kolClient: KOLClient, mapToUpdate: Map<string, PlayerData>) {
  for (let clan of DREAD_CLANS) {
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
            brainiac: participation.brainiac,
          });
        } else {
          mapToUpdate.set(matchedKill[1], {
            kills: parseInt(matchedKill[2]),
            skills: 0,
            brainiac: false,
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
            brainiac: participation.brainiac,
          });
        } else {
          mapToUpdate.set(matchedSkill[1], {
            kills: 0,
            skills: 1,
            brainiac: false,
          });
        }
      }
    }
  }
}

async function parseOldLogs(kolClient: KOLClient, databasePool: Pool) {
  const newlyParsedRaids = [];
  for (let clan of DREAD_CLANS) {
    const raidsToParse = (
      await kolClient.getMissingRaidLogs(clan.id, clanState.parsedRaids)
    ).filter((id) => !clanState.parsedRaids.includes(id));
    for (let raid of raidsToParse) {
      const raidLog = await kolClient.getFinishedRaidLog(raid);
      addParticipationFromRaidLog(raidLog, clanState.killMap);
      clanState.parsedRaids.push(raid);
      newlyParsedRaids.push(raid);
    }
  }
  for (let [player, participation] of clanState.killMap.entries()) {
    if (!participation.id) {
      participation.id = (await kolClient.getBasicDetailsForUser(player)).id;
    }
  }
  const databaseClient = await databasePool.connect();
  await databaseClient.query("BEGIN;");
  for (let raid of newlyParsedRaids) {
    await databaseClient.query("INSERT INTO tracked_instances(raid_id) VALUES ($1);", [raid]);
  }
  for (let [player, participation] of clanState.killMap.entries()) {
    await databaseClient.query(
      "INSERT INTO players (username, kills, skills, user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET kills = $2, skills = $3, user_id = $4;",
      [player, participation.kills, participation.skills, participation.id]
    );
  }
  await databaseClient.query("COMMIT;");
  databaseClient.release();
}

async function getSkills(
  interaction: CommandInteraction,
  kolClient: KOLClient,
  databasePool: Pool
): Promise<void> {
  await interaction.deferReply();
  const doneWithSkillsList = (
    await databasePool.query("SELECT username FROM players WHERE done_with_skills = TRUE;")
  ).rows.map((result) => result.username.toLowerCase());
  try {
    await parseOldLogs(kolClient, databasePool);
    const currentKills: Map<string, PlayerData> = new Map();
    for (let entry of clanState.killMap.entries()) {
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

async function setDone(interaction: CommandInteraction, databasePool: Pool) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await databasePool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, TRUE) ON CONFLICT (username) DO UPDATE SET done_with_skills = TRUE;",
    [username]
  );
  interaction.editReply(`Added user "${username}" to the list of players done with skills.`);
  return;
}

async function setNotDone(interaction: CommandInteraction, databasePool: Pool) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await databasePool.query(
    "INSERT INTO players (username, done_with_skills) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET done_with_skills = FALSE;",
    [username]
  );
  interaction.editReply(`Removed user "${username}" from the list of players done with skills.`);
  return;
}

const command: Command = {
  attach: ({ discordClient, kolClient, databasePool }) => {
    discordClient.attachCommand(
      "skills",
      [],
      (interaction: CommandInteraction) => getSkills(interaction, kolClient, databasePool),
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
      (interaction: CommandInteraction) => setDone(interaction, databasePool),
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
      (interaction: CommandInteraction) => setNotDone(interaction, databasePool),
      "Set a player as not done with Dreadsylvania skills."
    );
  },
};

export default command;
