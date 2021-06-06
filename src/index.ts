import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachMiscCommands } from "./misccommands";
import { KOLClient } from "./kolclient";
import { attachClanCommands } from "./raidlogs";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/.env" });

console.log("Creating KOL client.");
const kolClient = new KOLClient();
console.log("Creating wiki searcher.");
const wikiSearcher = new WikiSearcher(kolClient);
console.log("Downloading mafia data.");
wikiSearcher.downloadMafiaData().then(() => {
  console.log("All mafia data downloaded.");
  console.log("Creating discord client.");
  const discordClient = new DiscordClient(wikiSearcher);
  console.log("Attaching misc commands.");
  attachMiscCommands(discordClient);
  console.log("Attaching clan commands.");
  attachClanCommands(discordClient, kolClient);
  console.log("Attaching wiki commands.");
  discordClient.attachWikiSearchCommand();

  console.log("Starting bot.");
  discordClient.start();
});
