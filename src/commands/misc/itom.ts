import { Events, Message } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const ITOM_MATCHER = /(\W|^)(itom)/i;

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  if (message.content.match(ITOM_MATCHER)) {
    try {
      await message.react("<:minusone:748016030357520464>");
    } catch (error) {
      discordClient.alert("Please give me permissions to react to messages!");
    }
  }
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
