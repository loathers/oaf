import { Message } from "discord.js";
import { DiscordClient } from "./discord";
import { KOLClient } from "./kolclient";

type Clan = {
  name: string;
  id: number;
};

const clans: Clan[] = [
  {
    name: "Collaborative Dungeon Running 1",
    id: 2047008362,
  },
  {
    name: "Collaborative Dungeon Running 2",
    id: 2047008363,
  },
];

export function attachClanCommands(discordClient: DiscordClient, kolClient: KOLClient) {
  discordClient.addCommand("status", (message) => clanStatus(message, kolClient));
}

async function clanStatus(message: Message, kolClient: KOLClient): Promise<void> {
  let messageString = "";
  for (let clan of clans) {
    await kolClient.whitelist(clan.id);
    const logs = await kolClient.getDreadStatus();
    const capacitorString = logs.capacitor
      ? `${logs.skills} skill${logs.skills != 1 ? "s" : ""} left`
      : "Needs capacitor";
    messageString += `${clan.name}: ${logs.forest}/${logs.village}/${logs.castle} (${capacitorString})\n`;
  }
  await message.channel.send(messageString);
}
