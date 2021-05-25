import { Client } from "discord.js";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });


const client = new Client();

client.on('ready', () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
  });

  
client.on('message', msg => {
    if (msg.content === 'hello') {
      msg.reply('hello!');
    }
  });

client.login(process.env.DISCORD_TOKEN);