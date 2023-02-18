import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Pool } from "pg";

import { DREAD_CLANS, PlayerData, clanState } from "../../clans";
import { pool } from "../../db";
import { KoLClient, client } from "../../kol";
import { pluralize } from "../../utils";

const KILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+defeated\D+(\d+)/;
const SKILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+used the machine/;

async function parseCurrentLogs(kolClient: KoLClient, mapToUpdate: Map<string, PlayerData>) {
  for (let clan of DREAD_CLANS) {
    const raidLog = await kolClient.getRaidLog(clan.id);
    if (!raidLog) throw "Clan inaccessible";
    addParticipationFromRaidLog(raidLog, mapToUpdate);
  }
}

function addParticipantSkills(raidLog: string, mapToUpdate: Map<string, PlayerData>) {
  const skillLines = raidLog.toLowerCase().match(new RegExp(SKILLMATCHER, "g"));

  for (let skill of skillLines || []) {
    const matchedSkill = skill.match(SKILLMATCHER);
    if (!matchedSkill) continue;

    const participation = mapToUpdate.get(matchedSkill[1]);

    mapToUpdate.set(matchedSkill[1], {
      kills: participation?.kills ?? 0,
      skills: (participation?.skills ?? 0) + 1,
      id: participation?.id,
      brainiac: participation?.brainiac ?? false,
    });
  }
}

function addParticipantKills(raidLog: string, mapToUpdate: Map<string, PlayerData>) {
  const killLines = raidLog.toLowerCase().match(new RegExp(KILLMATCHER, "g"));
  for (let kill of killLines || []) {
    const matchedKill = kill.match(KILLMATCHER);
    if (!matchedKill) continue;

    const participation = mapToUpdate.get(matchedKill[1]);

    mapToUpdate.set(matchedKill[1], {
      kills: (participation?.kills ?? 0) + parseInt(matchedKill[2]),
      skills: participation?.skills ?? 0,
      id: participation?.id,
      brainiac: participation?.brainiac ?? false,
    });
  }
}

function addParticipationFromRaidLog(raidLog: string, mapToUpdate: Map<string, PlayerData>): void {
  addParticipantKills(raidLog, mapToUpdate);
  addParticipantSkills(raidLog, mapToUpdate);
}

async function parseOldLogs() {
  const newlyParsedRaids = [];
  for (let clan of DREAD_CLANS) {
    const raidsToParse = (await client.getMissingRaidLogs(clan.id, clanState.parsedRaids)).filter(
      (id) => !clanState.parsedRaids.includes(id)
    );
    for (let raid of raidsToParse) {
      const raidLog = await client.getFinishedRaidLog(raid);
      addParticipationFromRaidLog(raidLog, clanState.killMap);
      clanState.parsedRaids.push(raid);
      newlyParsedRaids.push(raid);
    }
  }
  for (let [player, participation] of clanState.killMap.entries()) {
    if (!participation.id) {
      participation.id = (await client.getBasicDetailsForUser(player)).id;
    }
  }
  const databaseClient = await pool.connect();
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

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const doneWithSkillsList = (
    await pool.query("SELECT username FROM players WHERE done_with_skills = TRUE;")
  ).rows.map((result) => result.username.toLowerCase());
  try {
    await parseOldLogs();
    const currentKills: Map<string, PlayerData> = new Map();
    for (let entry of clanState.killMap.entries()) {
      currentKills.set(entry[0], { ...entry[1] });
    }
    await parseCurrentLogs(client, currentKills);
    let skillArray = [];
    for (let entry of currentKills.entries()) {
      if (!doneWithSkillsList.includes(entry[0])) {
        const owedSkills = Math.floor((entry[1].kills + 450) / 900) - entry[1].skills;
        if (owedSkills > 0) {
          skillArray.push(
            `${entry[0].charAt(0).toUpperCase() + entry[0].slice(1)}: ${pluralize(
              owedSkills,
              "skill"
            )}.`
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

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Get a list of everyone currently elgible for Dreadsylvania skills.");
