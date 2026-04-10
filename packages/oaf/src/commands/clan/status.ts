import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  roleMention,
} from "discord.js";
import { DreadsylvaniaDungeon } from "kol.js/domains/Dreadsylvania";

import { discordClient } from "../../clients/discord.js";
import { assertNotRollover, kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { pluralize } from "../../utils.js";
import { DREAD_CLANS } from "./_clans.js";

const dungeon = new DreadsylvaniaDungeon(kolClient);

async function constructDreadStatusMessage(): Promise<{
  pingableClans: string[];
  messages: string[];
}> {
  const pingableClans: string[] = [];

  const messages = await Promise.all(
    DREAD_CLANS.map(async (clan) => {
      const raid = await dungeon.getRaid(clan.id);
      const overview = raid.getOverview();

      const skills =
        overview.castle.remaining > 0 ? overview.remainingSkills : 0;

      const capacitorString = overview.capacitor
        ? `${pluralize(skills, "skill")} left`
        : "Needs capacitor";

      if (
        overview.capacitor &&
        !overview.remainingSkills &&
        (["forest", "village", "castle"] as const).every(
          (zone) => overview[zone].remaining <= 10,
        )
      ) {
        pingableClans.push(clan.name);
      }

      return `${bold(clan.name)}: ${overview.forest.remaining}/${overview.village.remaining}/${
        overview.castle.remaining
      } (${capacitorString})`;
    }),
  );

  return { pingableClans, messages };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  assertNotRollover();

  await interaction.deferReply();

  try {
    const dreadStatus = (await constructDreadStatusMessage()).messages;

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Dread Status",
          description: dreadStatus.join("\n"),
        },
      ],
    });
  } catch (error) {
    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in.",
    );
  }
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription(
    "Get the current status of all monitored Dreadsylvania instances.",
  );

export function init() {
  kolClient.on("rollover", () => {
    void (async () => {
      try {
        const { messages, pingableClans } = await constructDreadStatusMessage();
        const channel = discordClient.guild?.channels.cache.get(
          config.DUNGEON_CHANNEL_ID,
        );
        if (!channel?.isTextBased()) {
          await discordClient.alert("No clan dungeon channel found");
        } else {
          await channel.send({
            ...(pingableClans.length
              ? {
                  content: `${roleMention(config.DUNGEON_MASTER_ROLE_ID)}, looks like ${pingableClans.join(" and ")} ${pingableClans.length === 1 ? "is" : "are"} ready to rock (and roll).`,
                }
              : {}),
            embeds: [
              {
                title: "Dread Status",
                description: messages.join("\n"),
              },
            ],
            allowedMentions: {
              roles: [config.DUNGEON_MASTER_ROLE_ID],
            },
          });
        }
      } catch (error) {
        await discordClient.alert(
          "Failed to post dread status after rollover",
          undefined,
          error,
        );
      }
    })();
  });
}
