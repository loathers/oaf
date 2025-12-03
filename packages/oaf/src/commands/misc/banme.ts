import { Events, Message } from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

async function onMessage(message: Message) {
  if (message.author.bot) return;
  const member = message.member;
  if (!member) return;

  if (message.channelId === config.BAN_ME_CHANNEL_ID) {
    if (!member.bannable) {
      await discordClient.alert(
        `Tried to ban ${member.user.tag} for posting in the autoban channel, but I couldn't ban them.`,
      );
      return;
    }

    await member.ban({ reason: "Posted in the autoban channel" });
    await discordClient.alert(
      `Banned ${member.user.tag} for posting in the autoban channel.`,
    );
  }
}

export async function init() {
  if (!config.BAN_ME_CHANNEL_ID) return;
  discordClient.on(Events.MessageCreate, onMessage);
}
