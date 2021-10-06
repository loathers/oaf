export type FamiliarActionTypes =
  | "none"
  | "stat0"
  | "stat1"
  | "item0"
  | "meat0"
  | "combat0"
  | "combat1"
  | "drop"
  | "block"
  | "delevel"
  | "hp0"
  | "mp0"
  | "meat1"
  | "stat2"
  | "other0"
  | "hp1"
  | "mp1"
  | "stat3"
  | "other1"
  | "passive"
  | "underwater"
  | "variable";

type FamiliarClassification = {
  combination: FamiliarActionTypes[];
  description: string;
};

export const FAMILIAR_CLASSIFCATIONS: FamiliarClassification[] = [
  {
    combination: ["combat0", "meat1", "delevel", "hp0", "mp0"],
    description: "Cocoabo-like.",
  },
  {
    combination: ["combat0", "combat1", "mp0", "hp0"],
    description: "Deals elemental and physical damage to restore your hp and mp in combat.",
  },
  {
    combination: ["combat0", "combat1", "mp0"],
    description: "Deals elemental and physical damage to restore your mp in combat.",
  },
  {
    combination: ["combat0", "combat1", "hp0"],
    description: "Deals elemental and physical damage to heal you in combat.",
  },
  {
    combination: ["combat0", "mp0", "hp0"],
    description: "Deals physical damage to restore your hp and mp in combat.",
  },
  {
    combination: ["combat0", "mp0"],
    description: "Deals physical damage to restore your mp in combat.",
  },
  {
    combination: ["combat0", "hp0"],
    description: "Deals physical damage to heal you in combat.",
  },
  {
    combination: ["combat1", "mp0", "hp0"],
    description: "Deals elemental damage to restore your hp and mp in combat.",
  },
  {
    combination: ["combat1", "mp0"],
    description: "Deals elemental damage to restore your mp in combat.",
  },
  {
    combination: ["combat1", "hp0"],
    description: "Deals elemental damage to heal you in combat.",
  },
  {
    combination: ["combat0", "combat1"],
    description: "Deals physical and elemental damage in combat.",
  },
  {
    combination: ["combat0"],
    description: "Deals physical damage in combat.",
  },
  {
    combination: ["combat1"],
    description: "Deals elemental damage in combat.",
  },
  {
    combination: ["item0", "meat0", "stat0"],
    description: "Boosts item drops, meat drops and stat gains (volleyball-like).",
  },
  {
    combination: ["meat0", "stat0"],
    description: "Boosts meat drops and stat gains (volleyball-like).",
  },
  {
    combination: ["item0", "stat0"],
    description: "Boosts item drops and stat gains (volleyball-like).",
  },
  {
    combination: ["item0", "meat0", "stat1"],
    description: "Boosts item drops, meat drops and stat gains (sombrero-like).",
  },
  {
    combination: ["meat0", "stat1"],
    description: "Boosts meat drops and stat gains (sombrero-like).",
  },
  {
    combination: ["item0", "stat1"],
    description: "Boosts item drops and stat gains (sombrero-like).",
  },
  {
    combination: ["stat0"],
    description: "Boosts stat gains (volleyball-like).",
  },
  {
    combination: ["stat1"],
    description: "Boosts stat gains (sombero-like).",
  },
  {
    combination: ["meat0", "item0"],
    description: "Boosts item and meat drops.",
  },
  {
    combination: ["item0"],
    description: "Boosts item drops.",
  },
  {
    combination: ["meat0"],
    description: "Boosts meat drops",
  },
  {
    combination: ["block"],
    description: "Staggers enemies in combat.",
  },
  {
    combination: ["delevel"],
    description: "Delevels enemies in combat.",
  },
  {
    combination: ["hp0", "mp0"],
    description: "Restores your hp and mp during combat.",
  },
  {
    combination: ["hp0"],
    description: "Heals you during combat.",
  },
  {
    combination: ["mp0"],
    description: "Restores your mp during combat.",
  },
  {
    combination: ["meat1"],
    description: "Drops meat during combat.",
  },
  {
    combination: ["stat2"],
    description: "Grants stats during combat.",
  },
  {
    combination: ["other0"],
    description: "Does something unusual during combat.",
  },
  {
    combination: ["hp1", "mp1"],
    description: "Restores your hp and mp after combat.",
  },
  {
    combination: ["hp1"],
    description: "Heals you after combat.",
  },
  {
    combination: ["mp1"],
    description: "Restores mp after combat.",
  },
  {
    combination: ["stat3"],
    description: "Grants stats after combat.",
  },
  {
    combination: ["other1"],
    description: "Does something unusual after combat.",
  },
  {
    combination: ["passive"],
    description: "Grants a passive benefit.",
  },
  {
    combination: ["drop"],
    description: "Drops special items.",
  },
  {
    combination: ["variable"],
    description: "Has varying abilities.",
  },
  {
    combination: ["none"],
    description: "Does nothing useful.",
  },
  {
    combination: ["underwater"],
    description: "Can naturally breathe underwater.",
  },
];

export const HARD_CODED_FAMILIARS: Map<string, string> = new Map([
  ["baby mutant rattlesnake", "Boosts stat gains based on Grimace Darkness.\n"],
  ["chocolate lab", "Boosts item and sprinkle drops.\n"],
  ["cute meteor", "Increases your combat initiative.\nDeals elemental damage in combat.\n"],
  ["disgeist", "Decreases your combat frequency.\n"],
  ["exotic parrot", "Increases your elemental resistances.\n"],
  [
    "happy medium",
    "Increases your combat initiative.\nBoosts stat gains (volleyball-like).\nDrops special items.\n",
  ],
  [
    "god lobster",
    "Boosts stat gains (volleyball-like).\nHas varying abilities.\nCan naturally breathe underwater.\n",
  ],
  ["hobo monkey", "Massively boosts meat drops.\nDrops meat during combat.\n"],
  ["jumpsuited hound dog", "Massively boosts item drops.\nIncreases your combat frequency.\n"],
  ["magic dragonfish", "Increases your spell damage.\n"],
  ["peppermint rhino", "Boosts item drops, especially in Dreadsylvania.\n"],
  ["melodramedary", "Boosts stat gains (volleyball-like).\nRestores your mp after combat.\n"],
  ["mu", "Increases your elemental resistances.\nDeals elemental damage in combat.\n"],
  ["mutant cactus bud", "Boosts meat drops based on Grimace Darkness.\n"],
  ["mutant fire ant", "Boosts item drops based on Grimace Darkness.\n"],
  ["oily woim", "Increases your combat initiative.\n"],
  ["peppermint rhino", "Boosts item drops, especially candy drops.\n"],
  ["purse rat", "Increases your monster level.\n"],
  ["red-nosed snapper", "Boosts item drops, especially underwater.\nDrops special items.\n"],
  ["robortender", "Boosts your meat drops.\nDrops special items.\nHas varying abilities.\n"],
  [
    "space jellyfish",
    "Increases your combat initiative.\nBoosts your item drops and stat gains (volleyball-like), especially underwater.\nDelevels enemies in combat.\nDrops special items.\n",
  ],
  [
    "steam-powered cheerleader",
    "Boosts item drops based on remaining steam.\nDelevels enemies in combat based on remaining steam.\nDoes something unusual during combat.\n",
  ],
  ["trick-or-treating tot", "Restores your hp and mp after combat.\nHas varying abilities.\n"],
  ["xiblaxian holo-companion", "Increases your combat initiative.\nStaggers enemies in combat.\n"],
  ["black cat", "Is adorable.\nGenerally messes with you.\n"],
  ["o.a.f.", "Is optimal.\nGenerally messes with you.\n"],
]);

export const ORB_RESPONSES: string[] = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "If CDM has a free moment, sure.",
  "Why not?",
  "How am I meant to know?",
  "I guess???",
  "...you realise that this is just a random choice from a list of strings, right?",
  "I have literally no way to tell.",
  "Ping Bobson, he probably knows",
  "Check the wiki, answer's probably in there somewhere.",
  "The wiki has the answer.",
  "The wiki has the answer, but it's wrong.",
  "I've not finished spading the answer to that question yet.",
  "The devs know, go pester them instead of me.",
  "INSUFFICIENT DATA FOR MEANINGFUL ANSWER",
  "THERE IS AS YET INSUFFICIENT DATA FOR A MEANINGFUL ANSWER",
];

export const KILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+defeated\D+(\d+)/;
export const SKILLMATCHER = /([A-Za-z0-9\-\_ ]+)\s+\(#\d+\)\s+used the machine/;
export const ITEMMATCHER = /\[\[([^\[\]]*)\]\]/g;

export const ROLEMAP: Map<string, string> = new Map([
  ["🇹", "741479573337800706"],
  ["♀️", "741479514902757416"],
  ["♂️", "741479366319538226"],
  ["👂", "466622497991688202"],
  ["🚫", "512522219574919179"],
  ["✅", "754473984661258391"],
]);