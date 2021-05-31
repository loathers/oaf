import { Message } from "discord.js";
import { DiscordClient } from "./discord";

export function miscCommands(client: DiscordClient) {
  client.addCommand("8ball", eightBall);
  client.addCommand("roll", roll);
}

function eightBall(message: Message): void {
  message.channel.send(eightBallRolls[Math.floor(Math.random() * eightBallRolls.length)]);
}

function roll(message: Message): void {
  try {
    const args = message.content.substring(6).split("d");
    const diceCount = parseInt(args[0]);
    const diceSize = parseInt(args[1]);
    if (isNaN(diceCount + diceSize))
      message.channel.send("Something about that didn't work. Don't feed me garbage.");
    else if (diceCount > 100)
      message.channel.send(
        "The number of dice you tried to roll is greater than 100. Try 100 or less."
      );
    else if (diceCount < 1) message.channel.send("Please roll at least one die.");
    else if (diceSize > 1000000)
      message.channel.send(
        "The size of dice you tried to roll is greater than 1000000. Try 1000000 or less."
      );
    else if (diceSize < 0) message.channel.send("Please roll positive integer sized dice.");
    else {
      let sum = 0;

      for (let i = 0; i < diceCount; i++) {
        sum += 1 + Math.floor(Math.random() * diceSize);
      }
      message.channel.send(`Rolled ${sum} on ${diceCount}d${diceSize}`);
    }
  } catch {
    message.channel.send("Something about that didn't work. Don't feed me garbage.");
  }
}

const eightBallRolls = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "If CDM has a free moment, sure.",
  "Why not?",
  "How am I meant to know?",
  "I guess???",
  "...you realise that this is just a random choice from a list of strings, right?",
  "I have literally no way to tell.",
  "Ping Bobson, he probably knows",
  "Check the wiki, answer's probably in there somewhere.",
  "The wiki has the answer.",
  "The wiki has the answer, but it's wrong.",
  "I've not finished spading the answer to that question yet.",
  "The devs know, go pester them instead of me.",
  "INSUFFICIENT DATA FOR MEANINGFUL ANSWER",
  "THERE IS AS YET INSUFFICIENT DATA FOR A MEANINGFUL ANSWER",
];
