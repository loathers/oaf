import { bold, hyperlink } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { cleanString, indent, toWikiLink } from "../utils/index.js";
import { Item } from "./Item.js";
import { Thing } from "./Thing.js";

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

export class Familiar extends Thing {
  readonly types: string;
  readonly larva: string;
  readonly item: string;
  readonly attributes: string;
  hatchling: Item | undefined;
  equipment: Item | undefined;

  static from(line: string): Familiar {
    const parts = line.split(/\t/);
    if (parts.length < 10) throw "Invalid data";

    return new Familiar(
      parseInt(parts[0]),
      cleanString(parts[1]),
      parts[2],
      parts[3].split(","),
      cleanString(parts[4]),
      cleanString(parts[5]),
      parts[10] ? parts[10].replace(/,/g, ", ") : ""
    );
  }

  constructor(
    id: number,
    name: string,
    imageUrl: string,
    types: string[],
    larva: string,
    item: string,
    attributes: string
  ) {
    super(id, name, imageUrl);
    this.types = this.parseTypes(types);
    this.larva = larva;
    this.item = item;
    this.attributes = attributes;
  }

  private parseTypes(actionTypes: string[]): string {
    const hardcoded = HARD_CODED_FAMILIARS.get(this.name.toLowerCase());
    if (hardcoded) return hardcoded;

    const types: string[] = [];
    let typesToConsider = [...actionTypes] as FamiliarActionTypes[];

    // For each classification...
    for (const classification of FAMILIAR_CLASSIFCATIONS) {
      // ... if the set of types to consider wholly reflects this familiar classification...
      if (classification.combination.every((type) => typesToConsider.includes(type))) {
        // ... remove the types that are reflected by this classification from future consideration...
        typesToConsider = typesToConsider.filter(
          (type) => !classification.combination.includes(type)
        );
        // ... and add this classification to the list we use to describe this familair.
        types.push(classification.description);
      }
    }

    return types.join("\n");
  }

  @Memoize()
  async getDescription(): Promise<string> {
    const description = [
      bold("Familiar"),
      this.types,
      "",
      `Attributes: ${this.attributes || "None"}`,
      "",
    ];

    if (this.larva) {
      description.push(`Hatchling: ${hyperlink(this.larva, toWikiLink(this.larva))}`);
    }

    if (this.hatchling) {
      const hatchlingDescription = await this.hatchling.getDescription(false);
      description.push(
        // Skip the first two lines and remove double spaces
        ...hatchlingDescription
          .split("\n")
          .slice(2)
          .filter((l) => l.length > 0)
      );
    }

    description.push("");

    if (this.item) {
      description.push(`Equipment: ${hyperlink(this.item, toWikiLink(this.item))}`);
    }

    if (this.equipment) {
      const equipmentDescription = await kolClient.getItemDescription(this.equipment.descId);
      description.push(indent(equipmentDescription));
    }

    return description.join("\n");
  }
}
