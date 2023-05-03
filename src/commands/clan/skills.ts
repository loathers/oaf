import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";
import { columns, formatPlayer, notNull, pluralize } from "../../utils";
import { DREAD_CLANS } from "./_clans";
import {
  JoinClanError,
  RaidLogMissingError,
  getFinishedRaidLog,
  getMissingRaidLogs,
  getRaidLog,
} from "./_dread";

const SKILL_KILL_MATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+(defeated\D+(\d+)|used the machine)/i;

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Get a list of everyone currently elgible for Dreadsylvania skills.");

export type Participation = { [username: string]: { skills: number; kills: number } };

function mergeParticipation(a: Participation, b: Participation) {
  return Object.entries(b).reduce(
    (acc, [u, { skills, kills }]) => ({
      ...acc,
      [u]: {
        skills: (acc[u]?.skills ?? 0) + skills,
        kills: (acc[u]?.kills ?? 0) + kills,
      },
    }),
    a
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
  const lines = raidLog.match(new RegExp(SKILL_KILL_MATCHER, "gi")) || [];

  return lines
    .map((l) => l.match(SKILL_KILL_MATCHER))
    .filter(notNull)
    .map(
      (m) =>
        [
          m[1].toLowerCase(),
          m[2].startsWith("defeated") ? "kills" : "skills",
          parseInt(m[3] || "1"),
        ] as const
    )
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
    (await prisma.player.findMany({ where: {}, select: { playerId: true, username: true } })).map(
      ({ playerId, username }) => [username.toLowerCase(), playerId] as const
    )
  );
}

async function parseOldLogs() {
  // Create a map of known username-to-id pairs
  const usernameToId = await getUsernameToId();

  const parsedRaids = (await prisma.raid.findMany({ select: { id: true } })).map(({ id }) => id);

  // Determine all the raid ids that are yet to be passed
  const raidsToParse = (
    await Promise.all(DREAD_CLANS.map((clan) => getMissingRaidLogs(clan.id, parsedRaids)))
  )
    .flat()
    .filter((id) => !parsedRaids.includes(id));

  let participation: Participation = {};

  // Parse each raid and extract the player participation
  for (const raidId of raidsToParse) {
    const raidLog = await getFinishedRaidLog(raidId);
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
  const instancesToMarkAsTracked = prisma.raid.createMany({
    data: raidsToParse.map((r) => ({ id: r })),
    skipDuplicates: true,
  });

  // Prepare player participation to update
  const playersToUpdate = Object.entries(participation)
    // Filter out non-existent users I guess
    .filter(([username]) => username in usernameToId)
    .map(([username, { kills, skills }]) => {
      const playerId = usernameToId[username];
      return prisma.player.upsert({
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

  try {
    await parseOldLogs();

    const players = Object.fromEntries(
      (await prisma.player.findMany({})).map((p) => [p.username, p] as const)
    );

    const participation = mergeParticipation(players, await getParticipationFromCurrentRaid());

    const skillsOwed = Object.entries(participation)
      .filter(([username]) => players[username]?.doneWithSkills !== true)
      .map(
        ([username, { skills, kills }]) =>
          [username, Math.floor((kills + 450) / 900) - skills] as const
      )
      .filter(([, owed]) => owed > 0)
      .map(
        ([username, owed]) =>
          `${formatPlayer(players[username], username)}: ${pluralize(owed, "skill")}.`
      )
      .sort();

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Skills owed",
          fields: columns(skillsOwed, 3),
        },
      ],
      allowedMentions: { users: [] },
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
