import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TimestampStyles,
  time,
} from "discord.js";
import {
  BOARD_MAPPINGS,
  type BoardName,
  Leaderboard,
  type SubboardInfo,
} from "kol.js/domains/Leaderboard";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

const leaderboard = new Leaderboard(kolClient);

const BOARD_ALIASES: Record<string, BoardName | number> = {
  // Automatically alias board names without non-alphanumerics
  ...Object.keys(BOARD_MAPPINGS).reduce<Record<string, BoardName>>(
    (acc, key) => ({
      ...acc,
      [key.toLowerCase().replace(/[\W_]+/g, "")]: key as BoardName,
    }),
    {},
  ),
  clan: "Clan Dungeons",
  slimetube: "Clan Dungeons",
  slime: "Clan Dungeons",
  hobopolis: "Clan Dungeons",
  hobo: "Clan Dungeons",
  hobop: "Clan Dungeons",
  bhy: "Bees Hate You",
  bees: "Bees Hate You",
  wotsf: "Way of the Surprising Fist",
  fist: "Way of the Surprising Fist",
  aob: "Avatar of Boris",
  boris: "Avatar of Boris",
  bugbear: "Bugbear Invasion",
  zombiemaster: "Zombie Slayer",
  zombie: "Zombie Slayer",
  jarlsberg: "Avatar of Jarlsberg",
  jarl: "Avatar of Jarlsberg",
  aoj: "Avatar of Jarlsberg",
  hs: "KOLHS",
  highschool: "KOLHS",
  classact2: "Class Act II",
  sneakypete: "Avatar of Sneaky Pete",
  pete: "Avatar of Sneaky Pete",
  aosp: "Avatar of Sneaky Pete",
  hr: "Heavy Rains",
  edtheundying: "Actually Ed the Undying",
  ed: "Actually Ed the Undying",
  undying: "Actually Ed the Undying",
  "1crazyrandomsummer": "One Crazy Random Summer",
  ocrs: "One Crazy Random Summer",
  "1crs": "One Crazy Random Summer",
  cs: "Community Service",
  hccs: "Community Service",
  awol: "Avatar of West of Loathing",
  source: "The Source",
  na: "Nuclear Autumn",
  noob: "Gelatinous Noob",
  gnoob: "Gelatinous Noob",
  lta: "License to Adventure",
  lar: "Live. Ascend. Repeat.",
  pokefam: "Pocket Familiars",
  dd: "Disguises Delimit",
  dg: "Dark Gyffte",
  vampire: "Dark Gyffte",
  vampyre: "Dark Gyffte",
  "2crazyrandomsummer": "Two Crazy Random Summer",
  tcrs: "Two Crazy Random Summer",
  "2crs": "Two Crazy Random Summer",
  exploathing: "Kingdom of Exploathing",
  plumber: "Path of the Plumber",
  mario: "Path of the Plumber",
  lks: "Low Key Summer",
  graygoo: "Grey Goo",
  goo: "Grey Goo",
  robot: "You, Robot",
  yr: "You, Robot",
  qt: "Quantum Terrarium",
  grayyou: "Grey You",
  gyou: "Grey You",
  dinosaur: "Fall of the Dinosaurs",
  dino: "Fall of the Dinosaurs",
  fotd: "Fall of the Dinosaurs",
  crimbo22: "Elf Gratitude",
  gratitude: "Elf Gratitude",
  aosol: "Avatars of Shadows Over Loathing",
  asol: "Avatars of Shadows Over Loathing",
  lol: "Legacy of Loathing",
  small: "A Shrunken Adventurer am I",
  smol: "A Shrunken Adventurer am I",
  shrunk: "A Shrunken Adventurer am I",
  shrunken: "A Shrunken Adventurer am I",
  "11t": "11 Things I Hate About U",
  "11tihau": "11 Things I Hate About U",
  ag: "Avant Guard",
  hats: "Hat Trick",
  zoot: "Z is for Zootomist",
  zootomist: "Z is for Zootomist",
  ht: "Hat Trick",
  sea: "11,037 Leagues Under the Sea",
};

const AUTOCOMPLETE_CHOICES = [
  ...Object.entries(BOARD_MAPPINGS).map(([board, id]) => ({
    name: board,
    value: id.toString(),
    match: board,
  })),
  ...Object.entries(BOARD_ALIASES).map(([alias, board]) => ({
    name: typeof board === "number" ? alias : board,
    value:
      typeof board === "number"
        ? board.toString()
        : Leaderboard.boardIdFor(board).toString(),
    match: alias,
  })),
];

const parseBoard = (input: string) => {
  // Named board
  const normalized = BOARD_ALIASES[input.toLowerCase().replace(/\W/g, "")];
  if (typeof normalized === "number") return normalized;
  if (normalized) return Leaderboard.boardIdFor(normalized);
  const boardNumber = parseInt(input) || 0;
  // Board referenced by internal id
  if (boardNumber <= 2000) return boardNumber;
  // Standard year
  return Leaderboard.boardIdForStandardYear(boardNumber);
};

const formatSubboard = (subboard: SubboardInfo) => {
  const runs = subboard.runs.map(
    (run) =>
      `${run.playerName} - ${run.days ? `${run.days}/` : ""}${run.turns}`,
  );
  if (runs.length > 12) runs.splice(12, 0, "🥉 Bronze Buttons 🥉");
  if (runs.length > 1) runs.splice(1, 0, "🥈 Silver Moons 🥈");
  if (runs.length) runs.splice(0, 0, "🥇 Gold Star 🥇");

  if (subboard.updated) {
    runs.splice(
      0,
      0,
      `Last updated ${time(subboard.updated, TimestampStyles.RelativeTime)}`,
      "",
    );
  }

  return {
    title: subboard.name || "...",
    name: subboard.name || "...",
    value: runs.join("\n").slice(0, 1024) || "No runs yet!",
    inline: true,
  };
};

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Display the specified leaderboard")
  .addStringOption((option) =>
    option
      .setName("leaderboard")
      .setDescription("The name or id of the leaderboard you want to display.")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const board = parseBoard(interaction.options.getString("leaderboard", true));

  await interaction.deferReply();

  const result = await leaderboard.getLeaderboard(board);
  if (!result || result.name === "Weird Leaderboards") {
    await interaction.editReply(
      "I don't think that's a real leaderboard, sorry.",
    );
    return;
  }

  if (result.boards.length === 0) {
    await interaction.editReply({
      content: null,
      embeds: [
        createEmbed()
          .setTitle(result.name || "...")
          .setDescription(
            "I wasn't able to understand this leaderboard, sorry.",
          ),
      ],
    });
    return;
  }

  await interaction.editReply({
    content: null,
    embeds: [
      createEmbed()
        .setTitle(result.name || "...")
        .addFields(result.boards.map(formatSubboard)),
    ],
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const filtered = AUTOCOMPLETE_CHOICES.filter(({ match }) =>
    match.toLowerCase().includes(focusedValue.toLowerCase()),
  )
    .filter(({ value }, i, a) => a.findIndex((c) => c.value === value) === i)
    .slice(0, 25);
  await interaction.respond(filtered);
}
