import {
  APIEmbedField,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  hyperlink,
  italic,
  time,
} from "discord.js";

import { createEmbed } from "../../clients/discord";
import { kolClient } from "../../clients/kol";
import { snapshotClient } from "../../clients/snapshot";
import { toKoldbLink, toMuseumLink } from "../../utils";

export const data = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Look up information on a given player.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("The name or id of the KoL player you're looking up.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const playerNameOrId = interaction.options.getString("player", true);

  await interaction.deferReply();

  const partialPlayer = await kolClient.getPartialPlayer(playerNameOrId);

  if (!partialPlayer) {
    await interaction.editReply(`According to KoL, player ${playerNameOrId} does not exist.`);
    return;
  }

  const player = await kolClient.getPlayerInformation(partialPlayer);

  if (!player) {
    await interaction.editReply(
      `While player ${bold(playerNameOrId)} exists, this command didn't work. Weird.`
    );
    return;
  }

  const fields: APIEmbedField[] = [
    { name: "Class", value: player.class || "Unlisted" },
    { name: "Level", value: player.level.toString() },
    {
      name: "Ascensions",
      value: hyperlink(player.ascensions.toLocaleString(), toKoldbLink(player.name)),
    },
  ];

  if (player.favoriteFood) fields.push({ name: "Favorite Food", value: player.favoriteFood });
  if (player.favoriteBooze) fields.push({ name: "Favorite Booze", value: player.favoriteBooze });
  if (player.lastLogin) fields.push({ name: "Last Login", value: time(player.lastLogin, "R") });
  if (player.createdDate)
    fields.push({ name: "Account Created", value: time(player.createdDate, "R") });

  fields.push({
    name: "Display Case",
    value: player.hasDisplayCase ? hyperlink("Browse", toMuseumLink(player.id)) : italic("none"),
  });

  const snapshot = await snapshotClient.getInfo(player.name);

  fields.push({
    name: "Snapshot",
    value: snapshot
      ? hyperlink(`Browse (updated ${time(snapshot.date, "R")})`, snapshot.link)
      : italic("none"),
  });

  const playerEmbed = createEmbed()
    .setTitle(`${bold(player.name)} (#${player.id})`)
    .setThumbnail(player.avatar)
    .addFields(fields);

  try {
    await interaction.editReply({
      content: null,
      embeds: [playerEmbed],
    });
  } catch {
    await interaction.editReply(
      "I was unable to fetch this user, sorry. I might be unable to log in!"
    );
  }
}
