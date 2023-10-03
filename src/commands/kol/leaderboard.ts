import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { SubboardInfo, kolClient } from "../../clients/kol.js";

const BOARD_MAPPINGS = {
  "Clan Dungeons": 8,
  "Bees Hate You": 9,
  "Way of the Surprising Fist": 10,
  Trendy: 11,
  "Avatar of Boris": 12,
  "Bugbear Invasion": 13,
  "Zombie Slayer": 14,
  "Class Act": 15,
  "Avatar of Jarlsberg": 16,
  "BIG!": 17,
  KOLHS: 18,
  "Class Act II": 19,
  "Avatar of Sneaky Pete": 20,
  "Slow and Steady": 21,
  "Heavy Rains": 22,
  Picky: 23,
  "Actually Ed the Undying": 24,
  "One Crazy Random Summer": 25,
  "Community Service": 26,
  Batfellow: 27,
  "Avatar of West of Loathing": 28,
  "The Source": 29,
  "Nuclear Autumn": 30,
  "Gelatinous Noob": 31,
  "License to Adventure": 32,
  "Live. Ascend. Repeat.": 33,
  "Pocket Familiars": 34,
  "G Lover": 35,
  "Disguises Delimit": 36,
  "Dark Gyffte": 37,
  "Two Crazy Random Summer": 38,
  "Kingdom of Exploathing": 39,
  "Path of the Plumber": 40,
  "Low Key Summer": 41,
  "Grey Goo": 42,
  "You, Robot": 43,
  "Quantum Terrarium": 44,
  "Wild Fire": 45,
  "Grey You": 46,
  Journeyman: 47,
  "Fall of the Dinosaurs": 48,
  "Avatars of Shadows Over Loathing": 49,
  "Legacy of Loathing": 50,
  "A Shrunken Adventurer am I": 51,
  Standard: 99,
  "Elf Gratitude": 900,
} as const;

const BOARD_ALIASES: Record<string, keyof typeof BOARD_MAPPINGS> = {
  // Automatically alias board names without non-alphanumerics
  ...Object.keys(BOARD_MAPPINGS).reduce(
    (acc, key) => ({ ...acc, [key.toLowerCase().replace(/[\W_]+/g, "")]: key }),
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
};

const AUTOCOMPLETE_CHOICES = [
  ...Object.entries(BOARD_MAPPINGS).map(([board, id]) => ({
    name: board,
    value: id.toString(),
    match: board,
  })),
  ...Object.entries(BOARD_ALIASES).map(([alias, board]) => ({
    name: board,
    value: BOARD_MAPPINGS[board].toString(),
    match: alias,
  })),
];

const parseBoard = (input: string) => {
  // Named board
  const normalized = BOARD_ALIASES[input.toLowerCase().replace(/\W/g, "")];
  if (normalized) return BOARD_MAPPINGS[normalized];
  const boardNumber = parseInt(input) || 0;
  // Board referenced by internal id
  if (boardNumber <= 2000) return boardNumber;
  // Current standard year
  if (boardNumber === new Date().getFullYear()) return 999;
  // Other standard year
  return 998 + 2015 - boardNumber;
};

const formatSubboard = (subboard: SubboardInfo) => {
  const runs = subboard.runs.map(
    (run) => `${run.player} - ${run.days ? `${run.days}/` : ""}${run.turns}`,
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

  const leaderboard = await kolClient.getLeaderboard(board);
  if (!leaderboard || leaderboard.name === "Weird Leaderboards") {
    interaction.editReply("I don't think that's a real leaderboard, sorry.");
    return;
  }

  if (leaderboard.boards.length === 0) {
    interaction.editReply({
      content: null,
      embeds: [
        createEmbed()
          .setTitle(leaderboard.name || "...")
          .setDescription(
            "I wasn't able to understand this leaderboard, sorry.",
          ),
      ],
    });
    return;
  }

  interaction.editReply({
    content: null,
    embeds: [
      createEmbed()
        .setTitle(leaderboard.name || "...")
        .addFields(leaderboard.boards.map(formatSubboard)),
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
