import { Events, ThreadAutoArchiveDuration, blockQuote } from "discord.js";
import { type KoLMessage } from "kol.js";
import { dedent } from "ts-dedent";

import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";

function isAnnouncement(message: KoLMessage) {
  return !/^(The system will go down for nightly maintenance in \d+ minutes?|Rollover is over).$/.test(
    message.msg,
  );
}

function isUpdatesMessage(message: KoLMessage) {
  return (
    message.msg ===
    "A new update has been posted. Use the /updates command to read it."
  );
}

function listenForAnnouncements() {
  kolClient.on("system", (systemMessage) => {
    void (async () => {
      if (!isAnnouncement(systemMessage)) return;

      const announcement = isUpdatesMessage(systemMessage)
        ? (await kolClient.getUpdates())[0]
        : systemMessage.msg;

      const guild = await discordClient.guilds.fetch(config.GUILD_ID);
      const announcementChannel = guild?.channels.cache.get(
        config.ANNOUNCEMENTS_CHANNEL_ID,
      );

      if (!announcementChannel?.isTextBased()) {
        await discordClient.alert("No valid announcement channel");
        return;
      }

      const message = await announcementChannel.send({
        content: dedent`
          New announcement posted to KoL chat!
          ${blockQuote(announcement)}
        `,
      });

      await message.startThread({
        name: `Discussion for announcement`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      });
    })();
  });
}

export function init() {
  discordClient.once(Events.ClientReady, listenForAnnouncements);
}
