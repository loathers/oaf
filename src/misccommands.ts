import { Message, TextChannel } from "discord.js";
import { EIGHTBALL_RESPONSES } from "./constants";
import { DiscordClient } from "./discord";

export function attachMiscCommands(client: DiscordClient) {
  client.attachCommand("8ball", eightBall, "Consult OAF's Magic 8 Ball.");
  client.attachCommand("roll", roll, "Roll the specified dice of the form <x>d<y>.");
  client.attachCommand(
    "purge",
    async (message, args) =>
      await purge(
        message.channel as TextChannel,
        client,
        parseInt(args[1]) ? parseInt(args[1]) : 1
      ),
    "Purges the last x messages from OAF in this channel."
  );
  client.attachCommand(
    "oops",
    async (message) => await purge(message.channel as TextChannel, client, 1),
    "Purges OAF's last message in this channel."
  );
}

function eightBall(message: Message): void {
  message.channel.send(EIGHTBALL_RESPONSES[Math.floor(Math.random() * EIGHTBALL_RESPONSES.length)]);
}

function roll(message: Message, args: string[]): void {
  try {
    const dice = args[1].split("d");
    const diceCount = parseInt(dice[0]);
    const diceSize = parseInt(dice[1]);
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
      let rolls = [];
      for (let i = 0; i < diceCount; i++) {
        rolls.push(Math.floor(Math.random() * diceSize) + 1);
      }
      message.channel.send(
        `Rolled ${diceCount > 1 ? "a total of " : ""}${rolls.reduce(
          (acc, curr) => acc + curr
        )} on ${diceCount}d${diceSize}${
          diceCount > 1 ? ` (Individual rolls: ${rolls.join(", ")})` : "."
        }`
      );
    }
  } catch {
    message.channel.send("Something about that didn't work. Don't feed me garbage.");
  }
}

async function purge(channel: TextChannel, client: DiscordClient, quantity: number): Promise<void> {
  let purged = 0;
  for (let message of (await channel.messages.fetch()).array()) {
    if (message.author.id === client?.client()?.user?.id) {
      await message.delete();
      purged += 1;
      if (purged >= quantity) return;
    }
  }
}
