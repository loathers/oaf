import { ChatInputCommandInteraction, SlashCommandBuilder, bold } from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { pluralize } from "../../utils/index.js";
import { DREAD_CLANS } from "./_clans.js";
import { getDreadStatusOverview } from "./_dread.js";

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const dreadStatus = await Promise.all(
      DREAD_CLANS.map(async (clan) => {
        const overview = await getDreadStatusOverview(clan.id);

        const skills = overview.castle ? overview.skills : 0;

        const capacitorString = overview.capacitor
          ? `${pluralize(skills, "skill")} left`
          : "Needs capacitor";

        return `${bold(clan.name)}: ${overview.forest}/${overview.village}/${
          overview.castle
        } (${capacitorString})`;
      })
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
  } catch (error) {
    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Get the current status of all monitored Dreadsylvania instances.");
