
import { DiscordClient } from "./discord";
import { attachUtils } from "./utils";
import { VariableManager } from "./variables";


const varManager = new VariableManager();
console.log("Initialised variable manager")

const client = new DiscordClient();
console.log("Initialised discord client")
attachUtils(client);
console.log("Attached utility commands")

console.log("Starting discord client")
varManager.get("DISCORD_TOKEN").then((discord_token) => {
        console.log(`Retrieved discord token ${discord_token}`)
        client.start(discord_token || "");
    }
)
