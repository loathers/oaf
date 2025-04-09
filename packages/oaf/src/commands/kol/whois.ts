import {
  APIEmbedField,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
  hyperlink,
  italic,
  time,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { snapshotClient } from "../../clients/snapshot.js";
import { renderSvg } from "../../svgConverter.js";
import { formatPlayer, toKoldbLink, toMuseumLink } from "../../utils.js";
import { findPlayer, identifyPlayer } from "../_player.js";

export const data = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Look up information on a given player.")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription(
        "The name or id of the KoL player you're looking up, or a mention of a Discord user.",
      )
      .setRequired(true)
      .setMaxLength(30),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const input = interaction.options.getString("player", true);

  await interaction.deferReply();

  const identification = await identifyPlayer(input);

  if (typeof identification === "string") {
    await interaction.editReply(identification);
    return;
  }

  const player = identification[0];
  let knownPlayer = identification[1];

  const astralSpirit = player.level === 0;

  const fields: APIEmbedField[] = [
    { name: "Class", value: player.kolClass || "Unlisted" },
    { name: "Level", value: astralSpirit ? "∞" : player.level.toString() },
  ];

  const isOnline = await player.isOnline();

  if (!astralSpirit) {
    fields.push({
      name: "Ascensions",
      value: hyperlink(
        player.ascensions.toLocaleString(),
        toKoldbLink(player.name),
      ),
    });

    if (player.favoriteFood)
      fields.push({ name: "Favorite Food", value: player.favoriteFood });
    if (player.favoriteBooze)
      fields.push({ name: "Favorite Booze", value: player.favoriteBooze });

    const lastLogin = (() => {
      if (isOnline) return "Currently online";
      if (!player.lastLogin) return null;
      // We don't want to get more specific than days, but the Discord relative time formatter will say silly things
      // Like "8 hours ago" even if that player is logged in right now
      if (player.lastLogin.getDay() === new Date().getDay()) return "Today";
      if (Date.now() - player.lastLogin.getTime() < 1000 * 60 * 60 * 24)
        return "Yesterday";
      return time(player.lastLogin, "R");
    })();
    if (lastLogin) {
      fields.push({ name: "Last Login", value: lastLogin });
    }

    if (player.createdDate)
      fields.push({
        name: "Account Created",
        value: time(player.createdDate, "R"),
      });

    fields.push({
      name: "Display Case",
      value: player.hasDisplayCase
        ? hyperlink("Browse", toMuseumLink(player.id))
        : italic("none"),
    });

    // Save a database hit if we got here by tracking a claimed Discord account in the first place
    if (knownPlayer === null)
      knownPlayer = await findPlayer({ playerId: player.id });

    // Show different greenboxen services
    const greenboxes = [];
    if (knownPlayer?.greenbox) {
      greenboxes.push(
        `${hyperlink(
          `Greenbox`,
          `https://greenbox.loathers.net/?u=${player.id}`,
        )} (updated ${time(knownPlayer.greenbox.createdAt, "R")})`,
      );
    }
    const snapshot = await snapshotClient.getInfo(player.name);
    if (snapshot) {
      greenboxes.push(
        `${hyperlink(`Snapshot`, snapshot.link)} (updated ${time(
          snapshot.date,
          "R",
        )})`,
      );
    }

    fields.push({
      name: "Greenboxes",
      value: greenboxes.join(" / ") || italic("none"),
    });
  }

  if (knownPlayer?.raffleWins?.length) {
    const [first, second] = knownPlayer.raffleWins.reduce<[number, number]>(
      (acc, w) => [
        acc[0] + Number(w.place === 1),
        acc[1] + Number(w.place === 2),
      ],
      [0, 0],
    );
    fields.push({
      name: "Raffle Wins",
      value: `${"🥇".repeat(first)}${"🥈".repeat(second)}`,
    });
  }

  // Use this opportunity to either
  // a) learn about a new player for our database, or
  // b) update player names either from name changes or capitalization changes
  await prisma.player.upsert({
    where: { playerId: player.id },
    update: {
      playerName: player.name,
      accountCreationDate: player.createdDate,
    },
    create: {
      playerId: player.id,
      playerName: player.name,
      accountCreationDate: player.createdDate,
    },
  });

  if (knownPlayer?.discordId) {
    fields.push({
      name: "Discord",
      value: formatPlayer(knownPlayer),
    });
  }

  // Avatars can come through as a PNG buffer or a URL, react accordingly
  let avatar = player.avatar;
  const files = [];
  if (avatar.includes("<svg")) {
    files.push(
      new AttachmentBuilder(await renderSvg(avatar)).setName("avatar.png"),
    );
    avatar = "attachment://avatar.png";
  }

  const playerEmbed = createEmbed()
    .setTitle(`${bold(player.name)} (#${player.id})${isOnline ? " 📶" : ""}`)
    .setThumbnail(avatar)
    .addFields(fields);

  try {
    await interaction.editReply({
      content: null,
      embeds: [playerEmbed],
      allowedMentions: { users: [] },
      files,
    });
  } catch (error) {
    await discordClient.alert("Unknown error", interaction, error);
    await interaction.editReply(
      "I was unable to fetch this user, sorry. I might be unable to log in!",
    );
  }
}
