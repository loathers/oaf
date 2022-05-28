import { Client, Message, NonThreadGuildBasedChannel, TextChannel } from "discord.js";
import { Pool } from "pg";
import { ORB_RESPONSES } from "./constants";
import { DiscordClient } from "./discord";

export function attachMiscCommands(client: DiscordClient, databaseConnectionPool: Pool) {
  // client.attachCommand("orb", orb, "Consult OAF's miniature crystal ball.");
  // client.attachCommand("roll", roll, "Roll the specified dice of the form <x>d<y>.");
  // client.attachCommand(
  //   "purge",
  //   async (message, args) =>
  //     await purge(
  //       message.channel as TextChannel,
  //       client,
  //       parseInt(args[1]) ? parseInt(args[1]) : 1
  //     ),
  //   "Purges the last x messages from OAF in this channel."
  // );
  // client.attachCommand(
  //   "oops",
  //   async (message) => await purge(message.channel as TextChannel, client, 1),
  //   "Purges OAF's last message in this channel."
  // );
  // client.attachCommand(
  //   "prswelcome",
  //   prsWelcome,
  //   "Links to the PRs and issues assigned to you for a given LASS project"
  // );
  // client.attachCommand(
  //   "remind",
  //   (message, args) => createReminder(message, args, databaseConnectionPool),
  //   "Sets a reminder"
  // );
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
  for (let message of await channel.messages.fetch()) {
    if (message[1].author.id === client?.client()?.user?.id) {
      await message[1].delete();
      purged += 1;
      if (purged >= quantity) return;
    }
  }
}

function prsWelcome(message: Message, args: string[]): void {
  if (args.length < 2) {
    message.channel.send("I need a project for that.");
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
    }/${capitalizedProject}/pulls?q=is%3Apr+is%3Aopen+user-review-requested%3A%40me`
  );
}

const timeMatcher =
  /^(?<weeks>\d+w)?(?<days>\d+d)?(?<hours>\d+h)?(?<minutes>\d+m)?(?<seconds>\d+s)?$/;

async function createReminder(message: Message, args: string[], databaseConnectionPool: Pool) {
  if (args.length < 2 || (!timeMatcher.test(args[1]) && args[1] !== "rollover")) {
    message.channel.send(
      'You must supply a time to wait in the form of "1w2d3h4m5s" or "rollover".'
    );
    return;
  }
  const reminderText = "⏰";
  if (timeMatcher.test(args[1])) {
    const timeMatch = timeMatcher.exec(args[1]);
    const timeToWait =
      7 * 24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.weeks || "0") +
      24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.days || "0") +
      60 * 60 * 1000 * parseInt(timeMatch?.groups?.hours || "0") +
      60 * 1000 * parseInt(timeMatch?.groups?.minutes || "0") +
      1000 * parseInt(timeMatch?.groups?.seconds || "0");
    const reminderTime = Date.now() + timeToWait;

    if (timeToWait < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(
        () =>
          message.channel.send({
            reply: { messageReference: message.id },
            content: reminderText,
          }),
        timeToWait
      );
    }
    message.channel.send(`Okay, I'll remind you in ${args[1]}.`);
    await databaseConnectionPool.query(
      "INSERT INTO reminders(guild_id, channel_id, message_id, message_contents, reminder_time) VALUES ($1, $2, $3, $4, $5);",
      [message.guildId, message.channelId, message.id, reminderText, reminderTime]
    );
  } else {
    let reminderTime = new Date(Date.now()).setHours(3, 40);
    if (reminderTime < Date.now()) {
      reminderTime += 24 * 60 * 60 * 1000;
    }
    const timeToWait = reminderTime - Date.now();

    if (timeToWait < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(
        () =>
          message.channel.send({
            reply: { messageReference: message.id },
            content: reminderText,
          }),
        timeToWait
      );
    }
    message.channel.send(`Okay, I'll remind you just after rollover`);
    await databaseConnectionPool.query(
      "INSERT INTO reminders(guild_id, channel_id, message_id, message_contents, reminder_time) VALUES ($1, $2, $3, $4, $5);",
      [message.guildId, message.channelId, message.id, reminderText, reminderTime]
    );
  }
}

export async function syncReminders(databaseConnectionPool: Pool, discordClient: Client) {
  const now = Date.now();
  const connection = await databaseConnectionPool.connect();
  await connection.query("BEGIN;");
  await connection.query("DELETE FROM reminders WHERE reminder_time < $1;", [now]);
  const reminders = await connection.query("SELECT * FROM reminders", []);
  await connection.query("COMMIT;");
  connection.release();
  for (let reminder of reminders.rows) {
    const guild = await discordClient.guilds.fetch(reminder.guild_id);
    const channel = await guild.channels.fetch(reminder.channel_id);
    if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        try {
          (channel as TextChannel).send({
            reply: { messageReference: reminder.message_id },
            content: reminder.message_contents,
          });
        } catch {}
      }, reminder.reminder_time - now);
    }
  }
}
