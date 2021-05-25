import * as dotenv from "dotenv";
import { DiscordClient } from "./discord";
import { attachUtils } from "./utils";
import { startWebserver } from "./webserver";

dotenv.config({ path: __dirname+'/.env' });


const WEBSERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";


startWebserver(WEBSERVER_PORT);
const client = new DiscordClient();

attachUtils(client);

client.start(DISCORD_TOKEN);
