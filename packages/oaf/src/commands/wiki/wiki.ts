import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  Events,
  Message,
  MessageType,
  SlashCommandBuilder,
  inlineCode,
  userMention,
} from "discord.js";

import { blankEmbed, discordClient } from "../../clients/discord.js";
import { getPissLevel } from "../../clients/iss.js";
import { mafiaClient } from "../../clients/mafia.js";
import { WikiSearchError } from "../../clients/wiki.js";
import { lf } from "../../utils.js";

const ITEMMATCHER = /\[\[([^[\]]*)\]\]/g;

export const data = new SlashCommandBuilder()
  .setName("wiki")
  .setDescription("Search the KoL wiki for the given term.")
  .addStringOption((option) =>
    option
      .setName("term")
      .setDescription("The term to search for in the wiki.")
      .setRequired(true),
  );

async function getWikiReply(item: string) {
  try {
    const embed = await mafiaClient.getEmbed(item);
    if (!embed) {
      return blankEmbed(`"${item}" wasn't found. Please refine your search.`);
    }

    return embed;
  } catch (error) {
    if (!(error instanceof WikiSearchError)) throw error;

    await discordClient.alert(
      `Wiki search query failed unexpectedly on step "${error.step}" ${error.url ? `(${error.url})` : ""}`,
      undefined,
      error,
    );
    return blankEmbed(
      "Something is wrong with wiki searching but maintainers have been alerted",
    );
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

const trim = (message: string) =>
  message.replace(/^[*_\s]+/, "").replace(/[*_\s]+$/, "");

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  const matches = [...message.content.matchAll(ITEMMATCHER)];

  const queries = matches.map((m) => m[1]).filter((m) => m.length > 0);

  if (queries.length === 0) return;

  let preamble = "";
  let reaction;
  if (
    matches.length > 0 &&
    matches[0][0] === trim(message.content) &&
    message.type !== MessageType.Reply
  ) {
    // Ignore smartasses
    if (message.content.trim() !== trim(message.content)) {
      return;
    }

    reaction = "<:kol_mad:516763545657016320>";
    preamble += `Remember, for this query you could have just run ${inlineCode(
      `/wiki ${matches[0][1]}`,
    )}\n\n`;
  } else {
    reaction = "🔎";
  }

  try {
    await message.react(reaction);
  } catch (error) {
    if (!(error instanceof DiscordAPIError)) throw error;
    if (error.code !== 90001) {
      return void (await discordClient.alert(
        `Tried to react to an old-style wiki search by ${message.author}; received error ${error}.`,
      ));
    }

    return void (await message.reply(
      "You blocked me <:kol_mad:516763545657016320>",
    ));
  }

  const considered = queries.slice(0, 3);

  if (considered.length < queries.length) {
    await message.reply({
      content:
        "Detected too many wiki invocations in one message. Returning first three invocations only.",
      allowedMentions: { parse: [], repliedUser: false },
    });
  }

  if (Math.random() < 0.01) {
    preamble += `The ISS piss tank is currently ${await getPissLevel()}% full. `;
  }

  const searchingMessage = await message.reply({
    content: `${preamble}${userMention(
      member.id,
    )} is searching for ${lf.format(considered.map((q) => `"${q}"`))}...`,
    allowedMentions: { parse: [], repliedUser: false },
  });

  const embeds = await Promise.all(
    considered.map((query) => getWikiReply(query)),
  );

  await searchingMessage.edit({
    content: `${preamble}${userMention(member.id)} searched for...`,
    embeds,
    allowedMentions: {
      parse: [],
    },
  });
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
