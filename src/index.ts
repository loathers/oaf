import * as dotenv from "dotenv";
import { DiscordClient } from "./discord";
import { attachUtils } from "./utils";

dotenv.config({ path: __dirname+'/.env' });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";

const client = new DiscordClient();
attachUtils(client);

client.start(DISCORD_TOKEN);
