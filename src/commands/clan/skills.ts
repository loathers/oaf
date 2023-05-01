import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";
import { columns, notNull, pluralize } from "../../utils";
import { DREAD_CLANS } from "./_clans";
import {
  JoinClanError,
  RaidLogMissingError,
  getFinishedRaidLog,
  getMissingRaidLogs,
  getRaidLog,
} from "./_dread";

const SKILL_KILL_MATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+(defeated\D+(\d+)|used the machine)/;

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Get a list of everyone currently elgible for Dreadsylvania skills.");

export type Participation = { [username: string]: { skills: number; kills: number } };

function mergeParticipation(a: Participation, b: Participation) {
  return Object.entries(a).reduce(
    (acc, [u, { skills, kills }]) => ({
      ...acc,
      [u]: {
        skills: (acc[u]?.skills ?? 0) + skills,
        kills: (acc[u]?.kills ?? 0) + kills,
      },
    }),
    b
  );
}

async function getParticipationFromCurrentRaid() {
  const raidLogs = await Promise.all(DREAD_CLANS.map((clan) => getRaidLog(clan.id)));

  return raidLogs.reduce(
    (p, log) => mergeParticipation(p, getParticipationFromRaidLog(log)),
    {} as Participation
  );
}

export function getParticipationFromRaidLog(raidLog: string) {
  const lines = raidLog.toLowerCase().match(new RegExp(SKILL_KILL_MATCHER, "g")) || [];

  return lines
    .map((l) => l.match(SKILL_KILL_MATCHER))
    .filter(notNull)
    .map((m) => [m[1].toLowerCase(), m[3] ? "kills" : "skills", parseInt(m[3] || "1")] as const)
    .reduce(
      (acc, [username, type, num]) => ({
        ...acc,
        [username]: {
          ...(acc[username] || { skills: 0, kills: 0 }),
          [type]: (acc[username]?.[type] ?? 0) + num,
        },
      }),
      {} as { [username: string]: { skills: number; kills: number } }
    );
}

async function getUsernameToId() {
  return Object.fromEntries(
    (await prisma.players.findMany({ where: {}, select: { playerId: true, username: true } })).map(
      ({ playerId, username }) => [username.toLowerCase(), playerId] as const
    )
  );
}

async function parseOldLogs() {
  // Create a map of known username-to-id pairs
  const usernameToId = await getUsernameToId();

  const parsedRaids = (await prisma.tracked_instances.findMany({ select: { raid_id: true } })).map(
    (instance) => instance.raid_id
  );

  // Determine all the raid ids that are yet to be passed
  const raidsToParse = (
    await Promise.all(DREAD_CLANS.map((clan) => getMissingRaidLogs(clan.id, parsedRaids)))
  )
    .flat()
    .filter((id) => !parsedRaids.includes(id));

  let participation: Participation = {};

  // Parse each raid and extract the player participation
  for (const raid of raidsToParse) {
    const raidLog = await getFinishedRaidLog(raid);
    participation = mergeParticipation(participation, getParticipationFromRaidLog(raidLog));
  }

  // Go through participation records discovering ids for previously unknown players
  for (const username in Object.keys(participation)) {
    if (username in usernameToId) continue;
    const partialPlayer = await kolClient.getPartialPlayerFromName(username);
    if (!partialPlayer) continue;
    usernameToId[username] = partialPlayer.id;
  }

  // Prepare operation to update tracked instances
  const instancesToMarkAsTracked = prisma.tracked_instances.createMany({
    data: raidsToParse.map((r) => ({ raid_id: r })),
    skipDuplicates: true,
  });

  // Prepare player participation to update
  const playersToUpdate = Object.entries(participation)
    // Filter out non-existent users I guess
    .filter(([username]) => username in usernameToId)
    .map(([username, { kills, skills }]) => {
      const playerId = usernameToId[username];
      return prisma.players.upsert({
        where: { playerId },
        update: {
          kills: {
            increment: kills,
          },
          skills: {
            increment: skills,
          },
        },
        create: {
          playerId,
          username,
          kills,
          skills,
        },
      });
    });

  // Perform updates in a transaction
  await prisma.$transaction([instancesToMarkAsTracked, ...playersToUpdate]);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const doneWithSkillsList = (
    await prisma.players.findMany({
      where: { done_with_skills: true },
      select: { playerId: true },
    })
  ).map((player) => player.playerId);

  try {
    await parseOldLogs();

    const participation = mergeParticipation(
      Object.fromEntries(
        (
          await prisma.players.findMany({ select: { username: true, skills: true, kills: true } })
        ).map(({ username, skills, kills }) => [username, { skills, kills }])
      ),
      await getParticipationFromCurrentRaid()
    );

    const usernameToId = await getUsernameToId();

    const skillsOwed = Object.entries(participation)
      .filter(([username]) => !doneWithSkillsList.includes(usernameToId[username]))
      .map(
        ([username, { skills, kills }]) =>
          [username, Math.floor((kills + 450) / 900) - skills] as const
      )
      .filter(([, owed]) => owed > 0)
      .map(([username, owed]) => `${username}: ${pluralize(owed, "skill")}.`)
      .sort();

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Skills owed",
          fields: columns(skillsOwed, 3),
        },
      ],
    });
  } catch (error) {
    if (error instanceof JoinClanError) {
      await interaction.editReply("I was unable to join that clan");
      return;
    }

    if (error instanceof RaidLogMissingError) {
      await interaction.editReply("I couldn't see raid logs in that clan for some reason");
      return;
    }

    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}
