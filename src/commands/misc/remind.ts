import {
  ChatInputCommandInteraction,
  Events,
  SlashCommandBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";

import { prisma } from "../../clients/database";
import { discordClient } from "../../clients/discord";

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
  const when = interaction.options.getString("when", true);
  const reminderText = interaction.options.getString("reminder") || "Time's up!";

  if (!timeMatcher.test(when) && when.toLowerCase() !== "rollover") {
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
  if (timeMatcher.test(when)) {
    const timeMatch = timeMatcher.exec(when);
    timeToWait =
      7 * 24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.weeks || "0") +
      24 * 60 * 60 * 1000 * parseInt(timeMatch?.groups?.days || "0") +
      60 * 60 * 1000 * parseInt(timeMatch?.groups?.hours || "0") +
      60 * 1000 * parseInt(timeMatch?.groups?.minutes || "0") +
      1000 * parseInt(timeMatch?.groups?.seconds || "0");
    reminderTime = Date.now() + timeToWait;
    await interaction.reply(
      `Okay, I'll remind you in ${time(
        Math.round(reminderTime / 1000),
        TimestampStyles.RelativeTime
      )}.`
    );
  } else {
    reminderTime = new Date(Date.now()).setHours(3, 40);
    if (reminderTime < Date.now()) {
      reminderTime += 24 * 60 * 60 * 1000;
    }
    timeToWait = reminderTime - Date.now();
    await interaction.reply(`Okay, I'll remind you after rollover.`);
  }

  const replyId = (await interaction.fetchReply()).id;

  if (timeToWait >= 7 * 24 * 60 * 60 * 1000) return;

  const channel = interaction.channel || (await interaction.user.createDM());

  if (!("send" in channel)) return;

  setTimeout(async () => {
    try {
      channel.send({
        content: userMention(interaction.user.id),
        embeds: [{ title: "⏰⏰⏰", description: reminderText }],
        reply: { messageReference: replyId },
        allowedMentions: {
          users: [interaction.user.id],
        },
      });
    } catch (error) {
      console.log(error);
    }
  }, timeToWait);

  await prisma.reminder.create({
    data: {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      interactionReplyId: replyId,
      messageContents: reminderText,
      reminderTime,
    },
  });
}

const RECHECK_TIME = 7 * 24 * 60 * 60 * 1000;

async function loadRemindersFromDatabase() {
  const now = BigInt(Date.now());

  const deleted = await prisma.reminder.deleteMany({ where: { reminderTime: { lt: now } } });
  if (deleted.count > 0) {
    console.log(`Deleted ${deleted.count} old reminder(s)`);
  }

  const reminders = await prisma.reminder.findMany({});

  for (let reminder of reminders) {
    // We can safely cast the difference between reminder and now to an int
    const timeLeft = Number(reminder.reminderTime - now);
    if (timeLeft >= RECHECK_TIME) continue;

    const user = await discordClient.users.fetch(reminder.userId);
    const channel = reminder.guildId
      ? await discordClient.channels.cache.get(reminder.channelId)
      : await user.createDM();

    if (!channel || !("send" in channel)) {
      console.log(
        "Skipping reminder due to unknown channel or cannot be posted in",
        reminder.channelId
      );
      continue;
    }

    const reply = reminder.interactionReplyId
      ? { messageReference: reminder.interactionReplyId }
      : undefined;

    setTimeout(() => {
      try {
        channel.send({
          content: userMention(reminder.userId),
          embeds: [{ title: "⏰⏰⏰", description: reminder.messageContents }],
          allowedMentions: {
            users: [reminder.userId],
          },
          reply,
        });
      } catch (error) {
        console.log(error);
      }
    }, timeLeft);
  }

  setTimeout(async () => {
    await loadRemindersFromDatabase();
  }, RECHECK_TIME);
}

export async function init() {
  discordClient.on(Events.ClientReady, loadRemindersFromDatabase);
}
