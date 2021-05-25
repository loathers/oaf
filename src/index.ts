import { Client } from "discord.js";
import * as dotenv from "dotenv";
import { DiscordClient } from "./discord";
import { startWebserver } from "./webserver";

dotenv.config({ path: __dirname+'/.env' });


const WEBSERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";


startWebserver(WEBSERVER_PORT);
new DiscordClient().start(DISCORD_TOKEN);
