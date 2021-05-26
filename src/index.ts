
import { DiscordClient } from "./discord";
import { attachUtils } from "./utils";
import { VariableManager } from "./variables";


const varManager = new VariableManager();

const client = new DiscordClient();
attachUtils(client);

varManager.get("DISCORD_TOKEN").then((discord_token) => {
        client.start(discord_token || "");
    }
)
