import axios from "axios";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  hyperlink,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { resolveKoLImage } from "../../clients/kol.js";
import { groupToMap } from "../../utils.js";
import { itemAutocomplete, itemOption } from "../_options.js";

interface MuseumResponse {
  name: string;
  picture: string;
  plural: string | null;
  description: string;
  collections: Collection[];
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
  .addIntegerOption(itemOption());

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
  const id = interaction.options.getInteger("item", true);

  await interaction.deferReply();
  const { data, status } = await axios.get<MuseumResponse>(
    `https://museum.loathers.net/api/item/${id}`,
  );

  if (status !== 200) {
    await interaction.editReply(
      `Item id ${id} wasn't found on https://museum.loathers.net`,
    );
    return;
  }

  if (data.collections.length === 0) {
    await interaction.editReply(
      `That item exists but no-one has one in their display case!`,
    );
    return;
  }

  const grouped = groupToMap(data.collections, (d) => d.rank);
  const ranks = [...grouped.keys()].sort((a, b) => a - b);

  const leaderboard = ranks.map((r) => {
    const collection = grouped.get(r)!;
    const players = collection.map((c) => c.player.name);
    const playersString = (
      players.length > 4
        ? players.slice(0, 3).concat("and many more...")
        : players
    ).join(", ");
    return `${getRankSymbol(
      r,
    )} - ${playersString} - ${collection[0].quantity.toLocaleString()}`;
  });

  const embed = createEmbed()
    .setTitle(`Museum 🏛️`)
    .addFields({
      name: `Top 10 "${data.name}" Collections`,
      value: leaderboard.join("\n") || "Couldn't find any collections",
    })
    .setThumbnail(resolveKoLImage(`/itemimages/${data.picture}.gif`));

  await interaction.editReply({
    content: `${hyperlink(
      `Browse the full "${data.name}" leaderboard`,
      `https://museum.loathers.net/item/${id}`,
    )}`,
    embeds: [embed],
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await interaction.respond(itemAutocomplete(interaction.options.getFocused()));
}
