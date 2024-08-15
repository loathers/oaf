import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  heading,
} from "discord.js";

import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { wikiClient } from "../../clients/wiki.js";
import { config } from "../../config.js";
import { embedForItem } from "../wiki/item.js";

export const data = new SlashCommandBuilder()
  .setName("raffle")
  .setDescription("See today's raffle prizes and yesterday's winners");

const numberFormat = new Intl.NumberFormat();

async function getRaffleEmbeds() {
  const raffle = await kolClient.getRaffle();

  const embeds = [];

  let first = raffle.today.first && (await embedForItem(raffle.today.first));
  if (!first)
    first = createEmbed().setTitle(`Unknown item (#${raffle.today.first})`);
  first.setTitle(`First Prize: ${first.toJSON().title}`);
  embeds.push(first);

  let second = raffle.today.second && (await embedForItem(raffle.today.second));
  if (!second)
    second = createEmbed().setTitle(`Unknown item (#${raffle.today.second})`);
  second.setTitle(`Second Prize: ${second.toJSON().title}`);
  embeds.push(second);

  const winners = createEmbed().setTitle(`Yesterday's Winners`);

  winners.addFields(
    raffle.yesterday.map((winner) => {
      const itemName =
        wikiClient.items.find((i) => i.id === winner.item)?.name ??
        `Unknown item (#${winner.item})`;
      return {
        name: itemName,
        value: `${winner.player.toString()} (${numberFormat.format(winner.tickets)} tickets)`,
      };
    }),
  );

  embeds.push(winners);
  return embeds;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const embeds = await getRaffleEmbeds();
  await interaction.editReply({ content: null, embeds });
}

async function onRollover() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const announcementChannel = guild?.channels.cache.get(
    config.ANNOUNCEMENTS_CHANNEL_ID,
  );

  if (!announcementChannel?.isTextBased()) {
    return;
  }

  await announcementChannel.send({
    content: heading("Raffle"),
    embeds: await getRaffleEmbeds(),
    allowedMentions: { users: [] },
  });
}

export async function init() {
  kolClient.on("rollover", onRollover);
}
