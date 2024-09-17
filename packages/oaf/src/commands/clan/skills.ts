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

export type Participation = Map<
  number,
  {
    skills: number;
    kills: number;
    playerId: number;
  }
>;

/**
 * Mutating the first parameter, merge the participation maps
 * @param target Base participation map
 * @param sources New maps to merge into the target
 * @returns A reference to the first parameter
 */
function mergeParticipation(
  target: Participation,
  ...sources: Participation[]
) {
  for (const source of sources) {
    for (const [playerId, { skills, kills }] of source) {
      const existing = target.get(playerId) || { skills: 0, kills: 0 };
      target.set(playerId, {
        ...existing,
        skills: (existing.skills || 0) + (skills || 0),
        kills: (existing.kills || 0) + (kills || 0),
        playerId,
      });
    }
  }

  return target;
}

async function getParticipationFromCurrentRaid() {
  return (
    await Promise.all(
      DREAD_CLANS.map(async (clan) => {
        const log = await getRaidLog(clan.id);
        return getParticipationFromRaidLog(log);
      }),
    )
  ).flat();
}

export function getParticipationFromRaidLog(raidLog: string) {
  return (
    raidLog
      .match(new RegExp(SKILL_KILL_MATCHER, "gi"))
      ?.map((l) => l.match(SKILL_KILL_MATCHER))
      .filter(notNull)
      .map((m) => {
        const playerId = parseInt(m[2]);
        const type = m[3].startsWith("defeated") ? "kills" : "skills";
        const num = parseInt(m[4] || "1");
        return new Map([
          [
            playerId,
            {
              playerId,
              skills: type === "skills" ? num : 0,
              kills: type === "kills" ? num : 0,
            },
          ],
        ]);
      }) ?? []
  );
}

async function parseLogs() {
  const parsedRaids = (
    await prisma.raid.findMany({ select: { id: true } })
  ).map(({ id }) => id);

  // Determine all the raid ids that are yet to be passed
  const updates = [];
  const players: number[] = [];

  for (const clan of DREAD_CLANS) {
    const raids = (await getMissingRaidLogs(clan.id, parsedRaids)).filter(
      (id) => !parsedRaids.includes(id),
    );
    const raidLogs = await Promise.all(
      raids.map(async (id) => ({ id, log: await getFinishedRaidLog(id) })),
    );
    for (const { id, log } of raidLogs) {
      if (log.includes("No such raid was found.")) {
        await discordClient.alert(
          `Discovered raid ${id} from clan ${clan.name} but couldn't load the log`,
        );
        continue;
      }

      const participation = mergeParticipation(
        new Map(),
        ...getParticipationFromRaidLog(log),
      );
      players.push(...participation.keys());

      updates.push(
        prisma.raid.create({
          data: {
            id,
            clanId: clan.id,
            participation: {
              create: [...participation.values()].map((p) => ({
                raidId: id,
                skills: p.skills ?? 0,
                kills: p.kills ?? 0,
                player: {
                  connect: { playerId: p.playerId },
                },
              })),
            },
          },
        }),
      );
    }
  }

  const knownPlayers = (
    await prisma.player.findMany({
      where: {
        playerId: { in: players },
      },
      select: {
        playerId: true,
      },
    })
  ).map(({ playerId }) => playerId);

  const unknownPlayers = await Promise.all(
    players
      .filter((p) => !knownPlayers.includes(p))
      .map(async (playerId) => {
        const player = await kolClient.players.fetch(playerId);
        return { playerId, playerName: player?.name ?? "Unknown" };
      }),
  );

  updates.unshift(
    prisma.player.createMany({
      data: unknownPlayers,
      skipDuplicates: true,
    }),
  );

  await prisma.$transaction(updates);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", false);

  await interaction.deferReply();

  try {
    await parseLogs();

    const players = await prisma.player.findMany({
      select: {
        playerId: true,
        playerName: true,
        discordId: true,
        doneWithSkills: true,
        raidParticipation: true,
      },
    });

    const participation = mergeParticipation(
      new Map(),
      ...players
        .map((p) => p.raidParticipation.map((r) => new Map([[p.playerId, r]])))
        .flat(),
      ...(await getParticipationFromCurrentRaid()),
    );

    if (input) {
      const identifyResult = await identifyPlayer(input);
      if (typeof identifyResult === "string") {
        return void (await interaction.editReply(identifyResult));
      }
      const [, player] = identifyResult;
      if (!player)
        return void (await interaction.editReply(
          `We have no data on skills for player matching ${input}!`,
        ));

      const { skills, kills } = participation.get(player.playerId) ?? {
        skills: 0,
        kills: 0,
      };

      return void (await interaction.editReply(
        `${player.playerName} is currently ${player.doneWithSkills ? "" : "not yet "}done with skills. They have performed ${pluralize(kills, "kill")} and received ${pluralize(skills, "skill")} in ASS Dread instances.`,
      ));
    } else {
      const skillsOwed = players
        .filter(
          (player) =>
            player.doneWithSkills !== true &&
            player.raidParticipation.length > 0,
        )
        .map((player) => {
          const { skills, kills } = participation.get(player.playerId) ?? {
            skills: 0,
            kills: 0,
          };
          return [
            player,
            Math.floor(((kills ?? 0) + 450) / 900) - (skills ?? 0),
          ] as const;
        })
        .filter(([, owed]) => owed > 0)
        .sort(([, a], [, b]) => b - a)
        .map(
          ([player, owed]) =>
            `${formatPlayer(player, player.playerId)}: ${pluralize(
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
