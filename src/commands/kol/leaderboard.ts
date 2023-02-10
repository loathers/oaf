import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { KoLClient } from "../../kol";

import { Command } from "../type";

const PATH_MAPPINGS: Map<string, number> = new Map([
  ["clan", 8],
  ["clandungeons", 8],
  ["slimetube", 8],
  ["slime", 8],
  ["hobopolis", 8],
  ["hobo", 8],
  ["hobop", 8],
  ["beeshateyou", 9],
  ["bhy", 9],
  ["bees", 9],
  ["wayofthesurprisingfist", 10],
  ["wotsf", 10],
  ["fist", 10],
  ["trendy", 11],
  ["avatarofboris", 12],
  ["aob", 12],
  ["boris", 12],
  ["bugbearinvasion", 13],
  ["bugbear", 13],
  ["zombieslayer", 14],
  ["zombiemaster", 14],
  ["zombie", 14],
  ["classact", 15],
  ["avatarofjarlsberg", 16],
  ["jarlsberg", 16],
  ["jarl", 16],
  ["aoj", 16],
  ["big", 17],
  ["kolhs", 18],
  ["hs", 18],
  ["highschool", 18],
  ["classactii", 19],
  ["classact2", 19],
  ["avatarofsneakypete", 20],
  ["sneakypete", 20],
  ["pete", 20],
  ["aosp", 20],
  ["slowandsteady", 21],
  ["heavyrains", 22],
  ["hr", 22],
  ["picky", 23],
  ["actuallyedtheundying", 24],
  ["edtheundying", 24],
  ["ed", 24],
  ["undying", 24],
  ["onecrazyrandomsummer", 25],
  ["1crazyrandomsummer", 25],
  ["ocrs", 25],
  ["1crs", 25],
  ["communityservice", 26],
  ["cs", 26],
  ["hccs", 26],
  ["batfellow", 27],
  ["avatarofwestofloathing", 28],
  ["awol", 28],
  ["thesource", 29],
  ["source", 29],
  ["nuclearautumn", 30],
  ["na", 30],
  ["gelatinousnoob", 31],
  ["noob", 31],
  ["gnoob", 31],
  ["licensetoadventure", 32],
  ["lta", 32],
  ["liveascendrepeat", 33],
  ["lar", 33],
  ["pocketfamiliars", 34],
  ["pokefam", 34],
  ["glover", 35],
  ["disguisesdelimit", 36],
  ["dd", 36],
  ["darkgyffte", 37],
  ["dg", 37],
  ["vampire", 37],
  ["vampyre", 37],
  ["twocrazyrandomsummer", 38],
  ["2crazyrandomsummer", 38],
  ["tcrs", 38],
  ["2crs", 38],
  ["kingdomofexploathing", 39],
  ["exploathing", 39],
  ["pathoftheplumber", 40],
  ["plumber", 40],
  ["mario", 40],
  ["lowkeysummer", 41],
  ["lks", 41],
  ["greygoo", 42],
  ["graygoo", 42],
  ["goo", 42],
  ["yourobot", 43],
  ["robot", 43],
  ["quantumterrarium", 44],
  ["qt", 44],
  ["wildfire", 45],
  ["greyyou", 46],
  ["grayyou", 46],
  ["journeyman", 47],
  ["dinosaur", 48],
  ["fallofthedinosaurs", 48],
  ["fotd", 48],
  ["dinosaurs", 48],
  ["crimbo22", 49],
  ["gratitude", 49],
  ["standard", 999],
]);

async function leaderboard(interaction: CommandInteraction, kolClient: KOLClient): Promise<void> {
  const boardref = interaction.options.getString("leaderboard", true);

  let board =
    PATH_MAPPINGS.get(boardref.toLowerCase().replace(/\W/g, "")) || parseInt(boardref) || 0;
  if (board > 2000) board = board === new Date(Date.now()).getFullYear() ? 999 : 998 + 2015 - board;
  await interaction.deferReply();
  const leaderboardInfo = await kolClient.getLeaderboard(board);
  if (!leaderboardInfo || leaderboardInfo.name === "Weird Leaderboards") {
    interaction.editReply("I don't think that's a real leaderboard, sorry.");
  } else if (leaderboardInfo.boards.length === 0) {
    interaction.editReply({
      content: null,
      embeds: [
        new MessageEmbed()
          .setTitle(leaderboardInfo.name || "...")
          .setDescription("I wasn't able to understand this leaderboard, sorry.")
          .setFooter({
            text: "Problems? Message DocRostov#7004 on discord.",
            iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
          }),
      ],
    });
  } else {
    interaction.editReply({
      content: null,
      embeds: [
        new MessageEmbed()
          .setTitle(leaderboardInfo.name || "...")
          .addFields(
            leaderboardInfo.boards.map((subboard) => {
              const runs = subboard.runs.map(
                (run) => `${run.player} - ${run.days ? `${run.days}/` : ""}${run.turns}`
              );
              if (runs.length > 12) runs.splice(12, 0, "🥉 Bronze Buttons 🥉");
              if (runs.length > 1) runs.splice(1, 0, "🥈 Silver Moons 🥈");
              if (runs.length) runs.splice(0, 0, "🥇 Gold Star 🥇");
              return {
                title: subboard.name || "...",
                name: subboard.name || "...",
                value: runs.join("\n").slice(0, 1024) || "No runs yet!",
                inline: true,
              };
            })
          )
          .setFooter({
            text: "Problems? Message DocRostov#7004 on discord.",
            iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
          }),
      ],
    });
  }
}

const command: Command = {
  attach: ({ discordClient, kolClient }) =>
    discordClient.attachCommand(
      "leaderboard",
      [
        {
          name: "leaderboard",
          description: "The name or id of the leaderboard you want to display.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => leaderboard(interaction, kolClient),
      "Display the specified leaderboard."
    ),
};

export default command;
