import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Events,
  Message,
  SlashCommandBuilder,
  inlineCode,
  userMention,
} from "discord.js";

import { discordClient } from "../../clients/discord";
import { WikiDownError, wikiClient } from "../../clients/wiki";
import { lf } from "../../utils";

const ITEMMATCHER = /\[\[([^[\]]*)\]\]/g;

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search the KoL wiki for the given term.")
  .addStringOption((option) =>
    option.setName("term").setDescription("The term to search for in the wiki.").setRequired(true)
  );

const blankEmbed = (description: string) => new EmbedBuilder().setDescription(description);

async function getWikiReply(item: string) {
  try {
    const embed = await wikiClient.getEmbed(item);
    if (!embed) {
      return blankEmbed(`"${item}" wasn't found. Please refine your search.`);
    }

    return embed;
  } catch (error) {
    if (error instanceof WikiDownError) {
      return blankEmbed(`The wiki seems to be down. Hopefully temporarily`);
    }
    return blankEmbed("Something went wrong");
  }
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

  const response: string[] = [];

  if (matches.length > 0 && matches[0][0] === message.content.trim()) {
    try {
      await message.react("<:deadgarf:915694091541573712>");
    } catch {
      console.warn("Please give me permissions to react to messages!");
    }
    const slashCommand = inlineCode(`/wiki ${matches[0][1]}`);
    response.push(`Remember, for this query you could have just run ${slashCommand}.`);

    // I want to remove a lot of this big annoying block of code so I will continue to make this more unreliable until
    // people stop using it
    if (Math.random() < 0.6) {
      response.push("Try doing that!");
      await message.reply({ content: response.join(" ") });
      return;
    }
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

  const terms = lf.format(considered.map((q) => `"${q}"`));

  response.push(`${userMention(member.id)} is searching for ${terms}...`);

  const searchingMessage = await message.reply({
    content: response.join("\n\n"),
    allowedMentions: { parse: [], repliedUser: false },
  });

  const embeds = await Promise.all(considered.map((query) => getWikiReply(query)));

  await searchingMessage.edit({
    content: response.join("\n\n"),
    embeds,
    allowedMentions: {
      parse: [],
    },
  });
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
