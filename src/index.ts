import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachUtils } from "./utils";
import { VariableManager } from "./variables";
import { KOLClient } from "./kolclient";

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
    const client = new DiscordClient(variableManager, wikiSearcher);

    attachUtils(client);

    client.start();
  });
});
