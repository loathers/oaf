import { Client } from "discord.js";
import * as dotenv from "dotenv";
import { startWebserver } from "./webserver";

dotenv.config({ path: __dirname+'/.env' });


const client = new Client();

client.on('ready', () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
});

  
client.on('message', msg => {
    if (msg.content.toLowerCase().includes('good bot')) {
        msg.reply('<3');
    }
});


startWebserver(parseInt(process.env.PORT || "8080") || 8080);
client.login(process.env.DISCORD_TOKEN);
