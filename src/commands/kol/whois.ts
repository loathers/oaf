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

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { snapshotClient } from "../../clients/snapshot.js";
import { toKoldbLink, toMuseumLink } from "../../utils/index.js";

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

export function validPlayerIdentifier(identifier: string) {
  // If a player id: a number!
  // If a username: 3 to 30 alphanumeric characters, starting with alpha, may contain underscores or spaces
  return /^([a-zA-Z][a-zA-Z0-9_ ]{2,29})|[0-9]+$/.test(identifier);
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

    playerIdentifier = knownPlayer.playerId;
  } else {
    playerIdentifier = input;
  }

  if (typeof playerIdentifier === "string" && !validPlayerIdentifier(playerIdentifier)) {
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

  const isOnline = await kolClient.isOnline(player.id);
  const lastLogin = (() => {
    if (isOnline) return "Currently online";
    if (!player.lastLogin) return null;
    // We don't want to get more specific than days, but the Discord relative time formatter will say silly things
    // Like "8 hours ago" even if that player is logged in right now
    if (player.lastLogin.getDay() === new Date().getDay()) return "Today";
    if (Date.now() - player.lastLogin.getTime() < 1000 * 60 * 60 * 24) return "Yesterday";
    return time(player.lastLogin, "R");
  })();
  if (lastLogin) {
    fields.push({ name: "Last Login", value: lastLogin });
  }

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
      ? `${hyperlink(`Browse`, snapshot.link)} (updated ${time(snapshot.date, "R")})`
      : italic("none"),
  });

  // Save a database hit if we got here by tracking a claimed Discord account in the first place
  if (knownPlayer === null) {
    knownPlayer = await prisma.player.findFirst({
      where: { playerId: player.id },
    });
  }

  // Use this opportunity to update player names either from name changes or capitalization changes
  if (knownPlayer && knownPlayer.playerName !== player.name) {
    await prisma.player.update({
      where: { playerId: player.id },
      data: { playerName: player.name },
    });
  }

  if (knownPlayer?.discordId) {
    fields.push({
      name: "Discord",
      value: userMention(knownPlayer.discordId),
    });
  }

  const playerEmbed = createEmbed()
    .setTitle(`${bold(player.name)} (#${player.id})${isOnline ? " 📶" : ""}`)
    .setThumbnail(player.avatar)
    .addFields(fields);

  try {
    await interaction.editReply({
      content: null,
      embeds: [playerEmbed],
      allowedMentions: { users: [] },
    });
  } catch (error) {
    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch this user, sorry. I might be unable to log in!"
    );
  }
}
