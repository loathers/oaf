import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";

import { DREAD_CLANS, clanState } from "../../clans";
import { createEmbed } from "../../discord";
import { DetailedDreadStatus, KoLClient } from "../../kol";
import { pluralize } from "../../utils";
import { Command } from "../type";

const DREAD_BOSS_MAPPINGS: Map<string, string> = new Map([
  ["werewolf", "Air Wolf"],
  ["bugbear", "Falls-From-Sky"],
  ["zombie", "Zombie HOA"],
  ["ghost", "Mayor Ghost"],
  ["vampire", "Drunkula"],
  ["skeleton", "Unkillable Skeleton"],
  ["xwerewolf", "~~Air Wolf~~"],
  ["xbugbear", "~~Falls-From-Sky~~"],
  ["xzombie", "~~Zombie HOA~~"],
  ["xghost", "~~Mayor Ghost~~"],
  ["xvampire", "~~Drunkula~~"],
  ["xskeleton", "~~Unkillable Skeleton~~"],
  ["unknown", "Boss unknown"],
]);

async function clanStatus(interaction: CommandInteraction, kolClient: KoLClient) {
  let messageString = "";
  await interaction.deferReply();
  try {
    for (let clan of DREAD_CLANS) {
      const overview = await kolClient.getDreadStatusOverview(clan.id);
      const skills = overview.castle ? overview.skills : 0;
      const capacitorString = overview.capacitor
        ? `${pluralize(skills, "skill")} left`
        : "Needs capacitor";
      messageString += `**${clan.name}**: ${overview.forest}/${overview.village}/${overview.castle} (${capacitorString})\n`;
    }
    await interaction.editReply({
      content: null,
      embeds: [
        {
          title: "Dread Status",
          description: messageString,
        },
      ],
    });
  } catch {
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

const sidenote = (...steps: string[]) => `\u00a0\u00a0\u00a0\u00a0*${steps.join(" \u2192 ")}*`;

function getForestSummary(status: DetailedDreadStatus) {
  if (!status.overview.forest) return "~~Forest fully cleared.~~";

  const summary = [];

  if (!status.forest.attic) summary.push("**Cabin attic needs unlocking.**");

  if (status.forest.watchtower) summary.push("Watchtower open, you can grab freddies if you like.");

  if (status.forest.auditor) {
    summary.push("~~Auditor's badge claimed.~~");
  } else {
    summary.push("Auditor's badge available.", sidenote("Cabin", "Basement", "Lockbox"));
  }

  if (status.forest.musicbox) {
    summary.push("~~Intricate music box parts claimed.~~");
  } else {
    summary.push(
      "Intricate music box parts available.",
      sidenote("Cabin", "Attic", "Music Box"),
      sidenote("Requires Accordion Thief"),
      sidenote("Also banishes spooky from forest")
    );
  }

  if (status.forest.kiwi) {
    summary.push("~~Blood kiwi claimed.~~");
  } else {
    summary.push(
      "Blood kiwi available.",
      sidenote("Person A: Tree", "Root Around", "Look Up"),
      sidenote("Person B: Tree", "Climb", "Stomp"),
      sidenote("Requires muscle class (Person B)")
    );
  }

  if (status.forest.amber) {
    summary.push("~~Moon-amber claimed.~~");
  } else {
    summary.push(
      "Moon-amber available.",
      sidenote("Tree", "Climb", "Shiny Thing"),
      sidenote("Requires muscle class")
    );
  }

  return summary.join("\n");
}

function getVillageSummary(status: DetailedDreadStatus) {
  if (!status.overview.village) return "~~Village fully cleared.~~";

  const summary = [];

  if (status.village.schoolhouse) {
    summary.push(
      "Schoolhouse is open, go get your pencils!",
      sidenote("Square", "Schoolhouse", "Desk")
    );
  }

  if (status.village.suite) {
    summary.push(
      "Master suite is open, grab some eau de mort?",
      sidenote("Duke's Estate", "Master Suite", "Nightstand")
    );
  }

  if (status.village.hanging) {
    summary.push("~~Hanging complete.~~");
  } else {
    summary.push(
      "Hanging available.",
      sidenote("Person A: Square", "Gallows", "Stand on Trap Door"),
      sidenote("Person B: Square", "Gallows", "Pull Lever")
    );
  }

  return summary.join("\n");
}

function parseCastleStatus(status: DetailedDreadStatus) {
  if (!status.overview.castle) return "~~Castle fully cleared.~~";

  const summary = [];

  if (!status.castle.lab) {
    summary.push("**Lab needs unlocking.**");
  } else if (!status.overview.capacitor) {
    summary.push("Machine needs repairing (with skull capacitor).");
  } else if (!status.overview.skills) {
    summary.push("~~All skills claimed.~~");
  } else {
    summary.push(`${pluralize(status.overview.skills, "skill")} available.`);
  }

  if (status.castle.roast) {
    summary.push("~~Dreadful roast claimed.~~");
  } else {
    summary.push("Dreadful roast available.", sidenote("Great Hall", "Dining Room", "Grab roast"));
  }

  if (status.castle.banana) {
    summary.push("~~Wax banana claimed.~~");
  } else {
    summary.push(
      "Wax banana available.",
      sidenote("Great Hall", "Dining Room", "Levitate"),
      sidenote("Requires myst class")
    );
  }

  if (status.castle.agaricus) {
    summary.push("~~Stinking agaricus claimed.~~");
  } else {
    summary.push(
      "Stinking agaricus available.",
      sidenote("Dungeons", "Guard Room", "Break off bits")
    );
  }

  return summary.join("\n");
}

async function detailedClanStatus(
  interaction: CommandInteraction,
  kolClient: KoLClient
): Promise<void> {
  const clanName = interaction.options.getString("clan", true);
  const clan = DREAD_CLANS.find(
    (clan) => clan.name.toLowerCase() === clanName || clan.synonyms.includes(clanName)
  );
  if (!clan) {
    interaction.reply({ content: "Clan not recognised.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const status = await kolClient.getDetailedDreadStatus(clan.id);
    const embed = createEmbed().setTitle(`Status update for ${clan.name}`);

    embed.setDescription(
      `Kills remaining: ${status.overview.forest}/${status.overview.village}/${status.overview.castle}`
    );

    embed.addFields([
      {
        name: `__**Forest**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[0])})`,
        value: getForestSummary(status),
      },
      {
        name: `__**Village**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[1])})`,
        value: getVillageSummary(status),
      },
      {
        name: `__**Castle**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[2])})`,
        value: parseCastleStatus(status),
      },
    ]);

    await interaction.editReply({ content: null, embeds: [embed] });
  } catch {
    await interaction.editReply(
      "I was unable to fetch clan status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

const command: Command = {
  attach: ({ discordClient, kolClient }) => {
    discordClient.attachCommand(
      "status",
      [],
      (interaction: CommandInteraction) => clanStatus(interaction, kolClient),
      "Get the current status of all monitored Dreadsylvania instances."
    );
    discordClient.attachCommand(
      "clan",
      [
        {
          name: "clan",
          description: "The clan whose status you wish to check.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => detailedClanStatus(interaction, kolClient),
      "Get a detailed current status of the specified Dreadsylvania instance."
    );
  },
  sync: async ({ databasePool }) => {
    clanState.parsedRaids = (
      await databasePool.query("SELECT raid_id FROM tracked_instances;")
    ).rows.map((row) => row.raid_id);

    for (let player of (await databasePool.query("SELECT * FROM players;")).rows) {
      clanState.killMap.set(player.username, {
        kills: player.kills,
        skills: player.skills,
        id: player.user_id,
        brainiac: player.brainiac,
      });
    }
  },
};

export default command;
