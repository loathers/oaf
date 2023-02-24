import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    bold, 
    hyperlink,
    EmbedBuilder
  } from "discord.js";
  
import { kolClient } from "../../clients/kol";
import { pluralize, toKoldbLink, toMuseumLink, toSnapshotLink } from "../../utils";


export const data = new SlashCommandBuilder()
  .setName("player")
  .setDescription("Look up information on a given player.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription("The KOL username or ID of the player you're looking up.")
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
        interaction.editReply({content: `According to KOL, player ${playerNameOrId} does not exist.`});        
        return;
    }

    const playerInfo = await kolClient.getPlayerInformation(player);

    if (!playerInfo) {
        interaction.editReply({content: `While player ${playerNameOrId} exists, this command didn't work. Weird.`});
        return;    
    }

    const embedDescription = [];

    embedDescription.push(`This user is currently a ${bold(player.class)} at level ${player.level}.`);
    if (playerInfo.hasDisplayCase) embedDescription.push(`Check out this player's display case at ${bold(hyperlink("their museum page!", toMuseumLink(String(player.id))))}`);
    embedDescription.push(`If it exists, their snapshot is located ${hyperlink("here", toSnapshotLink(player.name))}`,);

    const playerEmbed = new EmbedBuilder()
        .setColor(0x80CCFF)
        .setTitle(`${bold(player.name)} (#${player.id})`)
        .setAuthor({ name: 'OAF Player Summary', iconURL: 'http://images.kingdomofloathing.com/itemimages/oaf.gif'})
        .setDescription(embedDescription.join("\n"))
        .addFields(
            {name: 'Ascensions', value: `${hyperlink(`${playerInfo.ascensions}`, toKoldbLink(player.name))}`},
            {name: 'Favorite Food', value: `${playerInfo.favoriteFood}`},
            {name: 'Favorite Booze', value: `${playerInfo.favoriteBooze}`},
        );
    
    playerEmbed.setFooter({text:`${player.name} last logged in on ${playerInfo.lastLogin}`});

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