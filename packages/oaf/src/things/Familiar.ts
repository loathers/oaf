import {
  type Familiar as DolFamiliar,
  FamiliarCategory,
} from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { cleanString, toWikiLink } from "kol.js";

import { kolClient } from "../clients/kol.js";
import { indent } from "../utils.js";
import { memoize } from "../utils/memoize.js";
import { Item } from "./Item.js";
import { Thing } from "./Thing.js";

type FamiliarClassification = {
  combination: FamiliarCategory[];
  description: string;
};

export const FAMILIAR_CLASSIFCATIONS: FamiliarClassification[] = [
  {
    combination: [
      FamiliarCategory.Combat0,
      FamiliarCategory.Meat1,
      FamiliarCategory.Delevel1,
      FamiliarCategory.Hp0,
      FamiliarCategory.Mp0,
    ],
    description: "Cocoabo-like.",
  },
  {
    combination: [
      FamiliarCategory.Combat0,
      FamiliarCategory.Combat1,
      FamiliarCategory.Mp0,
      FamiliarCategory.Hp0,
    ],
    description:
      "Deals elemental and physical damage to restore your hp and mp in combat.",
  },
  {
    combination: [
      FamiliarCategory.Combat0,
      FamiliarCategory.Combat1,
      FamiliarCategory.Mp0,
    ],
    description:
      "Deals elemental and physical damage to restore your mp in combat.",
  },
  {
    combination: [
      FamiliarCategory.Combat0,
      FamiliarCategory.Combat1,
      FamiliarCategory.Hp0,
    ],
    description: "Deals elemental and physical damage to heal you in combat.",
  },
  {
    combination: [
      FamiliarCategory.Combat0,
      FamiliarCategory.Mp0,
      FamiliarCategory.Hp0,
    ],
    description: "Deals physical damage to restore your hp and mp in combat.",
  },
  {
    combination: [FamiliarCategory.Combat0, FamiliarCategory.Mp0],
    description: "Deals physical damage to restore your mp in combat.",
  },
  {
    combination: [FamiliarCategory.Combat0, FamiliarCategory.Hp0],
    description: "Deals physical damage to heal you in combat.",
  },
  {
    combination: [
      FamiliarCategory.Combat1,
      FamiliarCategory.Mp0,
      FamiliarCategory.Hp0,
    ],
    description: "Deals elemental damage to restore your hp and mp in combat.",
  },
  {
    combination: [FamiliarCategory.Combat1, FamiliarCategory.Mp0],
    description: "Deals elemental damage to restore your mp in combat.",
  },
  {
    combination: [FamiliarCategory.Combat1, FamiliarCategory.Hp0],
    description: "Deals elemental damage to heal you in combat.",
  },
  {
    combination: [FamiliarCategory.Combat0, FamiliarCategory.Combat1],
    description: "Deals physical and elemental damage in combat.",
  },
  {
    combination: [FamiliarCategory.Combat0],
    description: "Deals physical damage in combat.",
  },
  {
    combination: [FamiliarCategory.Combat1],
    description: "Deals elemental damage in combat.",
  },
  {
    combination: [
      FamiliarCategory.Item0,
      FamiliarCategory.Meat0,
      FamiliarCategory.Stat0,
    ],
    description:
      "Boosts item drops, meat drops and stat gains (volleyball-like).",
  },
  {
    combination: [FamiliarCategory.Meat0, FamiliarCategory.Stat0],
    description: "Boosts meat drops and stat gains (volleyball-like).",
  },
  {
    combination: [FamiliarCategory.Item0, FamiliarCategory.Stat0],
    description: "Boosts item drops and stat gains (volleyball-like).",
  },
  {
    combination: [
      FamiliarCategory.Item0,
      FamiliarCategory.Meat0,
      FamiliarCategory.Stat1,
    ],
    description:
      "Boosts item drops, meat drops and stat gains (sombrero-like).",
  },
  {
    combination: [FamiliarCategory.Meat0, FamiliarCategory.Stat1],
    description: "Boosts meat drops and stat gains (sombrero-like).",
  },
  {
    combination: [FamiliarCategory.Item0, FamiliarCategory.Stat1],
    description: "Boosts item drops and stat gains (sombrero-like).",
  },
  {
    combination: [FamiliarCategory.Stat0],
    description: "Boosts stat gains (volleyball-like).",
  },
  {
    combination: [FamiliarCategory.Stat1],
    description: "Boosts stat gains (sombrero-like).",
  },
  {
    combination: [FamiliarCategory.Meat0, FamiliarCategory.Item0],
    description: "Boosts item and meat drops.",
  },
  { combination: [FamiliarCategory.Item0], description: "Boosts item drops." },
  { combination: [FamiliarCategory.Meat0], description: "Boosts meat drops." },
  {
    combination: [FamiliarCategory.Block],
    description: "Staggers enemies in combat.",
  },
  {
    combination: [FamiliarCategory.Delevel0],
    description: "Delevels enemies at the start of combat (barrrnacle-like).",
  },
  {
    combination: [FamiliarCategory.Delevel1],
    description: "Delevels enemies during combat (ghost pickle-like).",
  },
  {
    combination: [FamiliarCategory.Hp0, FamiliarCategory.Mp0],
    description: "Restores your hp and mp during combat.",
  },
  {
    combination: [FamiliarCategory.Hp0],
    description: "Heals you during combat.",
  },
  {
    combination: [FamiliarCategory.Mp0],
    description: "Restores your mp during combat.",
  },
  {
    combination: [FamiliarCategory.Meat1],
    description: "Drops meat during combat.",
  },
  {
    combination: [FamiliarCategory.Stat2],
    description: "Grants stats during combat.",
  },
  {
    combination: [FamiliarCategory.Other0],
    description: "Does something unusual during combat.",
  },
  {
    combination: [FamiliarCategory.Hp1, FamiliarCategory.Mp1],
    description: "Restores your hp and mp after combat.",
  },
  {
    combination: [FamiliarCategory.Hp1],
    description: "Heals you after combat.",
  },
  {
    combination: [FamiliarCategory.Mp1],
    description: "Restores mp after combat.",
  },
  {
    combination: [FamiliarCategory.Stat3],
    description: "Grants stats after combat.",
  },
  {
    combination: [FamiliarCategory.Other1],
    description: "Does something unusual after combat.",
  },
  {
    combination: [FamiliarCategory.Passive],
    description: "Grants a passive benefit.",
  },
  { combination: [FamiliarCategory.Drop], description: "Drops special items." },
  {
    combination: [FamiliarCategory.Variable],
    description: "Has varying abilities.",
  },
  {
    combination: [FamiliarCategory.Underwater],
    description: "Can naturally breathe underwater.",
  },
];

export const HARD_CODED_FAMILIARS: Map<string, string> = new Map([
  ["baby mutant rattlesnake", "Boosts stat gains based on Grimace Darkness.\n"],
  ["chocolate lab", "Boosts item and sprinkle drops.\n"],
  [
    "cute meteor",
    "Increases your combat initiative.\nDeals elemental damage in combat.\n",
  ],
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
  [
    "jumpsuited hound dog",
    "Massively boosts item drops.\nIncreases your combat frequency.\n",
  ],
  ["magic dragonfish", "Increases your spell damage.\n"],
  ["peppermint rhino", "Boosts item drops, especially in Dreadsylvania.\n"],
  [
    "melodramedary",
    "Boosts stat gains (volleyball-like).\nRestores your mp after combat.\n",
  ],
  [
    "mu",
    "Increases your elemental resistances.\nDeals elemental damage in combat.\n",
  ],
  ["mutant cactus bud", "Boosts meat drops based on Grimace Darkness.\n"],
  ["mutant fire ant", "Boosts item drops based on Grimace Darkness.\n"],
  ["oily woim", "Increases your combat initiative.\n"],
  ["purse rat", "Increases your monster level.\n"],
  [
    "red-nosed snapper",
    "Boosts item drops, especially underwater.\nDrops special items.\n",
  ],
  [
    "robortender",
    "Boosts your meat drops.\nDrops special items.\nHas varying abilities.\n",
  ],
  [
    "space jellyfish",
    "Increases your combat initiative.\nBoosts your item drops and stat gains (volleyball-like), especially underwater.\nDelevels enemies in combat.\nDrops special items.\n",
  ],
  [
    "steam-powered cheerleader",
    "Boosts item drops based on remaining steam.\nDelevels enemies in combat based on remaining steam.\nDoes something unusual during combat.\n",
  ],
  [
    "trick-or-treating tot",
    "Restores your hp and mp after combat.\nHas varying abilities.\n",
  ],
  [
    "xiblaxian holo-companion",
    "Increases your combat initiative.\nStaggers enemies in combat.\n",
  ],
  ["black cat", "Is adorable.\nGenerally messes with you.\n"],
  ["o.a.f.", "Is optimal.\nGenerally messes with you.\n"],
]);

export class Familiar extends Thing {
  #familiar: DolFamiliar;
  hatchling: Item | undefined;
  familiarEquipment: Item | undefined;

  static is(thing?: Thing | null): thing is Familiar {
    return !!thing && thing instanceof Familiar;
  }

  constructor(familiar: DolFamiliar) {
    super(familiar.id, familiar.name, familiar.image);
    this.#familiar = familiar;
    this.hatchling = familiar.larva
      ? new Item(familiar.larva, true)
      : undefined;
    this.familiarEquipment = familiar.equipment
      ? new Item(familiar.equipment, true)
      : undefined;
  }

  getModifiers(): Record<string, string> {
    return this.#familiar.modifiers?.modifiers ?? {};
  }

  private classify(): string {
    const hardcoded = HARD_CODED_FAMILIARS.get(this.name.toLowerCase());
    if (hardcoded) return hardcoded;

    const classifications: string[] = [];
    let categoriesUnassigned = [...this.#familiar.categories];

    for (const classification of FAMILIAR_CLASSIFCATIONS) {
      if (
        classification.combination.every((cat) =>
          categoriesUnassigned.includes(cat),
        )
      ) {
        categoriesUnassigned = categoriesUnassigned.filter(
          (cat) => !classification.combination.includes(cat),
        );
        classifications.push(classification.description);
      }
    }

    return classifications.join("\n");
  }

  async formatEquipmentDescription() {
    if (!this.familiarEquipment?.descid) return "";

    const { melting, singleEquip, blueText, effect } =
      await kolClient.getItemDescription(this.familiarEquipment.descid);

    const output: string[] = [];

    if (melting) output.push("Disappears at rollover");
    if (singleEquip) output.push("Single equip only.");
    if (blueText) output.push(blueText);
    if (effect) {
      const { blueText: effectBlueText } = await kolClient.getEffectDescription(
        effect.descid,
      );
      output.push(
        `Gives ${effect.duration} adventures of ${bold(hyperlink(cleanString(effect.name), toWikiLink(cleanString(effect.name))))}`,
        indent(effectBlueText),
      );
    }

    return output.join("\n");
  }

  @memoize()
  async getDescription(): Promise<string> {
    const description = [
      bold("Familiar"),
      this.classify(),
      "",
      `Attributes: ${this.#familiar.attributes?.toSorted().join(", ") ?? "None"}`,
      "",
    ];

    if (this.#familiar.larva) {
      description.push(
        `Hatchling: ${hyperlink(this.#familiar.larva.name ?? "unknown larva", toWikiLink(this.#familiar.larva.name || ""))}`,
      );
    }

    if (this.hatchling) {
      const hatchlingDescription = await this.hatchling.getDescription(false);
      description.push(
        ...hatchlingDescription
          .split("\n")
          .slice(2)
          .filter((l) => l.length > 0),
      );
    }

    description.push("");

    if (this.#familiar.equipment) {
      description.push(
        `Equipment: ${hyperlink(this.#familiar.equipment.name, toWikiLink(this.#familiar.equipment.name))}`,
      );
    }

    if (this.familiarEquipment) {
      description.push(indent(await this.formatEquipmentDescription()));
    }

    return description.join("\n");
  }
}
