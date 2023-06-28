import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  italic,
  strikethrough,
  underscore,
} from "discord.js";

import { createEmbed, discordClient } from "../../clients/discord.js";
import { pluralize } from "../../utils/index.js";
import { DREAD_CLANS } from "./_clans.js";
import {
  DetailedDreadStatus,
  JoinClanError,
  RaidLogMissingError,
  getDetailedDreadStatus,
} from "./_dread.js";

const DREAD_BOSS_MAPPINGS = new Map([
  ["werewolf", "Air Wolf"],
  ["bugbear", "Falls-From-Sky"],
  ["zombie", "Zombie HOA"],
  ["ghost", "Mayor Ghost"],
  ["vampire", "Drunkula"],
  ["skeleton", "Unkillable Skeleton"],
  ["xwerewolf", strikethrough("Air Wolf")],
  ["xbugbear", strikethrough("Falls-From-Sky")],
  ["xzombie", strikethrough("Zombie HOA")],
  ["xghost", strikethrough("Mayor Ghost")],
  ["xvampire", strikethrough("Drunkula")],
  ["xskeleton", strikethrough("Unkillable Skeleton")],
  ["unknown", "Boss unknown"],
]);

export const data = new SlashCommandBuilder()
  .setName("clan")
  .setDescription("Get a detailed current status of the specified Dreadsylvania instance.")
  .addStringOption((option) =>
    option
      .setName("clan")
      .setDescription("The clan whose status you wish to check.")
      .setRequired(true)
      .setAutocomplete(true)
  );

const sidenote = (...steps: string[]) =>
  `\u00a0\u00a0\u00a0\u00a0${italic(steps.join(" \u2192 "))}`;

function getForestSummary(status: DetailedDreadStatus) {
  if (!status.overview.forest) return strikethrough("Forest fully cleared.");

  const summary = [];

  if (!status.forest.attic) summary.push(bold("Cabin attic needs unlocking."));

  if (status.forest.watchtower) summary.push("Watchtower open, you can grab freddies if you like.");

  if (status.forest.auditor) {
    summary.push(strikethrough("Auditor's badge claimed."));
  } else {
    summary.push("Auditor's badge available.", sidenote("Cabin", "Basement", "Lockbox"));
  }

  if (status.forest.musicbox) {
    summary.push(strikethrough("Intricate music box parts claimed."));
  } else {
    summary.push(
      "Intricate music box parts available.",
      sidenote("Cabin", "Attic", "Music Box"),
      sidenote("Requires Accordion Thief"),
      sidenote("Also banishes spooky from forest")
    );
  }

  if (status.forest.kiwi) {
    summary.push(strikethrough("Blood kiwi claimed."));
  } else {
    summary.push(
      "Blood kiwi available.",
      sidenote("Person A: Tree", "Root Around", "Look Up"),
      sidenote("Person B: Tree", "Climb", "Stomp"),
      sidenote("Requires muscle class (Person B)")
    );
  }

  if (status.forest.amber) {
    summary.push(strikethrough("Moon-amber claimed."));
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
  if (!status.overview.village) return strikethrough("Village fully cleared.");

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
    summary.push(strikethrough("Hanging complete."));
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
  if (!status.overview.castle) return strikethrough("Castle fully cleared.");

  const summary = [];

  if (!status.castle.lab) {
    summary.push(bold("Lab needs unlocking."));
  } else if (!status.overview.capacitor) {
    summary.push("Machine needs repairing (with skull capacitor).");
  } else if (!status.overview.skills) {
    summary.push(strikethrough("All skills claimed."));
  } else {
    summary.push(`${pluralize(status.overview.skills, "skill")} available.`);
  }

  if (status.castle.roast) {
    summary.push(strikethrough("Dreadful roast claimed."));
  } else {
    summary.push("Dreadful roast available.", sidenote("Great Hall", "Dining Room", "Grab roast"));
  }

  if (status.castle.banana) {
    summary.push(strikethrough("Wax banana claimed."));
  } else {
    summary.push(
      "Wax banana available.",
      sidenote("Great Hall", "Dining Room", "Levitate"),
      sidenote("Requires myst class")
    );
  }

  if (status.castle.agaricus) {
    summary.push(strikethrough("Stinking agaricus claimed."));
  } else {
    summary.push(
      "Stinking agaricus available.",
      sidenote("Dungeons", "Guard Room", "Break off bits")
    );
  }

  return summary.join("\n");
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const clanName = interaction.options.getString("clan", true).toLowerCase();

  const clan = DREAD_CLANS.find(
    (clan) => clan.name.toLowerCase() === clanName || clan.synonyms.includes(clanName)
  );

  if (!clan) {
    interaction.reply({ content: "Clan not recognised.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const status = await getDetailedDreadStatus(clan.id);
    const embed = createEmbed().setTitle(`Status update for ${clan.name}`);

    embed.setDescription(
      `Kills remaining: ${status.overview.forest}/${status.overview.village}/${status.overview.castle}`
    );

    embed.addFields([
      {
        name: `${underscore(bold("Forest"))} (${DREAD_BOSS_MAPPINGS.get(
          status.overview.bosses[0]
        )})`,
        value: getForestSummary(status),
      },
      {
        name: `${underscore(bold("Village"))} (${DREAD_BOSS_MAPPINGS.get(
          status.overview.bosses[1]
        )})`,
        value: getVillageSummary(status),
      },
      {
        name: `${underscore(bold("Castle"))} (${DREAD_BOSS_MAPPINGS.get(
          status.overview.bosses[2]
        )})`,
        value: parseCastleStatus(status),
      },
    ]);

    await interaction.editReply({ content: null, embeds: [embed] });
  } catch (error) {
    if (error instanceof JoinClanError) {
      await discordClient.alert("Unable to join clan", interaction, error);
      await interaction.editReply("I was unable to join that clan");
      return;
    }

    if (error instanceof RaidLogMissingError) {
      await discordClient.alert("Unable to check raid logs", interaction, error);
      await interaction.editReply("I couldn't see raid logs in that clan for some reason");
      return;
    }

    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch skill status, sorry. I might be stuck in a clan, or I might be unable to log in."
    );
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();

  const filtered = DREAD_CLANS.filter(
    (clan) =>
      clan.name.toLowerCase().includes(focusedValue) ||
      clan.synonyms.some((s) => s.includes(focusedValue))
  ).map((clan) => ({ name: clan.name, value: clan.name }));

  await interaction.respond(filtered);
}
