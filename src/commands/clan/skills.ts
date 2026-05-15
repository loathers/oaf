import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { JoinClanError } from "kol.js";
import { RaidLogMissingError } from "kol.js/domains/ClanDungeon";
import {
  DreadsylvaniaDungeon,
  DreadsylvaniaRaid,
} from "kol.js/domains/Dreadsylvania";

import {
  createRaidsWithParticipation,
  getParsedRaidIds,
  getPlayersWithRaidParticipation,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { assertNotRollover, kolClient } from "../../clients/kol.js";
import { columnsByMaxLength, formatPlayer } from "../../discordUtils.js";
import { pluralize } from "../../utils.js";
import { identifyPlayer } from "../_player.js";
import { DUNGEON_RUNNING_CLANS } from "./_clans.js";

const dungeon = new DreadsylvaniaDungeon(kolClient);

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

async function getParticipationFromCurrentRaid() {
  return await Promise.all(
    DUNGEON_RUNNING_CLANS.map(async (clan) => {
      const raid = await dungeon.getRaid(clan.id);
      return raid.getParticipation();
    }),
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

  for (const clan of DUNGEON_RUNNING_CLANS) {
    const raidIds = (await dungeon.getRaidIds(clan.id, parsedRaids)).filter(
      (id) => !parsedRaids.includes(id),
    );
    const raids = await Promise.all(
      raidIds.map(async (id) => ({
        id,
        raid: await dungeon.getRaid(clan.id, id),
      })),
    );

    for (const { id, raid } of raids) {
      if (raid.events.length === 0) {
        await discordClient.alert(
          `Discovered raid ${id} from clan ${clan.name} but couldn't load the log`,
        );
        continue;
      }

      const participation = await Promise.all(
        Object.values(raid.getParticipation()).map(
          async ({ playerId, skills, kills }) => ({
            playerId,
            playerName:
              (!knownPlayerIds.includes(playerId) &&
                (await kolClient.players.getNameFromId(playerId))) ||
              "Unknown",
            skills,
            kills,
          }),
        ),
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

  assertNotRollover();

  await interaction.deferReply();

  try {
    await parseLogs();

    const { players, participation: dbParticipation } =
      await getPlayersWithRaidParticipation();

    const participation = DreadsylvaniaRaid.mergeParticipation(
      ...dbParticipation.map((r) => ({
        [r.playerId]: {
          playerId: r.playerId,
          skills: r.skills,
          kills: r.kills,
        },
      })),
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

    const skillsOwed = players
      .filter(
        (player) => !player.doneWithSkills && participation[player.playerId],
      )
      .map((player) => {
        const { skills, kills } = participation[player.playerId];
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
      await interaction.editReply(
        `I was unable to join that clan: ${error.message}`,
      );
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
