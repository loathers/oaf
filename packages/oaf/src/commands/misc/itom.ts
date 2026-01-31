import {
  DiscordAPIError,
  Events,
  Message,
  RESTJSONErrorCodes,
} from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { getRandom, lowercaseLeadingLetter } from "../../utils.js";

const ITOM_MATCHER = /(?:\W|^)(ito(m|y)s?)(?:[^a-z]|$)/i;

const joiners = [
  "Also",
  "And by the way",
  "Unrelatedly",
  "Relatedly",
  "In addition",
  "Plus",
];

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  const replies: string[] = [];

  if (message.content.match(ITOM_MATCHER)) {
    try {
      await message.react("<:minusone:748016030357520464>");
    } catch (error) {
      if (!(error instanceof DiscordAPIError)) throw error;
      if (error.code !== RESTJSONErrorCodes.ReactionWasBlocked) {
        return void (await discordClient.alert(
          `Tried to :minusone: a message containing the forbidden string by ${message.author}; received error ${error}.`,
        ));
      }

      replies.push(
        `How ${getRandom(["embarrassing", "gauche", "passé", "foolhardy"])}! It's actually spelled "iotm."`,
      );
    }
  }

  if (message.content.toLowerCase().includes("you can buy")) {
    if (message.content.toLowerCase().includes("you can buy a salad glove")) {
      replies.push("You can buy an iPod.");
    } else {
      replies.push("You can buy a salad glove" + getRandom(["!", "?"]));
    }
  }

  if (replies.length) {
    return void (await message.reply(
      replies
        .map((str, index) => (index ? lowercaseLeadingLetter(str) : str))
        .join(`${getRandom(joiners)}, `),
    ));
  }
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
