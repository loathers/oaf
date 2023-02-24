import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
  inlineCode,
  userMention,
} from "discord.js";

import { discordClient } from "../../clients/discord";
import { wikiClient } from "../../clients/wiki";
import { lf } from "../../utils";

const ITEMMATCHER = /\[\[([^\[\]]*)\]\]/g;

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search the KoL wiki for the given term.")
  .addStringOption((option) =>
    option.setName("term").setDescription("The term to search for in the wiki.").setRequired(true)
  );

async function getWikiReply(item: string) {
  const embed = await wikiClient.getEmbed(item);
  if (!embed) {
    return new EmbedBuilder().setDescription(`"${item}" wasn't found. Please refine your search.`);
  }

  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const item = interaction.options.getString("term", true);
  await interaction.deferReply();
  const embed = await getWikiReply(item);
  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  const matches = [...message.content.matchAll(ITEMMATCHER)];

  const queries = matches.map((m) => m[1]).filter((m) => m.length > 0);

  let slashNote = "";
  if (matches.length > 0 && matches[0][0] === message.content.trim()) {
    const slashCommand = inlineCode(`/wiki ${matches[0][1]}`);
    slashNote = `Remember, for this query could have just run ${slashCommand}\n\n`;
  }

  if (queries.length === 0) return;

  const considered = queries.slice(0, 3);

  if (considered.length < queries.length) {
    await message.reply({
      content:
        "Detected too many wiki invocations in one message. Returning first three invocations only.",
      allowedMentions: { parse: [], repliedUser: false },
    });
  }

  const searchingMessage = await message.reply({
    content: `${slashNote}${userMention(member.id)} is searching for ${lf.format(
      considered.map((q) => `"${q}"`)
    )}...`,
    allowedMentions: { parse: [], repliedUser: false },
  });

  const embeds = await Promise.all(considered.map((query) => getWikiReply(query)));

  await searchingMessage.edit({
    content: `${slashNote}${userMention(member.id)} searched for...`,
    embeds,
    allowedMentions: {
      parse: [],
    },
  });
}

export async function init() {
  discordClient.on("messageCreate", onMessage);
}
