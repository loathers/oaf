import { discordClient } from "../../clients/discord.js";
import { KoLMessage, kolClient } from "../../clients/kol.js";

function isAnnouncement(message: KoLMessage) {
  if (message.msg.startsWith("The system will go down for nightly maintenance"))
    return false;
  if (message.msg.startsWith("Rollover is over")) return false;
  return true;
}

function listenForAnnouncements() {
  kolClient.on("system", async (message) => {
    await discordClient.alert(
      `System Message: ${message.msg} (is announcement: ${isAnnouncement(
        message,
      )})`,
    );
  });
}

export async function init() {
  discordClient.on("ClientReady", listenForAnnouncements);
}
