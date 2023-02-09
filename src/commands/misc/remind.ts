import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { Client, CommandInteraction, DMChannel, TextChannel } from "discord.js";
import { Pool } from "pg";

import { Command } from "../type";

const timeMatcher =
  /^(?<weeks>\d+w)?(?<days>\d+d)?(?<hours>\d+h)?(?<minutes>\d+m)?(?<seconds>\d+s)?$/;

async function createReminder(interaction: CommandInteraction, databasePool: Pool) {
  const time = interaction.options.getString("when", true);
  const reminderText = interaction.options.getString("reminder") || "Time's up!";
  if (!timeMatcher.test(time) && time.toLowerCase() !== "rollover") {
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
  let timeToWait = 0;
  let reminderTime = 0;
  if (timeMatcher.test(time)) {
    const timeMatch = timeMatcher.exec(time);
    timeToWait =
      7 * 24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.weeks || "0") +
      24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.days || "0") +
      60 * 60 * 1000 * parseInt(timeMatch?.groups?.hours || "0") +
      60 * 1000 * parseInt(timeMatch?.groups?.minutes || "0") +
      1000 * parseInt(timeMatch?.groups?.seconds || "0");
    reminderTime = Date.now() + timeToWait;
    await interaction.reply(`Okay, I'll remind you in ${time}.`);
  } else {
    reminderTime = new Date(Date.now()).setHours(3, 40);
    if (reminderTime < Date.now()) {
      reminderTime += 24 * 60 * 60 * 1000;
    }
    timeToWait = reminderTime - Date.now();
    await interaction.reply(`Okay, I'll remind you after rollover.`);
  }

  const reply_id = (await interaction.fetchReply()).id;

  if (timeToWait < 7 * 24 * 60 * 60 * 1000) {
    setTimeout(async () => {
      try {
        ((interaction.channel as TextChannel) || (await interaction.user.createDM())).send({
          content: `<@${interaction.user.id}>`,
          embeds: [{ title: "⏰⏰⏰", description: reminderText }],
          reply: { messageReference: reply_id },
          allowedMentions: {
            users: [interaction.user.id],
          },
        });
      } catch (error) {
        console.log(error);
      }
    }, timeToWait);
    await databasePool.query(
      "INSERT INTO reminders(guild_id, channel_id, user_id, interaction_reply_id, message_contents, reminder_time) VALUES ($1, $2, $3, $4, $5, $6);",
      [
        interaction.guildId,
        interaction.channelId,
        interaction.user.id,
        reply_id,
        reminderText,
        reminderTime,
      ]
    );
  }
}

const sync: NonNullable<Command["sync"]> = async ({ databasePool, discordClient, ...rest }) => {
  const now = Date.now();
  const connection = await databasePool.connect();
  await connection.query("BEGIN;");
  await connection.query("DELETE FROM reminders WHERE reminder_time < $1;", [now]);
  const reminders = await connection.query("SELECT * FROM reminders", []);
  await connection.query("COMMIT;");
  connection.release();
  for (let reminder of reminders.rows) {
    if (reminder.guild_id) {
      if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
        const guild = await discordClient.client().guilds.fetch(reminder.guild_id);
        const channel = await guild.channels.fetch(reminder.channel_id);
        setTimeout(() => {
          try {
            (channel as TextChannel).send({
              content: `<@${reminder.user_id}>`,
              embeds: [{ title: "⏰⏰⏰", description: reminder.message_contents }],
              allowedMentions: {
                users: [reminder.user_id],
              },
              ...(reminder.interaction_reply_id
                ? { reply: { messageReference: reminder.interaction_reply_id } }
                : {}),
            });
          } catch (error) {
            console.log(error);
          }
        }, reminder.reminder_time - now);
      }
    } else {
      if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
        const user = await discordClient.client().users.fetch(reminder.user_id);
        const channel = await user.createDM();
        setTimeout(() => {
          try {
            (channel as DMChannel).send({
              content: `<@${reminder.user_id}>`,
              embeds: [{ title: "⏰⏰⏰", description: reminder.message_contents }],
              allowedMentions: {
                users: [reminder.user_id],
              },
              ...(reminder.interaction_reply_id
                ? { reply: { messageReference: reminder.interaction_reply_id } }
                : {}),
            });
          } catch (error) {
            console.log(error);
          }
        }, reminder.reminder_time - now);
      }
    }
  }
  setTimeout(async () => {
    await sync({ databasePool, discordClient, ...rest });
  }, 7 * 24 * 60 * 60 * 1000);
};

const command: Command = {
  attach: ({ discordClient, databasePool }) =>
    discordClient.attachCommand(
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
          required: false,
        },
      ],
      (interaction) => createReminder(interaction, databasePool),
      "Sets a reminder"
    ),
  sync,
};

export default command;
