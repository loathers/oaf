import { differenceInMinutes, milliseconds } from "date-fns";
import { Events, blockQuote } from "discord.js";
import { dedent } from "ts-dedent";

import { discordClient } from "./clients/discord.js";
import { config } from "./config.js";

const CHECK_DURATION: Duration = { seconds: 10 };

async function announceParka() {
  const announcementChannel = discordClient.guild?.channels.cache.get(
    config.ANNOUNCEMENTS_CHANNEL_ID,
  );

  if (!announcementChannel?.isTextBased()) {
    await discordClient.alert("No valid announcement channel");
    return;
  }

  return void (await announcementChannel.send({
    content: dedent`
      New announcement posted to KoL chat!
      ${blockQuote(
        "A new announcement has been posted: Welcome to the Jurassic Parka, which is April's Item-of-the-Month and now available in Mr. Store.",
      )}
    `,
  }));
}

async function checkAnnounceParka() {
  if (!discordClient.parka) return;
  if (differenceInMinutes(new Date(), discordClient.parka) >= 30) {
    discordClient.parka = null;
    return await announceParka();
  }
}

export async function init() {
  discordClient.on(
    Events.ClientReady,
    () => void setInterval(checkAnnounceParka, milliseconds(CHECK_DURATION)),
  );
}
