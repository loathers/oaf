import { milliseconds } from "date-fns";
import { Events, TextChannel } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const CHECK_DURATION: Duration = { seconds: 10 };
async function startTyping(): Promise<void> {
  const today = new Date();
  if (today.getMonth() === 3 && today.getDate() === 1) {
    discordClient.channels.cache.each(
      (channel) =>
        channel instanceof TextChannel &&
        channel
          .permissionsFor(discordClient.member ?? "")
          ?.has("SendMessages") &&
        channel.sendTyping(),
    );
  }
}

export async function init() {
  discordClient.on(
    Events.ClientReady,
    () => void setInterval(startTyping, milliseconds(CHECK_DURATION)),
  );
}
