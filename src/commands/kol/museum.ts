import axios from "axios";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  hyperlink,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { wikiClient } from "../../clients/wiki.js";
import { groupToMap } from "../../utils/index.js";

interface MuseumResponse {
  name: string;
  picture: string;
  plural: string | null;
  description: string;
  collection: Collection[];
}

interface Collection {
  quantity: number;
  rank: number;
  player: Player;
}

interface Player {
  name: string;
  id: number;
}

export const data = new SlashCommandBuilder()
  .setName("museum")
  .setDescription("See the leaderboard for collectors of an item")
  .addNumberOption((option) =>
    option
      .setName("item")
      .setDescription("Select an item from the autocomplete or supply an item id")
      .setAutocomplete(true)
      .setRequired(true)
  );

const getRankSymbol = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `#${rank}`;
  }
};

export async function execute(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getNumber("item", true);

  await interaction.deferReply();
  const { data, status } = await axios.get<MuseumResponse>(
    `https://museum.loathers.net/api/item/${id}`
  );

  if (status !== 200) {
    await interaction.editReply(`Item id ${id} wasn't found on https://museum.loathers.net`);
    return;
  }

  const grouped = groupToMap(data.collection, (d) => d.rank);
  const ranks = [...grouped.keys()].sort((a, b) => a - b);

  const leaderboard = ranks.map((r) => {
    const collection = grouped.get(r)!;
    const players = collection.map((c) => c.player.name);
    const playersString = (
      players.length > 4 ? players.slice(0, 3).concat("and many more...") : players
    ).join(", ");
    return `${getRankSymbol(r)} - ${playersString} - ${collection[0].quantity.toLocaleString()}`;
  });

  const embed = createEmbed()
    .setTitle(`Museum 🏛️`)
    .addFields({ name: `Top 10 "${data.name}" Collections`, value: leaderboard.join("\n") })
    .setThumbnail(
      `https://s3.amazonaws.com/images.kingdomofloathing.com/itemimages/${data.picture}.gif`
    );

  await interaction.editReply({
    content: `${hyperlink(
      `Browse the full "${data.name}" leaderboard`,
      `https://museum.loathers.net/item/${id}`
    )}`,
    embeds: [embed],
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();

  const filtered = wikiClient.items
    .map(({ name, id }) => ({ name, value: id }))
    .filter(({ name }) => name.toLowerCase().includes(focusedValue.toLowerCase()))
    .slice(0, 25);
  await interaction.respond(filtered);
}
