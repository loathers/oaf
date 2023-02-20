import { ChatInputCommandInteraction, SlashCommandBuilder, bold } from "discord.js";

import { databaseClient } from "../../clients/db";
import { kolClient } from "../../clients/kol";
import { pluralize } from "../../utils";
import { DREAD_CLANS, clanState } from "./_clans";

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const dreadStatus = await Promise.all(
      DREAD_CLANS.map(async (clan) => {
        const overview = await kolClient.getDreadStatusOverview(clan.id);

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
  } catch {
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Get the current status of all monitored Dreadsylvania instances.");

export async function async() {
  clanState.parsedRaids = (
    await databaseClient.query("SELECT raid_id FROM tracked_instances;")
  ).rows.map((row) => row.raid_id);

  for (let player of (await databaseClient.query("SELECT * FROM players;")).rows) {
    clanState.killMap.set(player.username, {
      kills: player.kills,
      skills: player.skills,
      id: player.user_id,
      brainiac: player.brainiac,
    });
  }
}
