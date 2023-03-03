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
      .setMaxLength(30)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const playerNameOrId = interaction.options.getString("player", true);

  await interaction.deferReply();

  if (
    // Player names must not be...
    playerNameOrId.match(
      new RegExp(
        [
          /^[^\d]{0,2}$/, // ...an empty string, or 1-2 non-digits
          /^[^\d]\d$/, // ...a non-digit followed by a digit
          /.{31,}/, // ...31 characters or longer
          /^\d+[^\d]/, // ...digits followed by a non-digit
          /[^a-zA-Z0-9_ ]/, // ...non-alphanumerics/underscores/whitespaces
        ]
          .map((r) => r.source)
          .join("|")
      )
    )
  ) {
    await interaction.editReply(
      "Come now, you know that isn't a player. Can't believe you'd try and trick me like this. After all we've been through? 😔"
    );
    return;
  }

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
