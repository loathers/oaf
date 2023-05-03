import type { Player } from "@prisma/client";
import {
  APIEmbedField,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  hyperlink,
  italic,
  time,
  userMention,
} from "discord.js";

import { prisma } from "../../clients/database";
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
      .setDescription(
        "The name or id of the KoL player you're looking up, or a mention of a Discord user."
      )
      .setRequired(true)
      .setMaxLength(30)
  );

export function validUsername(username: string) {
  // 3 to 30 alphanumeric characters, starting with alpha, may contain underscores or spaces
  return /^[a-zA-Z][a-zA-Z0-9_ ]{2,29}$/.test(username);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", true);

  await interaction.deferReply();

  // If the input is a Discord mention, we'll try to set a player identifier there. Otherwise this just gets set to
  // the same value as input.
  let playerIdentifier;

  // Whatever happens we'll try to ascertain whether this is a known player. Because we either do so at the start or
  // at the end, declare a null variable here.
  let knownPlayer: Player | null = null;

  // Check if this is a mention first of all
  if (input.match(/^<@\d+>$/)) {
    knownPlayer = await prisma.player.findFirst({ where: { discordId: input.slice(2, -1) } });

    if (knownPlayer === null) {
      await interaction.editReply(`That user hasn't claimed a KoL account.`);
      return;
    }

    playerIdentifier = knownPlayer.playerId || knownPlayer.username;
  } else {
    playerIdentifier = input;
  }

  if (typeof playerIdentifier === "string" && !validUsername(playerIdentifier)) {
    await interaction.editReply(
      "Come now, you know that isn't a player. Can't believe you'd try and trick me like this. After all we've been through? 😔"
    );
    return;
  }

  const partialPlayer = await kolClient.getPartialPlayer(playerIdentifier);

  if (!partialPlayer) {
    await interaction.editReply(
      `According to KoL, player ${
        typeof playerIdentifier === "number" ? "#" : ""
      }${playerIdentifier} does not exist.`
    );
    return;
  }

  const player = await kolClient.getPlayerInformation(partialPlayer);

  if (!player) {
    await interaction.editReply(
      `While player ${bold(partialPlayer.name)} exists, this command didn't work. Weird.`
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

  // Save a database hit if we got here by tracking a claimed Discord account in the first place
  if (knownPlayer === null) {
    knownPlayer = await prisma.player.findFirst({
      where: { playerId: player.id },
    });
  }

  if (knownPlayer?.discordId) {
    fields.push({
      name: "Discord",
      value: userMention(knownPlayer.discordId),
    });
  }

  const playerEmbed = createEmbed()
    .setTitle(`${bold(player.name)} (#${player.id})`)
    .setThumbnail(player.avatar)
    .addFields(fields);

  try {
    await interaction.editReply({
      content: null,
      embeds: [playerEmbed],
      allowedMentions: { users: [] },
    });
  } catch {
    await interaction.editReply(
      "I was unable to fetch this user, sorry. I might be unable to log in!"
    );
  }
}
