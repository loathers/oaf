import { Player } from "@prisma/client";
import { heading, userMention } from "discord.js";
import { resolveKoLImage } from "kol.js";

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { englishJoin, notNull } from "../../utils.js";

Array.prototype.toSorted = function (compareFn) {
  return [...this].sort(compareFn);
};

async function createBirthdayEmbed() {
  const birthdays = await prisma.$queryRaw<
    Player[]
  >`SELECT * FROM "Player" WHERE "discordId" IS NOT NULL AND EXTRACT(MONTH FROM "accountCreationDate") = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM "accountCreationDate") = EXTRACT(DAY FROM CURRENT_DATE)`;

  if (birthdays.length === 0) return null;

  const currentYear = new Date().getFullYear();

  const byAge = birthdays.reduce(
    (acc, p) => {
      if (!p.accountCreationDate) return acc;
      const age = currentYear - p.accountCreationDate.getFullYear();
      return { ...acc, [age]: [...(acc[age] || []), p] };
    },
    {} as Record<number, Player[]>,
  );

  const content = (Object.entries(byAge) as [string, Player[]][])
    .toSorted((a, b) => Number(a[0]) - Number(b[0]))
    .map(([age, players]) => {
      const playerTags = players.map((p) => userMention(p.discordId!));
      return `${age} year${age === "1" ? "" : "s"} old: ${englishJoin(
        playerTags,
      )}${age === "11" ? " (ridiculous; not even funny)" : ""}`;
    })
    .join("\n");

  return createEmbed()
    .setTitle("In-Game Birthdays")
    .setThumbnail(resolveKoLImage("/itemimages/cake3.gif"))
    .setDescription(content);
}

async function onRollover() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const announcementChannel = guild?.channels.cache.get(
    config.ANNOUNCEMENTS_CHANNEL_ID,
  );

  if (!announcementChannel?.isTextBased()) {
    return;
  }

  const embeds = [await createBirthdayEmbed()].filter(notNull);

  if (embeds.length === 0) return;

  await announcementChannel.send({
    content: heading("Daily Announcements"),
    embeds,
    allowedMentions: { users: [] },
  });
}

export async function init() {
  kolClient.on("rollover", onRollover);
}
