import { type Duration, milliseconds } from "date-fns";
import { Events, TextChannel } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const APRIL_CHANNEL_IDS =
  "1207483178931982346,533092807473102869,581155825385472001,581155825385472001,1161394735085256735,938767927606403072,756649296774037567,781270875080622080,781092861093085195,534709227260870656,466659737010831360";

const CHECK_DURATION: Duration = { seconds: 10 };
async function startTyping(): Promise<void> {
  const today = new Date();
  if (today.getMonth() === 3 && today.getDate() === 1) {
    APRIL_CHANNEL_IDS.split(",")
      .map((id) => discordClient.channels.cache.get(id))
      .filter((ch): ch is TextChannel =>
        Boolean(
          ch instanceof TextChannel &&
          discordClient.member?.permissionsIn(ch).has("SendMessages"),
        ),
      )
      .forEach((channel) => channel.sendTyping());
  }
}

export async function init() {
  discordClient.on(
    Events.ClientReady,
    () => void setInterval(startTyping, milliseconds(CHECK_DURATION)),
  );
}
