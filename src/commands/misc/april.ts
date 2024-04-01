import { milliseconds } from "date-fns";
import { Events, TextChannel } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const CHECK_DURATION: Duration = { seconds: 10 };
async function startTyping(): Promise<void> {
  discordClient.channels.cache.each(
    (channel) => channel instanceof TextChannel && channel.sendTyping(),
  );
}

export async function init() {
  discordClient.on(
    Events.ClientReady,
    () => void setInterval(startTyping, milliseconds(CHECK_DURATION)),
  );
}
