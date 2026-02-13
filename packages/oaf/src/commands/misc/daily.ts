import { heading } from "discord.js";

import { getBirthdays } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import type { Player } from "../../database-types.js";
import { englishJoin, formatPlayer } from "../../utils.js";

async function createBirthdayMessage() {
  const result = await getBirthdays();
  const birthdays = result.rows;

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
