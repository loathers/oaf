import { ApplicationCommandOptionType } from "discord-api-types/v9";
import {
  Client,
  CommandInteraction,
  DMChannel,
  Message,
  NonThreadGuildBasedChannel,
  TextChannel,
} from "discord.js";
import { Pool } from "pg";
import { ORB_RESPONSES, PROJECT_ALIASES, PROJECT_CAPITALISATIONS } from "./constants";
import { DiscordClient } from "./discord";

export function attachMiscCommands(client: DiscordClient, databaseConnectionPool: Pool) {
  client.attachCommand(
    "orb",
    [
      {
        name: "asktheorb",
        description: "THE ORB KNOWS ALL",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    orb,
    "Consult OAF's miniature crystal ball."
  );
  client.attachCommand(
    "roll",
    [
      {
        name: "count",
        description: "Number of dice to roll",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "size",
        description: "Number of sides on each die",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    roll,
    "Roll the specified dice of the form."
  );
  client.attachCommand(
    "purge",
    [
      {
        name: "count",
        description: "Quantity of messages to purge",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    async (interaction: CommandInteraction) =>
      await purge(
        interaction.channel as TextChannel,
        client,
        interaction.options.getInteger("count", true)
      ),
    "Purges the last x messages from OAF in this channel."
  );
  client.attachCommand(
    "oops",
    [],
    async (interaction: CommandInteraction) =>
      await purge(interaction.channel as TextChannel, client, 1),
    "Purges OAF's last message in this channel."
  );
  client.attachCommand(
    "prswelcome",
    [
      {
        name: "repository",
        description: "Name of the project to link",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    prsWelcome,
    "Links to the PRs and issues assigned to you for a given LASS project"
  );
  client.attachCommand(
    "remind",
    [
      {
        name: "when",
        description: 'When to remind you (In either the form "1w2d3h4m5s" or "rollover")',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reminder",
        description: "What to remind you",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    (interaction) => createReminder(interaction, databaseConnectionPool),
    "Sets a reminder"
  );
}

function orb(interaction: CommandInteraction): void {
  const question = interaction.options.getString("asktheorb");
  interaction.reply({
    content: `${
      question ? `"${question}", you ask.\n` : ""
    }O.A.F. gazes into the mini crystal ball. "${
      ORB_RESPONSES[Math.floor(Math.random() * ORB_RESPONSES.length)]
    }", they report.`,
    allowedMentions: {
      parse: [],
    },
  });
}

function roll(interaction: CommandInteraction): void {
  const diceCount = interaction.options.getInteger("count", true);
  const diceSize = interaction.options.getInteger("size", true);
  if (diceCount > 100)
    interaction.reply("The number of dice you tried to roll is greater than 100. Try 100 or less.");
  else if (diceCount < 1) interaction.reply("Please roll at least one die.");
  else if (diceSize > 1000000)
    interaction.reply(
      "The size of dice you tried to roll is greater than 1000000. Try 1000000 or less."
    );
  else if (diceSize < 0) interaction.reply("Please roll positive integer sized dice.");
  else {
    let rolls = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(Math.floor(Math.random() * diceSize) + 1);
    }
    interaction.reply(
      `Rolled ${diceCount > 1 ? "a total of " : ""}${rolls.reduce(
        (acc, curr) => acc + curr
      )} on ${diceCount}d${diceSize}${
        diceCount > 1 ? ` (Individual rolls: ${rolls.join(", ")})` : "."
      }`
    );
  }
}

async function purge(channel: TextChannel, client: DiscordClient, quantity: number): Promise<void> {
  let purged = 0;
  if (quantity <= 0) return;
  for (let message of await channel.messages.fetch()) {
    if (message[1].author.id === client?.client()?.user?.id) {
      await message[1].delete();
      purged += 1;
      if (purged >= quantity) return;
    }
  }
}

function prsWelcome(interaction: CommandInteraction): void {
  const repo = interaction.options.getString("repository", true);

  const project = PROJECT_ALIASES.get(repo.toLowerCase()) ?? repo.toLowerCase();

  const capitalizedProject = PROJECT_CAPITALISATIONS.get(project) ?? project;

  interaction.reply({
    content: `https://github.com/${
      capitalizedProject === "kolmafia" ? "kolmafia" : "Loathing-Associates-Scripting-Society"
    }/${capitalizedProject}/pulls?q=is%3Apr+is%3Aopen+user-review-requested%3A%40me`,
    allowedMentions: {
      parse: [],
    },
  });
}

const timeMatcher =
  /^(?<weeks>\d+w)?(?<days>\d+d)?(?<hours>\d+h)?(?<minutes>\d+m)?(?<seconds>\d+s)?$/;

async function createReminder(interaction: CommandInteraction, databaseConnectionPool: Pool) {
  const time = interaction.options.getString("when", true);
  const reminderText = interaction.options.getString("reminder", true);
  if (!timeMatcher.test(time) && time !== "rollover") {
    interaction.reply({
      content: 'You must supply a time to wait in the form of "1w2d3h4m5s" or "rollover".',
      ephemeral: true,
    });
    return;
  }
  if (reminderText.length > 127) {
    interaction.reply({
      content: "Maximum reminder length is 128 characters.",
      ephemeral: true,
    });
    return;
  }
  if (timeMatcher.test(time)) {
    const timeMatch = timeMatcher.exec(time);
    const timeToWait =
      7 * 24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.weeks || "0") +
      24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.days || "0") +
      60 * 60 * 1000 * parseInt(timeMatch?.groups?.hours || "0") +
      60 * 1000 * parseInt(timeMatch?.groups?.minutes || "0") +
      1000 * parseInt(timeMatch?.groups?.seconds || "0");
    const reminderTime = Date.now() + timeToWait;

    if (timeToWait < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        try {
          (interaction.channel as TextChannel).send({
            content: `<@${interaction.user.id}>`,
            embeds: [{ title: "⏰⏰⏰", description: reminderText }],
            allowedMentions: {
              users: [interaction.user.id],
            },
          });
        } catch (error) {
          console.log(error);
        }
      }, timeToWait);
    }
    interaction.reply(`Okay, I'll remind you in ${time}.`);
    await databaseConnectionPool.query(
      "INSERT INTO reminders(guild_id, channel_id, user_id, message_contents, reminder_time) VALUES ($1, $2, $3, $4, $5);",
      [interaction.guildId, interaction.channelId, interaction.user.id, reminderText, reminderTime]
    );
  } else {
    let reminderTime = new Date(Date.now()).setHours(3, 40);
    if (reminderTime < Date.now()) {
      reminderTime += 24 * 60 * 60 * 1000;
    }
    const timeToWait = reminderTime - Date.now();

    if (timeToWait < 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        try {
          (interaction.channel as TextChannel).send({
            content: `<@${interaction.user.id}>`,
            embeds: [{ title: "⏰⏰⏰", description: reminderText }],
            allowedMentions: {
              users: [interaction.user.id],
            },
          });
        } catch (error) {
          console.log(error);
        }
      }, timeToWait);
    }
    interaction.reply(`Okay, I'll remind you just after rollover`);
    await databaseConnectionPool.query(
      "INSERT INTO reminders(guild_id, channel_id, user_id, message_contents, reminder_time) VALUES ($1, $2, $3, $4, $5);",
      [interaction.guildId, interaction.channelId, interaction.user.id, reminderText, reminderTime]
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
    if (reminder.guild_id) {
      if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
        const guild = await discordClient.guilds.fetch(reminder.guild_id);
        const channel = await guild.channels.fetch(reminder.channel_id);
        setTimeout(() => {
          try {
            (channel as TextChannel).send({
              content: `<@${reminder.user_id}>`,
              embeds: [{ title: "⏰⏰⏰", description: reminder.message_contents }],
              allowedMentions: {
                users: [reminder.user_id],
              },
            });
          } catch (error) {
            console.log(error);
          }
        }, reminder.reminder_time - now);
      }
    } else {
      if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
        const user = await discordClient.users.fetch(reminder.user_id);
        const channel = await user.createDM();
        setTimeout(() => {
          try {
            (channel as DMChannel).send({
              content: `<@${reminder.user_id}>`,
              embeds: [{ title: "⏰⏰⏰", description: reminder.message_contents }],
              allowedMentions: {
                users: [reminder.user_id],
              },
            });
          } catch (error) {
            console.log(error);
          }
        }, reminder.reminder_time - now);
      }
    }
  }
  setTimeout(async () => {
    await syncReminders(databaseConnectionPool, discordClient);
  }, 7 * 24 * 60 * 60 * 1000);
}
