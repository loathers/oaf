import {
  ChatInputCommandInteraction,
  Message,
  MessageEditOptions,
  SlashCommandBuilder,
} from "discord.js";

import { discordClient } from "../../clients/discord";
import { wikiClient } from "../../clients/wiki";

const ITEMMATCHER = /\[\[([^\[\]]*)\]\]/g;

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search the KoL wiki for the given term.")
  .addStringOption((option) =>
    option.setName("term").setDescription("The term to search for in the wiki.").setRequired(true)
  );

async function getWikiReply(item: string): Promise<MessageEditOptions> {
  const embed = await wikiClient.getEmbed(item);
  if (!embed) {
    return {
      content: `"${item}" wasn't found. Please refine your search.`,
      allowedMentions: {
        parse: [],
      },
    };
  }

  return {
    content: null,
    embeds: [embed],
    allowedMentions: {
      parse: [],
    },
  };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const item = interaction.options.getString("term", true);
  await interaction.deferReply();
  const reply = await getWikiReply(item);
  await interaction.editReply(reply);
}

async function onMessage(message: Message) {
  if (!("send" in message.channel)) return;

  const queries = [...message.content.matchAll(ITEMMATCHER)]
    .map((m) => m[1])
    .filter((m) => m.length > 0);

  if (queries.length > 3) {
    await message.reply({
      content:
        "Detected too many wiki invocations in one message. Returning first three invocations only.",
      allowedMentions: { parse: [], repliedUser: false },
    });
  }

  await Promise.all(
    queries.slice(0, 3).map(async (query) => {
      if (!("send" in message.channel)) return;

      const searchingMessage = await message.reply({
        content: `Searching for "${query}"...`,
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
      });

      const reply = await getWikiReply(query);

      await searchingMessage.edit(reply);
    })
  );
}

export async function sync() {
  discordClient.on("messageCreate", onMessage);
}
