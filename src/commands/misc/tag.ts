import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  hyperlink,
  messageLink,
} from "discord.js";

import { prisma } from "../../clients/database.js";

export const data = new SlashCommandBuilder()
  .setName("tag")
  .setDescription("Drop a link to a tagged message")
  .addStringOption((option) =>
    option
      .setName("tag")
      .setDescription("The unique tag for the message to which you'd like to link")
      .setAutocomplete(true)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const tagName = interaction.options.getString("tag", true).toLowerCase();

  await interaction.deferReply();

  const tag = await prisma.tag.findUnique({ where: { tag: tagName } });

  if (!tag) {
    await interaction.editReply(`No tag was found matching ${bold(tagName)}`);
    return;
  }

  await interaction.editReply(
    hyperlink(
      `Click to jump to message tagged with ${bold(tagName)}`,
      messageLink(tag.channelId, tag.messageId, tag.guildId)
    )
  );
}

let TAG_CACHE: string[] = [];

export async function init() {
  TAG_CACHE = (
    await prisma.tag.findMany({
      select: { tag: true },
    })
  ).map((t) => t.tag);
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase().trim();

  const filtered =
    focusedValue === ""
      ? TAG_CACHE
      : TAG_CACHE.filter((tag) => tag.toLowerCase().includes(focusedValue));

  await interaction.respond(filtered.map((tag) => ({ name: tag, value: tag })).slice(0, 25));
}
