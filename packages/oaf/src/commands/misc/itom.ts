import { DiscordAPIError, Events, Message } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const ITOM_MATCHER = /(?:\W|^)(ito(m|y)s?)(?:[^a-z]|$)/i;

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  if (message.content.toLowerCase().includes("you can buy")) {
    if (message.content.toLowerCase().includes("you can buy a salad glove")) {
      return void (await message.reply("You can buy an iPod"));
    }

    return void (await message.reply(
      "You can buy a salad glove" + ["?", "!"][Math.round(Math.random())],
    ));
  }

  if (!message.content.match(ITOM_MATCHER)) return;

  try {
    await message.react("<:minusone:748016030357520464>");
  } catch (error) {
    if (!(error instanceof DiscordAPIError)) throw error;
    if (error.code !== 90001) {
      return void (await discordClient.alert(
        `Tried to :minusone: a message containing the forbidden string by ${message.author}; received error ${error}.`,
      ));
    }

    return void (await message.reply(
      'How embarassing! It\'s actually spelled "iotm"',
    ));
  }
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
