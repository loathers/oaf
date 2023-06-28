import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { columnsByMaxLength, formatPlayer, notNull, pluralize } from "../../utils/index.js";
import { DREAD_CLANS } from "./_clans.js";
import {
  JoinClanError,
  RaidLogMissingError,
  getFinishedRaidLog,
  getMissingRaidLogs,
  getRaidLog,
} from "./_dread.js";

const SKILL_KILL_MATCHER = /([A-Za-z0-9\-_ ]+)\s+\(#(\d+)\)\s+(defeated\D+(\d+)|used the machine)/i;

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Get a list of everyone currently elgible for Dreadsylvania skills.");

type ParticipationData = { skills: number; kills: number };
export type Participation = Map<number, ParticipationData>;

function addParticipation(
  a: Participation,
  playerId: number,
  { skills, kills }: Partial<ParticipationData>
) {
  const existing = a.get(playerId) || { skills: 0, kills: 0 };
  a.set(playerId, {
    skills: existing.skills + (skills || 0),
    kills: existing.kills + (kills || 0),
  });
}

function mergeParticipation(a: Participation, b: Participation) {
  const merged = new Map(a);

  for (const [playerId, data] of b) {
    addParticipation(merged, playerId, data);
  }

  return merged;
}

async function getParticipationFromCurrentRaid() {
  const raidLogs = await Promise.all(DREAD_CLANS.map((clan) => getRaidLog(clan.id)));

  return raidLogs.reduce(
    (p, log) => mergeParticipation(p, getParticipationFromRaidLog(log)),
    new Map() as Participation
  );
}

export function getParticipationFromRaidLog(raidLog: string) {
  const lines = raidLog.match(new RegExp(SKILL_KILL_MATCHER, "gi")) || [];

  const participation: Participation = new Map();

  lines
    .map((l) => l.match(SKILL_KILL_MATCHER))
    .filter(notNull)
    .map(
      (m) =>
        [
          parseInt(m[2]),
          m[3].startsWith("defeated") ? "kills" : "skills",
          parseInt(m[4] || "1"),
        ] as const
    )
    .forEach(([playerId, type, num]) => {
      addParticipation(participation, playerId, { [type]: num });
    });

  return participation;
}

async function parseOldLogs() {
  const parsedRaids = (await prisma.raid.findMany({ select: { id: true } })).map(({ id }) => id);

  // Determine all the raid ids that are yet to be passed
  const raidsToParse = (
    await Promise.all(DREAD_CLANS.map((clan) => getMissingRaidLogs(clan.id, parsedRaids)))
  )
    .flat()
    .filter((id) => !parsedRaids.includes(id));

  let participation: Participation = new Map();

  // Parse each raid and extract the player participation
  for (const raidId of raidsToParse) {
    const raidLog = await getFinishedRaidLog(raidId);
    participation = mergeParticipation(participation, getParticipationFromRaidLog(raidLog));
  }

  await prisma.$transaction(async () => {
    await prisma.raid.createMany({
      data: raidsToParse.map((r) => ({ id: r })),
      skipDuplicates: true,
    });

    for (const [playerId, { kills, skills }] of participation.entries()) {
      const player = await prisma.player.findUnique({ where: { playerId } });

      if (!player) {
        const playerName = await kolClient.getPlayerNameFromId(playerId);
        if (!playerName) return;
        prisma.player.create({
          data: {
            playerId,
            playerName,
            kills,
            skills,
          },
        });
        return;
      }

      prisma.player.update({
        where: { playerId },
        data: {
          kills: {
            increment: kills,
          },
          skills: {
            increment: skills,
          },
        },
      });
    }
  });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    await parseOldLogs();

    const players = new Map(
      (await prisma.player.findMany({})).map((p) => [p.playerId, p] as const)
    );

    const participation = mergeParticipation(players, await getParticipationFromCurrentRaid());

    const skillsOwed = [...participation.entries()]
      .filter(([playerId]) => players.get(playerId)?.doneWithSkills !== true)
      .map(
        ([playerId, { skills, kills }]) =>
          [playerId, Math.floor((kills + 450) / 900) - skills] as const
      )
      .filter(([, owed]) => owed > 0)
      .sort(([, a], [, b]) => b - a)
      .map(
        ([playerId, owed]) =>
          `${formatPlayer(players.get(playerId), playerId)}: ${pluralize(owed, "skill")}.`
      );

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Skills owed",
          fields: columnsByMaxLength(skillsOwed),
        },
      ],
      allowedMentions: { users: [] },
    });
  } catch (error) {
    if (error instanceof JoinClanError) {
      await discordClient.alert("Unable to join clan", interaction, error);
      await interaction.editReply("I was unable to join that clan");
      return;
    }

    if (error instanceof RaidLogMissingError) {
      await discordClient.alert("Unable to check raid logs", interaction, error);
      await interaction.editReply("I couldn't see raid logs in that clan for some reason");
      return;
    }

    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}
