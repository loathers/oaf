import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachMiscCommands } from "./misccommands";
import { VariableManager } from "./variables";
import { KOLClient } from "./kolclient";
import { attachClanCommands } from "./raidlogs";

const requiredVariables = [
  "DISCORD_TOKEN",
  "CUSTOM_SEARCH",
  "GOOGLE_API_KEY",
  "COMMAND_SYMBOL",
  "KOL_USER",
  "KOL_PASS",
];

const variableManager = new VariableManager();
console.log("Fetching variables.");
variableManager.fetchAll(requiredVariables).then(() => {
  console.log("Creating KOL client.");
  const kolClient = new KOLClient(variableManager);
  console.log("Creating wiki searcher.");
  const wikiSearcher = new WikiSearcher(variableManager, kolClient);
  console.log("Downloading mafia data.");
  wikiSearcher.downloadMafiaData().then(() => {
    console.log("All mafia data downloaded.");
    console.log("Creating discord client.");
    const discordClient = new DiscordClient(variableManager, wikiSearcher);
    console.log("Attaching misc commands.");
    attachMiscCommands(discordClient);
    console.log("Attaching clan commands.");
    attachClanCommands(discordClient, kolClient);
    console.log("Attaching wiki commands.");
    discordClient.attachWikiSearchCommand();

    console.log("Starting bot.");
    discordClient.start();
  });
});
