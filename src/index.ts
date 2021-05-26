
import { DiscordClient } from "./discord";
import { attachUtils } from "./utils";
import { VariableManager } from "./variables";


const variableManager = new VariableManager();
const client = new DiscordClient(variableManager);

attachUtils(client);

const requiredVariables = [
    "DISCORD_TOKEN",
    "CUSTOM_SEARCH",
    "GOOGLE_API_KEY",
]

variableManager.fetchAll(requiredVariables).then(() => {
        client.start();
    }
)
