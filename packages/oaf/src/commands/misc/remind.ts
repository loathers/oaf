import {
  Duration,
  add,
  endOfDay,
  intervalToDuration,
  milliseconds,
  set,
  sub,
} from "date-fns";
import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  Events,
  SlashCommandBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import { dedent } from "ts-dedent";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";

const CHECK_DURATION: Duration = { seconds: 10 };

const OAF_DURATION_PATTERN =
  /^(?:(?<weeks>\d+)w)?(?:(?<days>\d+)d)?(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?(?:(?<seconds>\d+)s)?$/;

function getNextRollover(date = new Date()) {
  const rolloverThisCalendarDay = set(date, { hours: 3, minutes: 40 });

  // If you happen to ask at exactly rollover, you will get next rollover
  if (date < rolloverThisCalendarDay) {
    return rolloverThisCalendarDay;
  }

  return add(endOfDay(new Date()), { hours: 3, minutes: 40, seconds: 1 });
}

export function parseDuration(input: string): Duration | null {
  if (input === "rollover") {
    const now = new Date();
    return intervalToDuration({
      start: now,
      end: getNextRollover(now),
    });
  }

  const match = OAF_DURATION_PATTERN.exec(input);
  if (!match?.groups) return null;

  return {
    weeks: Number(match.groups.weeks) || undefined,
    days: Number(match.groups.days) || undefined,
    hours: Number(match.groups.hours) || undefined,
    minutes: Number(match.groups.minutes) || undefined,
    seconds: Number(match.groups.seconds) || undefined,
  };
}

export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Sets a reminder")
  .addStringOption((option) =>
    option
      .setName("when")
      .setDescription(
        'When to remind you (In either the form "1w2d3h4m5s" or "rollover")',
      )
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("reminder")
      .setDescription("What to remind you")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const when = interaction.options.getString("when", true);
  const reminderText =
    interaction.options.getString("reminder") || "Time's up!";

  if (reminderText.length > 127) {
    interaction.reply({
      content: "Maximum reminder length is 128 characters.",
      ephemeral: true,
    });
    return;
  }

  const duration = parseDuration(when);

  if (!duration) {
    return void (await interaction.reply({
      content:
        'You must supply a time to wait in the form of "1w2d3h4m5s" or "rollover".',
      ephemeral: true,
    }));
  }

  const reminderDate = add(new Date(), duration);

  if (!interaction?.channel?.isSendable()) {
    return void (await interaction.reply({
      content:
        "It doesn't look possible for oaf to respond to this request when the time comes",
      ephemeral: true,
    }));
  }

  const reply = await interaction.reply({
    content: `Okay, I'll remind you ${time(
      reminderDate,
      TimestampStyles.RelativeTime,
    )}.`,
    withResponse: true,
  });

  await prisma.reminder.create({
    data: {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      interactionReplyId: reply.id,
      messageContents: reminderText,
      reminderDate,
    },
  });
}

async function clearOldReminders() {
  const deleted = await prisma.reminder.deleteMany({
    where: {
      reminderSent: true,
      reminderDate: { lt: sub(new Date(), { days: 30 }) },
    },
  });
  if (deleted.count > 0) {
    await discordClient.alert(`Cleared ${deleted.count} old sent reminder(s)`);
  }
}

async function checkReminders() {
  let reminders;
  try {
    reminders = await prisma.reminder.findMany({
      where: { reminderDate: { lte: new Date() }, reminderSent: false },
    });
  } catch {
    // Database temporarily unavailable, will retry on next interval
    return;
  }

  for (const reminder of reminders) {
    try {
      const user = await discordClient.users.fetch(reminder.userId);
      const channel = reminder.guildId
        ? await discordClient.channels.fetch(reminder.channelId)
        : await user.createDM();

      if (!channel || !("send" in channel)) {
        await discordClient.alert(
          `Skipping reminder #${reminder.id} for ${userMention(
            user.id,
          )} due to unknown channel or cannot be posted in ${reminder.channelId}`,
        );
        continue;
      }

      const reply = reminder.interactionReplyId
        ? { messageReference: reminder.interactionReplyId }
        : undefined;

      await channel.send({
        content: userMention(reminder.userId),
        embeds: [{ title: "⏰⏰⏰", description: reminder.messageContents }],
        allowedMentions: {
          users: [reminder.userId],
        },
        reply,
      });
    } catch (error) {
      if (!(error instanceof DiscordAPIError)) throw error;
      await discordClient.alert(
        dedent`
          Could not action reminder #${reminder.id}.
          It will be marked as sent so that we don't keep retrying.
          Maybe fix and unmark it as sent so that it gets sent before it's cleaned up?
        `,
        undefined,
        error,
      );
    }

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { reminderSent: true },
    });
  }
}

export async function init() {
  await clearOldReminders();
  discordClient.once(
    Events.ClientReady,
    () => void setInterval(checkReminders, milliseconds(CHECK_DURATION)),
  );
}
