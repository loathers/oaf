import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import {
  columnsByMaxLength,
  formatPlayer,
  notNull,
  pluralize,
} from "../../utils.js";
import { identifyPlayer } from "../_player.js";
import { DREAD_CLANS } from "./_clans.js";
import {
  JoinClanError,
  RaidLogMissingError,
  getFinishedRaidLog,
  getMissingRaidLogs,
  getRaidLog,
} from "./_dread.js";

const SKILL_KILL_MATCHER =
  /([A-Za-z0-9\-_ ]+)\s+\(#(\d+)\)\s+(defeated\D+(\d+)|used the machine)/i;

export const data = new SlashCommandBuilder()
  .setName("skills")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("An individual player to check, if you want just one")
      .setRequired(false),
  )
  .setDescription(
    "Get a list of everyone currently elgible for Dreadsylvania skills.",
  );

type ParticipationData = { skills: number; kills: number };
export type Participation = Map<number, ParticipationData>;

function addParticipation(
  a: Participation,
  playerId: number,
  { skills, kills }: Partial<ParticipationData>,
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
  const raidLogs = await Promise.all(
    DREAD_CLANS.map((clan) => getRaidLog(clan.id)),
  );

  return raidLogs.reduce(
    (p, log) => mergeParticipation(p, getParticipationFromRaidLog(log)),
    new Map() as Participation,
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
        ] as const,
    )
    .forEach(([playerId, type, num]) => {
      addParticipation(participation, playerId, { [type]: num });
    });

  return participation;
}

async function parseOldLogs() {
  const parsedRaids = (
    await prisma.raid.findMany({ select: { id: true } })
  ).map(({ id }) => id);

  // Determine all the raid ids that are yet to be passed
  let participation = new Map();
  const missingRaids: number[] = [];
  for (const clan of DREAD_CLANS) {
    const raids = (await getMissingRaidLogs(clan.id, parsedRaids)).filter(
      (id) => !parsedRaids.includes(id),
    );
    const raidLogs = await Promise.all(
      raids.map(async (id) => ({ id, log: await getFinishedRaidLog(id) })),
    );
    for (const { id, log } of raidLogs) {
      if (log.includes("No such raid was found.")) continue;
      missingRaids.push(id);
      participation = mergeParticipation(
        participation,
        getParticipationFromRaidLog(log),
      );
    }
  }

  const knownPlayerNames = Object.fromEntries(
    (
      await prisma.player.findMany({
        where: {
          playerId: { in: [...participation.keys()] },
        },
        select: {
          playerId: true,
          playerName: true,
        },
      })
    ).map(({ playerId, playerName }) => [playerId, playerName]),
  );

  const playerNames = Object.fromEntries(
    await Promise.all(
      [...participation.keys()].map(async (playerId) => {
        const known = knownPlayerNames[playerId];
        if (known) return [playerId, known];
        const player = await kolClient.players.fetch(playerId);
        if (player) return [playerId, player.name];
        return [playerId, null];
      }),
    ),
  );

  await prisma.$transaction([
    prisma.raid.createMany({
      data: missingRaids.map((r) => ({ id: r })),
      skipDuplicates: true,
    }),
    ...[...participation.entries()]
      .filter(([playerId]) => playerNames[playerId])
      .map(([playerId, { kills, skills }]) =>
        prisma.player.upsert({
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
            playerName: playerNames[playerId],
            kills,
            skills,
          },
        }),
      ),
  ]);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", false);

  await interaction.deferReply();

  try {
    await parseOldLogs();

    const players = new Map(
      (await prisma.player.findMany({})).map((p) => [p.playerId, p] as const),
    );

    const participation = mergeParticipation(
      players,
      await getParticipationFromCurrentRaid(),
    );

    if (input) {
      const identifyResult = await identifyPlayer(input);
      if (typeof identifyResult === "string") {
        return void (await interaction.editReply(identifyResult));
      }
      const [, knownPlayer] = identifyResult;
      if (!knownPlayer)
        return void (await interaction.editReply(
          `We have no data on skills for player matching ${input}!`,
        ));
      return void (await interaction.editReply(
        `${knownPlayer.playerName} is currently ${knownPlayer.doneWithSkills ? "" : "not yet "}done with skills. They have performed ${pluralize(knownPlayer.kills, "kill")} and received ${pluralize(knownPlayer.skills, "skill")} in ASS Dread instances.`,
      ));
    } else {
      const skillsOwed = [...participation.entries()]
        .filter(([playerId]) => players.get(playerId)?.doneWithSkills !== true)
        .map(
          ([playerId, { skills, kills }]) =>
            [playerId, Math.floor((kills + 450) / 900) - skills] as const,
        )
        .filter(([, owed]) => owed > 0)
        .sort(([, a], [, b]) => b - a)
        .map(
          ([playerId, owed]) =>
            `${formatPlayer(players.get(playerId), playerId)}: ${pluralize(
              owed,
              "skill",
            )}.`,
        );

      await interaction.editReply({
        content: null,
        embeds: [
          {
            title: "Skills owed",
            fields: columnsByMaxLength(skillsOwed.slice(0, 50)),
          },
        ],
        allowedMentions: { users: [] },
      });
    }
  } catch (error) {
    if (error instanceof JoinClanError) {
      await discordClient.alert("Unable to join clan", interaction, error);
      await interaction.editReply("I was unable to join that clan");
      return;
    }

    if (error instanceof RaidLogMissingError) {
      await discordClient.alert(
        "Unable to check raid logs",
        interaction,
        error,
      );
      await interaction.editReply(
        "I couldn't see raid logs in that clan for some reason",
      );
      return;
    }

    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in.",
    );
  }
}
