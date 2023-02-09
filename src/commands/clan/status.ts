import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";

import { clanState, DREAD_CLANS } from "../../clans";
import { KOLClient } from "../../kol";
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

async function clanStatus(interaction: CommandInteraction, kolClient: KOLClient) {
  let messageString = "";
  await interaction.deferReply();
  try {
    for (let clan of DREAD_CLANS) {
      const overview = await kolClient.getDreadStatusOverview(clan.id);
      const capacitorString = overview.capacitor
        ? `${!overview.castle ? 0 : overview.skills} skill${
            !overview.castle || overview.skills != 1 ? "s" : ""
          } left`
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

async function detailedClanStatus(
  interaction: CommandInteraction,
  kolClient: KOLClient
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
    const embed = new MessageEmbed().setTitle(`Status update for ${clan.name}`);
    embed.setDescription(
      `Kills remaining: ${status.overview.forest}/${status.overview.village}/${status.overview.castle}`
    );
    let forestString = "";
    if (status.overview.forest) {
      if (!status.forest.attic) forestString += "**Cabin attic needs unlocking.**\n";
      if (status.forest.watchtower)
        forestString += "Watchtower open, you can grab freddies if you like.\n";
      if (status.forest.auditor) forestString += "~~Auditor's badge claimed.~~\n";
      else
        forestString +=
          "Auditor's badge available.\n\u00a0\u00a0\u00a0\u00a0*Cabin \u2192 Basement \u2192 Lockbox*\n";
      if (status.forest.musicbox) forestString += "~~Intricate music box parts claimed.~~\n";
      else
        forestString +=
          "Intricate music box parts available.\n\u00a0\u00a0\u00a0\u00a0*Cabin \u2192 Attic \u2192 Music Box*\n\u00a0\u00a0\u00a0\u00a0*Requires Accordion Thief*\n\u00a0\u00a0\u00a0\u00a0*Also banishes spooky from forest*\n";
      if (status.forest.kiwi) forestString += "~~Blood kiwi claimed.~~\n";
      else
        forestString +=
          "Blood kiwi available.\n\u00a0\u00a0\u00a0\u00a0*Person A: Tree \u2192 Root Around \u2192 Look Up*\n\u00a0\u00a0\u00a0\u00a0*Person B: Tree \u2192 Climb \u2192 Stomp*\n\u00a0\u00a0\u00a0\u00a0*Requires muscle class (Person B)*\n";
      if (status.forest.amber) forestString += "~~Moon-amber claimed.~~\n";
      else
        forestString +=
          "Moon-amber available.\n\u00a0\u00a0\u00a0\u00a0*Tree \u2192 Climb \u2192 Shiny Thing*\n\u00a0\u00a0\u00a0\u00a0*Requires muscle class*\n";
    } else forestString += "~~Forest fully cleared.~~\n";
    let villageString = "";
    if (status.overview.village) {
      if (status.village.schoolhouse)
        villageString +=
          "Schoolhouse is open, go get your pencils!\n\u00a0\u00a0\u00a0\u00a0*Square \u2192 Schoolhouse \u2192 Desk*\n";
      if (status.village.suite)
        villageString +=
          "Master suite is open, grab some eau de mort?\n\u00a0\u00a0\u00a0\u00a0*Duke's Estate \u2192 Master Suite \u2192 Nightstand*\n";
      if (status.village.hanging) villageString += "~~Hanging complete.~~\n";
      else
        villageString +=
          "Hanging available.\n\u00a0\u00a0\u00a0\u00a0*Person A: Square \u2192 Gallows \u2192 Stand on Trap Door*\n\u00a0\u00a0\u00a0\u00a0*Person B: Square \u2192 Gallows \u2192 Pull Lever*\n";
    } else villageString += "~~Village fully cleared.~~\n";
    let castleString = "";
    if (status.overview.castle) {
      if (!status.castle.lab) castleString += "**Lab needs unlocking.**\n";
      else {
        if (status.overview.capacitor)
          castleString += status.overview.skills
            ? `${status.overview.skills} skill${
                status.overview.skills != 1 ? "s" : ""
              } available.\n`
            : "~~All skills claimed.~~\n";
        else castleString += "Machine needs repairing (with skull capacitor).\n";
      }
      if (status.castle.roast) castleString += "~~Dreadful roast claimed.~~\n";
      else
        castleString +=
          "Dreadful roast available.\n\u00a0\u00a0\u00a0\u00a0*Great Hall \u2192 Dining Room \u2192 Grab roast*\n";
      if (status.castle.banana) castleString += "~~Wax banana claimed.~~\n";
      else
        castleString +=
          "Wax banana available.\n\u00a0\u00a0\u00a0\u00a0*Great Hall \u2192 Dining Room \u2192 Levitate*\n\u00a0\u00a0\u00a0\u00a0*Requires myst class*\n";
      if (status.castle.agaricus) castleString += "~~Stinking agaricus claimed.~~\n";
      else
        castleString +=
          "Stinking agaricus available.\n\u00a0\u00a0\u00a0\u00a0*Dungeons \u2192 Guard Room \u2192 Break off bits*\n";
    } else castleString += "~~Castle fully cleared.~~\n";
    embed.addFields([
      {
        name: `__**Forest**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[0])})`,
        value: forestString,
      },
      {
        name: `__**Village**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[1])})`,
        value: villageString,
      },
      {
        name: `__**Castle**__ (${DREAD_BOSS_MAPPINGS.get(status.overview.bosses[2])})`,
        value: castleString,
      },
    ]);
    embed.setFooter({
      text: "Problems? Message DocRostov#7004 on discord.",
      iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
    });
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
