import axios from "axios";
import { DiscordAPIError, Events, Message } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const ITOM_MATCHER = /(?:\W|^)(itoms?)(?:[^a-z]|$)/i;

async function getClownName(): Promise<string> {
  const rawClownList: string = await axios(`https://en.wikipedia.org/api.php`, {
    params: {
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:American_clowns",
      cmprop: "title",
      cmnamespace: 0,
      format: "json",
      cmlimit: 100,
    },
  });

  const clownList: { ns: number; title: string }[] =
    JSON.parse(rawClownList).query.categorymembers;
  const filteredList = clownList.filter(
    ({ title }) => title !== "John Wayne Gacy",
  );

  return filteredList[Math.floor(Math.random() * filteredList.length)].title;
}

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  if (message.content.match(ITOM_MATCHER)) {
    try {
      await message.react("<:minusone:748016030357520464>");
    } catch (error) {
      if (!(error instanceof DiscordAPIError)) throw error;
      if (error.code !== 90001) {
        return void (await discordClient.alert(
          `Tried to :minusone: a message containing the forbidden string by ${message.author}; received error ${error}.`,
        ));
      }

      const clownName = await getClownName();

      return void (await member.setNickname(clownName));
    }
  }
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
