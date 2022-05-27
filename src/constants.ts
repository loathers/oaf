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

export const PACKAGES: Map<string, string> = new Map([
  ["packet of maygfly bait", "mayfly bait necklace"],
  ["grumpy bumpkin's pumpkin seed catalog", "packet of pumpkin seeds"],
  ["make-your-own-vampire-fangs kit", "plastic vampire fangs"],
  ["mint salton pepper's peppermint seed catalog", "peppermint pip packet"],
  ["pete & jackie's dragon tooth emporium catalog", "packet of dragon's teeth"],
  ["folder holder", "over-the-shoulder folder holder"],
  ["discontent™ winter garden catalog", "packet of winter seeds"],
  ["ed the undying exhibit crate", "the crown of ed the undying"],
  ["pack of every card", "deck of every card"],
  ["diy protonic accelerator kit", "protonic accelerator pack"],
  ["dear past self package", "time-spinner"],
  ["suspicious package", "kremlin's greatest briefcase"],
  ["li-11 motor pool voucher", "asdon martin keyfob"],
  ["corked genie bottle", "genie bottle"],
  ["pantogram", "portable pantogram"],
  ["locked mumming trunk", "mumming trunk"],
  ["january's garbage tote (unopened)", "january's garbage tote"],
  ["pokéfam guide to capturing all of them", "packet of tall grass seeds"],
  ["songboom™ boombox box", "songboom™ boombox"],
  ["bastille batallion control rig crate", "bastille batallion control rig"],
  ["latte lovers club card", "latte lovers member's mug"],
  ["kramco industries packing carton", "kramco sausage-o-matic™"],
  ["mint condition lil' doctor™ bag", "lil' doctor™ bag"],
  ["vampyric cloake pattern", "vampyric cloake"],
  ["fourth of may cosplay saber kit", "fourth of may cosplay saber"],
  ["rune-strewn spoon coccoon", "hewn moon-rune spoon"],
  ["beach comb box", "beach comb"],
  ["unopened eight days a week pill keeper", "eight days a week pill keeper"],
  ["unopened diabolic pizza cube box", "diabolic pizza cube"],
  ["mint-in-box powerful glove", "powerful glove"],
  ["better shrooms and gardens catalog", "packet of mushroom spores"],
  ["guzzlr application", "guzzlr tablet"],
  ["bag of iunion stones", "iunion crown"],
  ["packaged spinmaster™ lathe", "spinmaster™ lathe"],
  ["bagged cargo cultist shorts", "cargo cultist shorts"],
  ["packaged knock-off retro superhero cape", "unwrapped knock-off retro superhero cape"],
  ["box o' ghosts", "greedy ghostling"],
  ["packaged miniature crystal ball", "miniature crystal ball"],
  ["emotion chip", "spinal-fluid-covered emotion chip"],
  ["power seed", "potted power plant"],
  ["packaged backup camera", "backup camera"],
  ["packaged familiar scrapbook", "familiar scrapbook"],
  ["packaged industrial fire extinguisher", "industrial fire extinguisher"],
  ["packaged daylight shavings helmet", "daylight shavings helmet"],
  ["packaged cold medicine cabinet", "cold medicine cabinet"],
  ["undrilled cosmic bowling ball", "cosmic bowling ball"],
  ["combat lover's locket lockbox", "combat lover's locket"],
  ["undamaged unbreakable umbrella", "unbreakable umbrella"],
  ["retrospecs try-at-home kit", "retrospecs"],
  ["fresh can of paint", "fresh coat of paint"],
  ["mint condition magnifying glass", "cursed magnifying glass"],
]);

const ghostlings: [string, string][] = [
  ["grinning ghostling", "box o' ghosts"],
  ["gregarious ghostling", "box o' ghosts"],
  ["greedy ghostling", "box o' ghosts"],
];

const reversed: [string, string][] = Array.from(PACKAGES.keys()).map((key) => [
  PACKAGES.get(key) || "",
  key,
]);

export const REVERSE_PACKAGES: Map<string, string> = new Map(reversed.concat(ghostlings));

export const PATH_MAPPINGS: Map<string, number> = new Map([
  ["clan", 8],
  ["clan dungeons", 8],
  ["slime tube", 8],
  ["slime", 8],
  ["hobopolis", 8],
  ["hobo", 8],
  ["bees hate you", 9],
  ["bhy", 9],
  ["bees", 9],
  ["way of the surprising fist", 10],
  ["wotsf", 10],
  ["fist", 10],
  ["trendy", 11],
  ["avatar of boris", 12],
  ["aob", 12],
  ["boris", 12],
  ["bugbear invasion", 13],
  ["bugbear", 13],
  ["zombie slayer", 14],
  ["zombie", 14],
  ["class act", 15],
  ["avatar of jarlsberg", 16],
  ["jarlsberg", 16],
  ["jarl", 16],
  ["aoj", 16],
  ["big", 17],
  ["kolhs", 18],
  ["hs", 18],
  ["high school", 18],
  ["class act ii", 19],
  ["class act 2", 19],
  ["avatar of sneaky pete", 20],
  ["sneaky pete", 20],
  ["pete", 20],
  ["aosp", 20],
  ["slow and steady", 21],
  ["heavy rains", 22],
  ["hr", 22],
  ["picky", 23],
  ["actually ed the undying", 24],
  ["ed the undying", 24],
  ["ed", 24],
  ["undying", 24],
  ["one crazy random summer", 25],
  ["ocrs", 25],
  ["community service", 26],
  ["cs", 26],
  ["hccs", 26],
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
