import { Events, GuildMember, Message, blockQuote } from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

// Discord caps communication timeouts at 28 days.
const VERIFIED_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

async function timeoutVerified(member: GuildMember, message: Message) {
  if (!member.moderatable) {
    await discordClient.alert(
      `Tried to time out ${member.user.tag} for posting in the autoban channel, but I couldn't.`,
    );
    return;
  }

  await member.timeout(VERIFIED_TIMEOUT_MS, "Posted in the autoban channel");
  await message.delete();

  await discordClient.alert(
    `Timed out ${member.user.tag} for 28 days for posting in the autoban channel.\n\n${blockQuote(message.content)}`,
  );
}

async function banUnverified(member: GuildMember, message: Message) {
  if (!member.bannable) {
    await discordClient.alert(
      `Tried to ban ${member.user.tag} for posting in the autoban channel, but I couldn't ban them.`,
    );
    return;
  }

  const joinDate = member.joinedAt;
  const banDate = new Date();

  await member.ban({ reason: "Posted in the autoban channel" });
  await message.delete();

  if (message.channel.isSendable()) {
    await message.channel.send(
      `🪦 ${member.user.username} ${joinDate?.getFullYear() ?? "????"} - ${banDate.getFullYear()}`,
    );
  }

  await discordClient.alert(
    `Banned ${member.user.tag} for posting in the autoban channel.\n\n${blockQuote(message.content)}`,
  );
}

async function onMessage(message: Message) {
  if (message.author.id === discordClient.user?.id) return;
  const member = message.member;
  if (!member) return;

  if (message.channelId !== config.BAN_ME_CHANNEL_ID) return;

  if (member.roles.cache.has(config.VERIFIED_ROLE_ID)) {
    await timeoutVerified(member, message);
    return;
  }

  await banUnverified(member, message);
}

export function init() {
  if (!config.BAN_ME_CHANNEL_ID) return;
  discordClient.on(Events.MessageCreate, (message) => void onMessage(message));
}
