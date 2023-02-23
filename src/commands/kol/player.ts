import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    bold, 
    hyperlink
  } from "discord.js";
  
import { kolClient } from "../../clients/kol";
import { pluralize, toKoldbLink, toSnapshotLink } from "../../utils";


export const data = new SlashCommandBuilder()
  .setName("player")
  .setDescription("Look up information on a given player.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription("The KOL username of the player you're looking up.")
      .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member;
  
    if (!member) {
      interaction.reply({
        content: "You have to perform this action from within a Guild.",
        ephemeral: true,
      });
      return;
    }

    const playerNameOrId = interaction.options.getString("player", true);

    await interaction.deferReply();

    const player = await kolClient.getPartialPlayer(playerNameOrId);

    if (!player) {
        interaction.editReply({content:"According to KOL, this player does not exist."});
        return;
    }

    const playerInfo = await kolClient.getPlayerInformation(player.id);

    if (!playerInfo) {
        interaction.editReply({content:"While this player exists, this command didn't work. Weird."});
        return;
    }

    const playerInfoFormatted = [
        `This user is currently a ${bold(player.class)} at level ${player.level}`,
        `They have completed ${bold(
            hyperlink(
                    `${playerInfo.ascensions}`,
                    toKoldbLink(player.name)))} 
            ${pluralize(playerInfo.ascensions,"ascension","ascensions")}.`,
        `Loves eating ${playerInfo.favoriteFood}.`,
        `Loves drinking ${playerInfo.favoriteBooze}.`,
        ``,
        `If it exists, their av-snapshot is located ${hyperlink(
            "here", toSnapshotLink(player.name))}`,
        ``,
        `${player.name} last logged in on ${playerInfo.lastLogin}`

    ]

    try {
        await interaction.editReply({
            content: null,
            embeds: [
                {
                    title: `${bold(player.name)} (#${player.id})`,
                    description: playerInfoFormatted.join("\n"),
                },
            ],
        });
    } catch {
        await interaction.editReply(
            "I was unable to fetch this user, sorry. I might be unable to log in!"
        );
    }

}