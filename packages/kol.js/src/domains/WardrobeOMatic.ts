import RNG from "kol-rng";

import type { Client } from "../Client.js";
import { getElementalResistanceAdjective } from "../utils/utils.js";

export type WardrobeSlot = "shirt" | "hat" | "familiar-equipment";

export type WardrobeModifier = {
  id: ModifierId;
  roll: number | [number, number];
  description: string;
};

export type WardrobeItem = {
  name: string;
  image: string;
  slot: WardrobeSlot;
  modifiers: WardrobeModifier[];
};

const SLOT_INDEX: Record<WardrobeSlot, number> = {
  shirt: 0,
  hat: 1,
  "familiar-equipment": 2,
};

const SLOT_IMAGE_PREFIX: Record<WardrobeSlot, string> = {
  shirt: "jw_shirt",
  hat: "jw_hat",
  "familiar-equipment": "jw_pet",
};

const SLOTS: WardrobeSlot[] = ["shirt", "hat", "familiar-equipment"];

type ModifierDef = {
  roll: (level: number, rng: RNG) => number | [number, number];
  format: (roll: number | [number, number]) => string;
  alwaysExists: boolean;
  order: number;
};

function formatResistance(element: string, roll: number): string {
  return `${getElementalResistanceAdjective(roll)} ${element} Resistance (+${roll})`;
}

const MODIFIERS = {
  muscle: {
    roll: (level, rng) => rng.mtRand.roll(10 * level + 10, 12 * level + 12),
    format: (roll) => `Muscle +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  mysticality: {
    roll: (level, rng) => rng.mtRand.roll(10 * level + 10, 12 * level + 12),
    format: (roll) => `Mysticality +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  moxie: {
    roll: (level, rng) => rng.mtRand.roll(10 * level + 10, 12 * level + 12),
    format: (roll) => `Moxie +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  resistanceHot: {
    roll: (level, rng) => rng.mtRand.roll(level + 1, level + 3),
    format: (roll) => formatResistance("Hot", roll as number),
    alwaysExists: true,
    order: 0,
  },
  resistanceCold: {
    roll: (level, rng) => rng.mtRand.roll(level + 1, level + 3),
    format: (roll) => formatResistance("Cold", roll as number),
    alwaysExists: true,
    order: 0,
  },
  resistanceStench: {
    roll: (level, rng) => rng.mtRand.roll(level + 1, level + 3),
    format: (roll) => formatResistance("Stench", roll as number),
    alwaysExists: true,
    order: 0,
  },
  resistanceSleaze: {
    roll: (level, rng) => rng.mtRand.roll(level + 1, level + 3),
    format: (roll) => formatResistance("Sleaze", roll as number),
    alwaysExists: true,
    order: 0,
  },
  resistanceSpooky: {
    roll: (level, rng) => rng.mtRand.roll(level + 1, level + 3),
    format: (roll) => formatResistance("Spooky", roll as number),
    alwaysExists: true,
    order: 0,
  },
  maximumHp: {
    roll: (level, rng) => rng.mtRand.roll(20 * level + 10, 20 * level + 30),
    format: (roll) => `Maximum HP +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  maximumMp: {
    roll: (level, rng) => rng.mtRand.roll(20 * level + 10, 20 * level + 30),
    format: (roll) => `Maximum MP +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  hpRegen: {
    roll: (level, rng): [number, number] => [
      rng.mtRand.roll(2 * level + 2, 2 * level + 4),
      rng.mtRand.roll(5 * level + 5, 5 * level + 10),
    ],
    format: (roll) => {
      const [min, max] = roll as [number, number];
      return `Regenerate ${min}-${max} HP per adventure`;
    },
    alwaysExists: true,
    order: 1,
  },
  mpRegen: {
    roll: (level, rng): [number, number] => [
      rng.mtRand.roll(3 * level + 3, 3 * level + 5),
      rng.mtRand.roll(5 * level + 5, 5 * level + 10),
    ],
    format: (roll) => {
      const [min, max] = roll as [number, number];
      return `Regenerate ${min}-${max} MP per adventure`;
    },
    alwaysExists: true,
    order: 2,
  },
  damageReduction: {
    roll: (level, rng) => rng.mtRand.roll(3 * level + 1, 3 * level + 5),
    format: (roll) => `Damage Reduction: ${roll}`,
    alwaysExists: true,
    order: 0,
  },
  damageAbsorption: {
    roll: (level, rng) => rng.mtRand.roll(10 * level + 10, 15 * level + 15),
    format: (roll) => `Damage Absorption +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  itemDrop: {
    roll: (level, rng) => rng.mtRand.roll(5 * level + 3, 5 * level + 8),
    format: (roll) => `+${roll}% Item Drops From Monsters`,
    alwaysExists: false,
    order: 0,
  },
  meatDrop: {
    roll: (level, rng) => rng.mtRand.roll(10 * level + 5, 10 * level + 15),
    format: (roll) => `+${roll}% Meat From Monsters`,
    alwaysExists: false,
    order: 0,
  },
  monsterLevel: {
    roll: (level, rng) => rng.mtRand.roll(5 * level + 0, 5 * level + 10),
    format: (roll) => `+${roll} to Monster Level`,
    alwaysExists: false,
    order: 0,
  },
  damageHot: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Hot Damage`,
    alwaysExists: true,
    order: 0,
  },
  damageCold: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Cold Damage`,
    alwaysExists: true,
    order: 0,
  },
  damageStench: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Stench Damage`,
    alwaysExists: true,
    order: 0,
  },
  damageSleaze: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Sleaze Damage`,
    alwaysExists: true,
    order: 0,
  },
  damageSpooky: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Spooky Damage`,
    alwaysExists: true,
    order: 0,
  },
  spellDamageHot: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Damage to Hot Spells`,
    alwaysExists: true,
    order: 0,
  },
  spellDamageCold: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Damage to Cold Spells`,
    alwaysExists: true,
    order: 0,
  },
  spellDamageStench: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Damage to Stench Spells`,
    alwaysExists: true,
    order: 0,
  },
  spellDamageSleaze: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Damage to Sleaze Spells`,
    alwaysExists: true,
    order: 0,
  },
  spellDamageSpooky: {
    roll: (level, rng) => rng.mtRand.roll(4 * level + 4, 6 * level + 6),
    format: (roll) => `+${roll} Damage to Spooky Spells`,
    alwaysExists: true,
    order: 0,
  },
  familiarWeight: {
    roll: (level, rng) => 7 + 2 * level - rng.mtRand.roll(0, 2),
    format: (roll) => `+${roll} to Familiar Weight`,
    alwaysExists: true,
    order: 0,
  },
  familiarDamage: {
    roll: (level, rng) => rng.mtRand.roll(15 * level + 15, 25 * level + 25),
    format: (roll) => `Familiar Damage +${roll}`,
    alwaysExists: true,
    order: 0,
  },
  familiarExperience: {
    roll: (level) => level + 1,
    format: (roll) => `+${roll} Familiar Experience per Combat`,
    alwaysExists: false,
    order: 0,
  },
} as const satisfies Record<string, ModifierDef>;

type ModifierId = keyof typeof MODIFIERS;

const MODIFIERS_BY_SLOT: Record<WardrobeSlot, ModifierId[]> = {
  shirt: [
    "muscle",
    "mysticality",
    "moxie",
    "resistanceHot",
    "resistanceCold",
    "resistanceStench",
    "resistanceSleaze",
    "resistanceSpooky",
    "maximumHp",
    "maximumMp",
    "hpRegen",
    "mpRegen",
    "damageReduction",
    "damageAbsorption",
    "itemDrop",
    "meatDrop",
    "monsterLevel",
  ],
  hat: [
    "muscle",
    "mysticality",
    "moxie",
    "maximumHp",
    "maximumMp",
    "hpRegen",
    "mpRegen",
    "damageHot",
    "damageCold",
    "damageStench",
    "damageSleaze",
    "damageSpooky",
    "spellDamageHot",
    "spellDamageCold",
    "spellDamageStench",
    "spellDamageSleaze",
    "spellDamageSpooky",
    "itemDrop",
    "meatDrop",
    "monsterLevel",
  ],
  "familiar-equipment": [
    "familiarWeight",
    "familiarDamage",
    "familiarExperience",
  ],
};

const SHIRT_ADJECTIVES = [
  "galvanized",
  "double-creased",
  "double-breasted",
  "foil-clad",
  "aluminum-threaded",
  "electroplated",
  "carbon-coated",
  "phase-changing",
  "liquid cooled",
  "conductive",
  "radation-shielded",
  "nanotube-threaded",
  "moisture-wicking",
  "shape-memory",
  "antimicrobial",
  "liquid-cooled",
];

const SHIRT_MATERIALS = [
  "gabardine",
  "mylar",
  "polyester",
  "double-polyester",
  "triple-polyester",
  "rayon",
  "wax paper",
  "aluminum foil",
  "synthetic silk",
  "xylon",
  "gore-tex",
  "kapton",
  "flannel",
  "silk",
  "cotton",
  "linen",
  "wool",
];

const SHIRT_MATERIAL_QUALITIES = [
  "super",
  "hyper",
  "ultra",
  "mega",
  "reroll",
];

const SHIRT_BASE_NAMES = [
  "t-shirt",
  "sweater",
  "jersey",
  "polo shirt",
  "dress shirt",
  "Neo-Hawaiian shirt",
  "sweatshirt",
];

const HAT_ADJECTIVES = [
  "nanoplated",
  "self-replicating",
  "autonomous",
  "fusion-powered",
  "fision-powered",
  "hyperefficient",
  "quantum",
  "nuclear",
  "magnetic",
  "laser-guided",
  "solar-powered",
  "psionic",
  "gravitronic",
  "biotronic",
  "neurolinked",
  "transforming",
  "meta-fashionable",
];

const HAT_METALS = [
  "tungsten",
  "carbon",
  "steel",
  "aluminum",
  "titanium",
  "iron",
  "hafnium",
  "nickel",
  "zinc",
  "lead",
  "platinum",
  "copper",
  "silver",
  "tantalum",
  "niobium",
  "palladium",
  "iridium",
  "bismuth",
  "cobalt",
  "indium",
  "molybdenum",
  "vanadium",
  "yttrium",
  "antimony",
];

const HAT_BASE_MODIFIERS = [
  "super",
  "ultra",
  "mega",
  "double-",
  "gamma-",
  "uber-",
  "great-",
  "grand-",
  "maxi-",
  "multi-",
  "tri-",
  "duo-",
  "gargantu-",
  "crypto-",
  "hyper",
  "cyber-",
  "astro-",
  "grav-",
];

const HAT_BASE_NAMES = [
  "beanie",
  "fedora",
  "trilby",
  "beret",
  "visor",
  "turban",
  "fez",
  "balaclava",
  "tam",
  "sombrero",
  "bowler",
  "cloche",
  "tiara",
  "snood",
  "diadem",
  "crown",
  "bandana",
  "cowl",
  "capuchon",
];

const FAMEQUIP_ADJECTIVES = [
  "hyperchromatic",
  "pearlescent",
  "bright",
  "day-glo",
  "luminescent",
  "vibrant",
  "earthy",
  "oversaturated",
  "partially transparent",
  "opaque",
  "faded",
  "metallic",
  "shiny",
  "glow-in-the-dark",
  "neon",
  "prismatic",
  "incandescent",
  "polychromatic",
  "opalescent",
  "psychedelic",
  "kaleidoscopic",
];

const FAMEQUIP_COLORS = [
  "amber",
  "aquamarine",
  "auburn",
  "azure",
  "beige",
  "black",
  "blue",
  "brown",
  "burgundy",
  "cerulean",
  "chartreuse",
  "cornflower",
  "cream",
  "crimson",
  "cyan",
  "ecru",
  "emerald",
  "fuchsia",
  "golden",
  "gray",
  "green",
  "indigo",
  "lavender",
  "lilac",
  "magenta",
  "maroon",
  "mauve",
  "mustard",
  "navy",
  "ochre",
  "olive",
  "orange",
  "periwinkle",
  "pink",
  "puce",
  "purple",
  "red",
  "rose",
  "ruby",
  "salmon",
  "scarlet",
  "sepia",
  "sienna",
  "silver",
  "tan",
  "taupe",
  "teal",
  "turquoise",
  "ultramarine",
  "vermilion",
  "violet",
  "viridian",
  "white",
  "yellow",
];

const FAMEQUIP_BASE_NAMES = ["pet tag", "collar", "pet sweater"];

/**
 * Convert KoL player level to wardrobe tier.
 * Levels 1-4 → 0, 5-9 → 1, 10-14 → 2, 15-19 → 3, 20+ → 4
 */
function wardrobeLevel(playerLevel: number): number {
  return Math.floor(playerLevel / 5);
}

function generateShirtName(rng: RNG): string {
  rng.mtRand.roll(0, 0); // burn one roll
  const adjective = rng.pickOne(SHIRT_ADJECTIVES);
  const materialIndex = rng.roll(0, SHIRT_MATERIALS.length - 1);
  let materialQuality = "";
  if (materialIndex > 11) {
    materialQuality = "reroll";
    while (materialQuality === "reroll") {
      materialQuality = rng.pickOne(SHIRT_MATERIAL_QUALITIES);
    }
  }
  const baseName = rng.pickOne(SHIRT_BASE_NAMES);
  return `${adjective} ${materialQuality}${SHIRT_MATERIALS[materialIndex]} ${baseName}`;
}

function generateHatName(rng: RNG): string {
  rng.mtRand.roll(0, 0); // burn three rolls
  rng.mtRand.roll(0, 0);
  rng.mtRand.roll(0, 0);
  const adjective = rng.pickOne(HAT_ADJECTIVES);
  rng.mtRand.roll(0, 0); // burn one roll
  const firstMetal = rng.pickOne(HAT_METALS);
  rng.mtRand.roll(0, 0); // burn one roll
  let secondMetal = firstMetal;
  while (firstMetal === secondMetal) {
    secondMetal = rng.pickOne(HAT_METALS);
  }
  const baseModifier = rng.pickOne(HAT_BASE_MODIFIERS);
  const baseName = rng.pickOne(HAT_BASE_NAMES);
  return `${adjective} ${firstMetal}-${secondMetal} ${baseModifier}${baseName}`;
}

function generateFamEquipName(rng: RNG, image: number): string {
  rng.mtRand.roll(0, 0); // burn one roll
  const adjective = rng.pickOne(FAMEQUIP_ADJECTIVES);
  rng.mtRand.roll(0, 0); // burn one roll
  const conjunction = rng.mtRand.roll(0, 1) === 0 ? "-" : " and ";
  const firstColor = rng.pickOne(FAMEQUIP_COLORS);
  rng.mtRand.roll(0, 0); // burn one roll
  let secondColor = firstColor;
  while (firstColor === secondColor) {
    secondColor = rng.pickOne(FAMEQUIP_COLORS);
  }
  const baseName = FAMEQUIP_BASE_NAMES[Math.floor((image - 1) / 3)];
  return `${adjective} ${firstColor}${conjunction}${secondColor} ${baseName}`;
}

function generateItem(
  gameday: number,
  level: number,
  slot: WardrobeSlot,
): WardrobeItem {
  const slotIndex = SLOT_INDEX[slot];
  const seed = gameday * (11391 + slotIndex) + 2063;
  const rng = new RNG(seed);

  const imageNum = rng.mtRand.roll(1, 9);
  const imagePrefix = slot === "hat" && imageNum === 9 ? "hw_hat" : SLOT_IMAGE_PREFIX[slot];
  const image = `${imagePrefix}${imageNum}`;

  let name: string;
  if (slot === "shirt") {
    name = generateShirtName(rng);
  } else if (slot === "hat") {
    name = generateHatName(rng);
  } else {
    name = generateFamEquipName(rng, imageNum);
  }

  const effectsList: ModifierId[] = [];
  for (const modId of MODIFIERS_BY_SLOT[slot]) {
    const mod = MODIFIERS[modId];
    if (level > 2 || mod.alwaysExists) effectsList.push(modId);
  }
  rng.shuffle(effectsList);

  const effectCount = slot === "familiar-equipment" ? 1 : level + 1;
  const effectsByOrder = new Map<number, WardrobeModifier[]>();

  for (let i = 0; i < effectCount; i++) {
    const modId = effectsList[i];
    const mod = MODIFIERS[modId];
    const roll = mod.roll(level, rng);
    const group = effectsByOrder.get(mod.order) ?? [];
    group.push({ id: modId, roll, description: mod.format(roll) });
    effectsByOrder.set(mod.order, group);
  }

  const modifiers: WardrobeModifier[] = [];
  for (const order of [...effectsByOrder.keys()].sort((a, b) => a - b)) {
    modifiers.push(...effectsByOrder.get(order)!);
  }

  return { name, image, slot, modifiers };
}

export class WardrobeOMatic {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getWardrobe(): Promise<WardrobeItem[]> {
    const status = await this.#client.fetchStatus();
    const gameday = Number(status.daynumber);
    const playerLevel = Number(status.level);
    return WardrobeOMatic.getWardrobe(gameday, playerLevel);
  }

  static getWardrobe(gameday: number, playerLevel: number): WardrobeItem[];
  static getWardrobe(
    gameday: number,
    playerLevel: number,
    slot: WardrobeSlot,
  ): WardrobeItem;
  static getWardrobe(
    gameday: number,
    playerLevel: number,
    slot?: WardrobeSlot,
  ): WardrobeItem | WardrobeItem[] {
    const level = wardrobeLevel(playerLevel);
    if (slot !== undefined) return generateItem(gameday, level, slot);
    return SLOTS.map((s) => generateItem(gameday, level, s));
  }
}
