import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  roleMention,
} from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";
import { pluralize } from "../../utils.js";
import { DREAD_CLANS } from "./_clans.js";
import { getDreadStatusOverview } from "./_dread.js";

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const pingableClans: string[] = [];
    const dreadStatus = await Promise.all(
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

    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Dread Status",
          description: dreadStatus.join("\n"),
        },
      ],
    });

    if (interaction.channel?.isTextBased() && !interaction.channel.isDMBased() && pingableClans.length) {
      await interaction.channel.send({
        content: `${roleMention(config.DUNGEON_MASTER_ROLE_ID)}, looks like ${pingableClans.join(" and ")} need${pingableClans.length === 1 ? "s" : ""} rolling!`,
        allowedMentions: { roles: [config.DUNGEON_MASTER_ROLE_ID] },
      });
    }
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
