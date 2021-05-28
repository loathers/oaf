
import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachUtils } from "./utils";
import { VariableManager } from "./variables";

const requiredVariables = [
    "DISCORD_TOKEN",
    "CUSTOM_SEARCH",
    "GOOGLE_API_KEY",
    "COMMAND_SYMBOL",
]

const variableManager = new VariableManager();
variableManager.fetchAll(requiredVariables).then(() => {
    const wikiSearcher = new WikiSearcher(variableManager);
    wikiSearcher.downloadMafiaData().then(() => {
        const client = new DiscordClient(variableManager, wikiSearcher);
        
        attachUtils(client);
        
        client.start();
    });
});
