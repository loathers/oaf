import { Message } from "discord.js";
import { DiscordClient } from "./discord";
import { KOLClient } from "./kolclient";

type Clan = {
  name: string;
  synonyms: string[];
  id: number;
};

const clans: Clan[] = [
  {
    name: "Collaborative Dungeon Running 1",
    synonyms: ["cdr1", "1"],
    id: 2047008362,
  },
  {
    name: "Collaborative Dungeon Running 2",
    synonyms: ["cdr2", "2"],
    id: 2047008363,
  },
];

export function attachClanCommands(discordClient: DiscordClient, kolClient: KOLClient) {
  discordClient.attachCommand("status", (message) => clanStatus(message, kolClient));
  discordClient.attachCommand("clan", (message, args) =>
    detailedClanStatus(message, args[1], kolClient)
  );
}

async function clanStatus(message: Message, kolClient: KOLClient): Promise<void> {
  let messageString = "__DREAD STATUS__\n";
  const responseMessage = await message.channel.send(
    "Fetching status for all clans, watch this space!"
  );
  for (let clan of clans) {
    await kolClient.whitelist(clan.id);
    const overview = await kolClient.getDreadStatusOverview();
    const capacitorString = overview.capacitor
      ? `${overview.skills} skill${overview.skills != 1 ? "s" : ""} left`
      : "Needs capacitor";
    messageString += `**${clan.name}**: ${overview.forest}/${overview.village}/${overview.castle} (${capacitorString})\n`;
  }
  await responseMessage.edit(messageString);
}

async function detailedClanStatus(
  message: Message,
  clanName: string,
  kolClient: KOLClient
): Promise<void> {
  const clan = clans.find(
    (clan) => clan.name.toLowerCase() === clanName || clan.synonyms.includes(clanName)
  );
  if (!clan) {
    message.channel.send("Clan not recognised.");
    return;
  }
  const responseMessage = await message.channel.send(
    `Fetching status for clan ${clan.name}, watch this space!!`
  );
  await kolClient.whitelist(clan.id);
  const status = await kolClient.getDetailedDreadStatus();
  let returnString = `__**STATUS UPDATE FOR ${clan.name.toUpperCase()}**__\n`;
  returnString += `${status.overview.forest}/${status.overview.village}/${status.overview.castle} kills remaining.\n\n`;
  returnString += "__FOREST__\n";
  if (status.overview.forest) {
    if (!status.forest.attic) returnString += "**Cabin attic needs unlocking.**\n";
    if (status.forest.watchtower)
      returnString += "Watchtower open, you can grab freddies if you like.\n";
    if (status.forest.auditor) returnString += "~~Auditor's badge claimed.~~\n";
    else returnString += "Auditor's badge available. (Cabin -> Basement -> Lockbox)\n";
    if (status.forest.musicbox) returnString += "~~Intricate music box parts claimed.~~\n";
    else
      returnString +=
        "Intricate music box parts available. (Cabin -> Attic -> Music Box as AT (also banishes spooky from forest))\n";
    if (status.forest.kiwi) returnString += "~~Blood kiwi claimed.~~\n";
    else returnString += "Blood kiwi available. (Tree, Root Around -> Look Up + Climb -> Stomp)\n";
    if (status.forest.amber) returnString += "~~Moon-amber claimed.~~\n";
    else
      returnString +=
        "Moon-amber available. (Tree -> Climb -> Shiny Thing (requires muscle class)\n";
  } else returnString += "~~Forest fully cleared.~~\n";
  returnString += "\n";
  returnString += "__VILLAGE__\n";
  if (status.overview.village) {
    if (!status.village.schoolhouse) returnString += "Schoolhouse is open, go get your pencils!\n";
    if (status.village.suite) returnString += "Master suite is open, grab some eau de mort?\n";
    if (status.village.hanging) returnString += "~~Hanging complete.~~\n";
    else
      returnString +=
        "Hanging available. (Square, Gallows -> Stand on Trap Door + Gallows -> Pull Lever)\n";
  } else returnString += "~~Village fully cleared.~~\n";
  returnString += "\n";
  returnString += "__CASTLE__\n";
  if (status.overview.castle) {
    if (!status.castle.lab) returnString += "**Lab needs unlocking.**\n";
    else {
      if (status.overview.capacitor)
        returnString += status.overview.skills
          ? `${status.overview.skills} skill${status.overview.skills != 1 ? "s" : ""} available\n`
          : "~~All skills claimed.~~\n";
      else returnString += "Machine needs repairing (with skull capacitor).\n";
    }
    if (status.castle.roast) returnString += "~~Dreadful roast claimed.~~\n";
    else returnString += "Dreadful roast available. (Great Hall -> Dining Room -> Grab roast)\n";
    if (status.castle.banana) returnString += "~~Wax banana claimed.~~\n";
    else
      returnString +=
        "Wax banana available. (Great Hall -> Dining Room -> Levitate (requires myst class)\n";
    if (status.castle.agaricus) returnString += "~~Stinking agaricus claimed.~~\n";
    else
      returnString += "Stinking agaricus available. (Dungeons -> Guard Room -> Break off bits)\n";
  } else returnString += "~~Castle fully cleared.~~\n";
  await responseMessage.edit(returnString);
}
