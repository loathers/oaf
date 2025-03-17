import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  roleMention,
} from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { pluralize } from "../../utils.js";
import { DREAD_CLANS } from "./_clans.js";
import { getDreadStatusOverview } from "./_dread.js";

async function constructDreadStatusMessage(ping: boolean): Promise<string[]> {
  const pingableClans: string[] = [];

  const messages = await Promise.all(
    DREAD_CLANS.map(async (clan) => {
      const overview = await getDreadStatusOverview(clan.id);

      const skills = overview.castle ? overview.skills : 0;

      const capacitorString = overview.capacitor
        ? `${pluralize(skills, "skill")} left`
        : "Needs capacitor";

      if (
        overview.capacitor &&
        !overview.skills &&
        (["forest", "village", "castle"] as const).every(
          (zone) => overview[zone] <= 10,
        )
      ) {
        pingableClans.push(clan.name);
      }

      return `${bold(clan.name)}: ${overview.forest}/${overview.village}/${
        overview.castle
      } (${capacitorString})`;
    }),
  );

  if (ping && pingableClans.length) {
    messages.push(
      `${roleMention(config.DUNGEON_MASTER_ROLE_ID)}, looks like ${pingableClans.join(" and ")} ${pingableClans.length === 1 ? "is" : "are"} ready to rock (and roll).`,
    );
  }

  return messages;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const dreadStatus = await constructDreadStatusMessage(false);

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

export async function init() {
  kolClient.on("rollover", async () => {
    const messages = await constructDreadStatusMessage(true);
    const channel = discordClient.guild?.channels.cache.get(
      config.DUNGEON_CHANNEL_ID,
    );
    if (!channel?.isTextBased()) {
      discordClient.alert("No clan dungeon channel found");
    } else {
      channel.send({
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
  });
}
