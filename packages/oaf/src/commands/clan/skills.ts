import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Player } from "kol.js";

import {
  createRaidsWithParticipation,
  getParsedRaidIds,
  getPlayersWithRaidParticipation,
} from "../../clients/database.js";
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

export type Participation = Record<
  string | number,
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
export function mergeParticipation(
  target: Participation,
  ...sources: Participation[]
) {
  sources
    .flatMap((s) => Object.entries(s))
    .forEach(([playerId, { skills, kills }]) => {
      const existing = target[playerId] ?? { skills: 0, kills: 0 };
      target[playerId] = {
        ...existing,
        skills: existing.skills + skills,
        kills: existing.kills + kills,
        playerId: parseInt(playerId),
      };
    });

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
        const num = parseInt(m[4] ?? "1");
        return {
          [playerId]: {
            playerId,
            skills: type === "skills" ? num : 0,
            kills: type === "kills" ? num : 0,
          },
        };
      }) ?? []
  );
}

async function parseLogs() {
  const parsedRaids = await getParsedRaidIds();

  const { players } = await getPlayersWithRaidParticipation();
  const knownPlayerIds = players.map((p) => p.playerId);

  // Determine all the raid ids that are yet to be passed
  const raidUpdates: {
    id: number;
    clanId: number;
    participation: {
      playerId: number;
      playerName: string;
      skills: number;
      kills: number;
    }[];
  }[] = [];

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

      const participation = await Promise.all(
        Object.values(
          mergeParticipation({}, ...getParticipationFromRaidLog(log)),
        ).map(async ({ playerId, skills, kills }) => ({
          playerId,
          playerName:
            (!knownPlayerIds.includes(playerId) &&
              (await Player.getNameFromId(kolClient, playerId))) ||
            "Unknown",
          skills,
          kills,
        })),
      );

      raidUpdates.push({
        id,
        clanId: clan.id,
        participation,
      });
    }
  }

  await createRaidsWithParticipation(raidUpdates);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", false);

  await interaction.deferReply();

  try {
    await parseLogs();

    const { players, participation: allParticipation } =
      await getPlayersWithRaidParticipation();

    const playersWithParticipation = players.map((p) => ({
      ...p,
      raidParticipation: allParticipation.filter(
        (r) => r.playerId === p.playerId,
      ),
    }));

    const participation = mergeParticipation(
      {},
      ...playersWithParticipation
        .map((p) => p.raidParticipation.map((r) => ({ [p.playerId]: r })))
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

      const { skills, kills } = participation[player.playerId] ?? {
        skills: 0,
        kills: 0,
      };

      return void (await interaction.editReply(
        `${player.playerName} is currently ${player.doneWithSkills ? "" : "not yet "}done with skills. They have performed ${pluralize(kills, "kill")} and received ${pluralize(skills, "skill")} in ASS Dread instances.`,
      ));
    }

    const skillsOwed = playersWithParticipation
      .filter(
        (player) =>
          player.doneWithSkills !== true && player.raidParticipation.length > 0,
      )
      .map((player) => {
        const { skills, kills } = participation[player.playerId] ?? {
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

    return void (await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Skills owed",
          fields: columnsByMaxLength(skillsOwed.slice(0, 50)),
        },
      ],
      allowedMentions: { users: [] },
    }));
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
