import { type Duration, differenceInMinutes, milliseconds } from "date-fns";
import { Events, ThreadAutoArchiveDuration, blockQuote } from "discord.js";
import { dedent } from "ts-dedent";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

const CHECK_DURATION: Duration = { seconds: 10 };

async function announceParka() {
  const announcementChannel = discordClient.guild?.channels.cache.get(
    config.ANNOUNCEMENTS_CHANNEL_ID,
  );

  if (!announcementChannel?.isTextBased()) {
    await discordClient.alert("No valid announcement channel");
    return;
  }

  const message = await announcementChannel.send({
    content: dedent`
      New announcement posted to KoL chat!
      ${blockQuote(
        "A new announcement has been posted: Welcome to the Jurassic Parka, which is April's Item-of-the-Month and now available in Mr. Store.",
      )}
    `,
  });

  return void (await message.startThread({
    name: `Discussion for announcement`,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
  }));
}

async function checkAnnounceParka() {
  if (!discordClient.parka) return;
  if (differenceInMinutes(new Date(), discordClient.parka) >= 30) {
    discordClient.parka = null;
    return await announceParka();
  }
}

export function init() {
  discordClient.once(
    Events.ClientReady,
    () => void setInterval(() => void checkAnnounceParka(), milliseconds(CHECK_DURATION)),
  );
}
