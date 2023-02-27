import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";
import { pluralize } from "../../utils";
import { DREAD_CLANS, PlayerData, clanState } from "./_clans";
import {
  JoinClanError,
  RaidLogMissingError,
  getFinishedRaidLog,
  getMissingRaidLogs,
  getRaidLog,
} from "./_dread";

const KILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+defeated\D+(\d+)/;
const SKILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+used the machine/;

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Get a list of everyone currently elgible for Dreadsylvania skills.");

async function parseCurrentLogs(mapToUpdate: Map<string, PlayerData>) {
  for (let clan of DREAD_CLANS) {
    const raidLog = await getRaidLog(clan.id);
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
    const raidsToParse = (await getMissingRaidLogs(clan.id, clanState.parsedRaids)).filter(
      (id) => !clanState.parsedRaids.includes(id)
    );
    for (let raid of raidsToParse) {
      const raidLog = await getFinishedRaidLog(raid);
      addParticipationFromRaidLog(raidLog, clanState.killMap);
      clanState.parsedRaids.push(raid);
      newlyParsedRaids.push(raid);
    }
  }
  for (let [player, participation] of clanState.killMap.entries()) {
    if (!participation.id) {
      participation.id = (await kolClient.getPartialPlayerFromName(player))?.id ?? 0;
    }
  }

  const createTrackedInstances = prisma.tracked_instances.createMany({
    data: newlyParsedRaids.map((r) => ({ raid_id: r })),
    skipDuplicates: true,
  });

  const upsertPlayers = [...clanState.killMap.entries()].map(([player, participation]) =>
    prisma.players.upsert({
      where: { username: player },
      update: { kills: participation.kills, skills: participation.skills },
      create: {
        username: player,
        kills: participation.kills,
        skills: participation.skills,
        user_id: participation.id?.toString(),
      },
    })
  );

  await prisma.$transaction([createTrackedInstances, ...upsertPlayers]);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  // const doneWithSkillsList = (
  //   await pool.query("SELECT username FROM players WHERE done_with_skills = TRUE;")
  // ).rows.map((result) => result.username.toLowerCase());
  const doneWithSkillsList = (
    await prisma.players.findMany({ where: { done_with_skills: true }, select: { username: true } })
  ).map((player) => player.username);
  try {
    await parseOldLogs();
    const currentKills: Map<string, PlayerData> = new Map();
    for (let entry of clanState.killMap.entries()) {
      currentKills.set(entry[0], { ...entry[1] });
    }
    await parseCurrentLogs(currentKills);
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
    let reason = "";
    if (error instanceof JoinClanError) {
      reason = "I was unable to join that clan";
    } else if (error instanceof RaidLogMissingError) {
      reason = "I couldn't see raid logs in that clan for some reason";
    } else {
      reason =
        "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in.";
    }
    await interaction.editReply(reason);
  }
}
