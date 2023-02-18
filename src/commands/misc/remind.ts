import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { pool } from "../../db";
import { discordClient } from "../../discord";

const timeMatcher =
  /^(?<weeks>\d+w)?(?<days>\d+d)?(?<hours>\d+h)?(?<minutes>\d+m)?(?<seconds>\d+s)?$/;

export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Sets a reminder")
  .addStringOption((option) =>
    option
      .setName("when")
      .setDescription('When to remind you (In either the form "1w2d3h4m5s" or "rollover")')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("reminder").setDescription("What to remind you").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
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

  if (timeToWait >= 7 * 24 * 60 * 60 * 1000) return;

  const channel = interaction.channel || (await interaction.user.createDM());

  if (!("send" in channel)) {
    console.log("Skipping reminder because requested is not a text channel", channel.id);
    return;
  }

  setTimeout(async () => {
    try {
      channel.send({
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

  await pool.query(
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

export async function sync() {
  const now = Date.now();
  const connection = await pool.connect();
  await connection.query("BEGIN;");
  await connection.query("DELETE FROM reminders WHERE reminder_time < $1;", [now]);
  const reminders = await connection.query("SELECT * FROM reminders", []);
  await connection.query("COMMIT;");
  connection.release();
  for (let reminder of reminders.rows) {
    if (reminder.guild_id) {
      if (reminder.reminder_time - now < 7 * 24 * 60 * 60 * 1000) {
        const channel = await discordClient.client().channels.cache.get(reminder.channel_id);

        if (!channel) {
          console.log("Skipping reminder due to nknown channel", reminder.channel_id);
          continue;
        }

        if (!("send" in channel)) {
          console.log("Skipping reminder because requested is not a text channel", channel.id);
          return;
        }

        setTimeout(() => {
          try {
            channel.send({
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
            channel.send({
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
    await sync();
  }, 7 * 24 * 60 * 60 * 1000);
}
