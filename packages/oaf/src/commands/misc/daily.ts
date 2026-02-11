import { Player } from "@prisma/client";
import { heading } from "discord.js";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { englishJoin, formatPlayer } from "../../utils.js";

Array.prototype.toSorted = function <T>(
  this: T[],
  compareFn?: (a: T, b: T) => number,
) {
  return [...this].sort(compareFn);
};

async function createBirthdayMessage() {
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

  const content = Object.entries(byAge)
    .toSorted((a, b) => Number(a[0]) - Number(b[0]))
    .map(([age, players]) => {
      const playerTags = players.map((p) => formatPlayer(p));
      return `${age} year${age === "1" ? "" : "s"} old: ${englishJoin(
        playerTags,
      )}${age === "11" ? " (ridiculous; not even funny)" : ""}`;
    })
    .join("\n");

  return `${heading("In-Game Birthdays 🎂")}\n\n${content}`;
}

async function onRollover() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const announcementChannel = guild?.channels.cache.get(config.KOL_CHANNEL_ID);

  if (!announcementChannel?.isTextBased()) {
    return;
  }

  const content = await createBirthdayMessage();

  if (!content) return;

  await announcementChannel.send({
    content,
    allowedMentions: { users: [] },
  });
}

export function init() {
  kolClient.on("rollover", () => void onRollover());
}
