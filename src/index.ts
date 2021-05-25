import { Client } from "discord.js";
import * as dotenv from "dotenv";
import * as express from "express";
const app = express();


app.get('/', (req, res) => {
  res.send(`<img src='https://i.imgur.com/6ln1Rpn.png'></img>`);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`helloworld: listening on port ${port}`);
});

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