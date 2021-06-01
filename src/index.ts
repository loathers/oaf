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
variableManager.fetchAll(requiredVariables).then(() => {
  const kolClient = new KOLClient(variableManager);
  const wikiSearcher = new WikiSearcher(variableManager, kolClient);
  wikiSearcher.downloadMafiaData().then(() => {
    const discordClient = new DiscordClient(variableManager, wikiSearcher);

    attachMiscCommands(discordClient);
    attachClanCommands(discordClient, kolClient);
    discordClient.attachWikiSearchCommand();

    discordClient.start();
  });
});
