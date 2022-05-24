import { Message, TextChannel } from "discord.js";
import { ORB_RESPONSES } from "./constants";
import { DiscordClient } from "./discord";

export function attachMiscCommands(client: DiscordClient) {
  client.attachCommand("orb", orb, "Consult OAF's miniature crystal ball.");
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
  client.attachCommand(
    "prswelcome",
    prsWelcome,
    "Links to the PRs and issues assigned to you for a given LASS project"
  );
}

function orb(message: Message): void {
  message.channel.send(
    `O.A.F. gazes into the mini crystal ball. "${
      ORB_RESPONSES[Math.floor(Math.random() * ORB_RESPONSES.length)]
    }", they report.`
  );
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

function prsWelcome(message: Message, args: string[]): void {
  if (args.length === 0) {
    message.reply(":grep:");
    return;
  }

  const aliases: Map<string, string> = new Map([
    ["garbo", "garbage-collector"],
    ["freecandy", "freecandydotexe"],
    ["garfjalen", "kol-scripting-resources"],
    ["mafia", "kolmafia"],
    ["oaf", "oaf-js"],
  ]);

  const project = aliases.get(args[1].toLowerCase()) ?? args[1].toLowerCase();

  const capitalizations: Map<string, string> = new Map([
    ["tourguide", "TourGuide"],
    ["chit", "ChIT"],
    ["kol-scripting-resources", "KoL-Scripting-Resources"],
    ["cagebot", "Cagebot"],
    ["uberpvpoptimizer", "UberPvPOptimizer"],
  ]);

  const capitalizedProject = capitalizations.get(project) ?? project;

  message.channel.send(
    `https://github.com/${
      capitalizedProject === "kolmafia" ? "kolmafia" : "Loathing-Associates-Scripting-Society"
    }/${capitalizedProject}/issues?q=is%3Aopen+assignee%3A%40me`
  );
}
