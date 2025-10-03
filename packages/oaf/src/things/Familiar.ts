import { type FamiliarCategory } from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { cleanString, indent, toWikiLink } from "../utils.js";
import { Item } from "./Item.js";
import { Thing } from "./Thing.js";

type FamiliarClassification = {
  combination: FamiliarCategory[];
  description: string;
};

export const FAMILIAR_CLASSIFCATIONS: FamiliarClassification[] = [
  {
    combination: ["COMBAT0", "MEAT1", "DELEVEL1", "HP0", "MP0"],
    description: "Cocoabo-like.",
  },
  {
    combination: ["COMBAT0", "COMBAT1", "MP0", "HP0"],
    description:
      "Deals elemental and physical damage to restore your hp and mp in combat.",
  },
  {
    combination: ["COMBAT0", "COMBAT1", "MP0"],
    description:
      "Deals elemental and physical damage to restore your mp in combat.",
  },
  {
    combination: ["COMBAT0", "COMBAT1", "HP0"],
    description: "Deals elemental and physical damage to heal you in combat.",
  },
  {
    combination: ["COMBAT0", "MP0", "HP0"],
    description: "Deals physical damage to restore your hp and mp in combat.",
  },
  {
    combination: ["COMBAT0", "MP0"],
    description: "Deals physical damage to restore your mp in combat.",
  },
  {
    combination: ["COMBAT0", "HP0"],
    description: "Deals physical damage to heal you in combat.",
  },
  {
    combination: ["COMBAT1", "MP0", "HP0"],
    description: "Deals elemental damage to restore your hp and mp in combat.",
  },
  {
    combination: ["COMBAT1", "MP0"],
    description: "Deals elemental damage to restore your mp in combat.",
  },
  {
    combination: ["COMBAT1", "HP0"],
    description: "Deals elemental damage to heal you in combat.",
  },
  {
    combination: ["COMBAT0", "COMBAT1"],
    description: "Deals physical and elemental damage in combat.",
  },
  {
    combination: ["COMBAT0"],
    description: "Deals physical damage in combat.",
  },
  {
    combination: ["COMBAT1"],
    description: "Deals elemental damage in combat.",
  },
  {
    combination: ["ITEM0", "MEAT0", "STAT0"],
    description:
      "Boosts item drops, meat drops and stat gains (volleyball-like).",
  },
  {
    combination: ["MEAT0", "STAT0"],
    description: "Boosts meat drops and stat gains (volleyball-like).",
  },
  {
    combination: ["ITEM0", "STAT0"],
    description: "Boosts item drops and stat gains (volleyball-like).",
  },
  {
    combination: ["ITEM0", "MEAT0", "STAT1"],
    description:
      "Boosts item drops, meat drops and stat gains (sombrero-like).",
  },
  {
    combination: ["MEAT0", "STAT1"],
    description: "Boosts meat drops and stat gains (sombrero-like).",
  },
  {
    combination: ["ITEM0", "STAT1"],
    description: "Boosts item drops and stat gains (sombrero-like).",
  },
  {
    combination: ["STAT0"],
    description: "Boosts stat gains (volleyball-like).",
  },
  {
    combination: ["STAT1"],
    description: "Boosts stat gains (sombrero-like).",
  },
  {
    combination: ["MEAT0", "ITEM0"],
    description: "Boosts item and meat drops.",
  },
  {
    combination: ["ITEM0"],
    description: "Boosts item drops.",
  },
  {
    combination: ["MEAT0"],
    description: "Boosts meat drops.",
  },
  {
    combination: ["BLOCK"],
    description: "Staggers enemies in combat.",
  },
  {
    combination: ["DELEVEL0"],
    description: "Delevels enemies at the start of combat (barrrnacle-like).",
  },
  {
    combination: ["DELEVEL1"],
    description: "Delevels enemies during combat (ghost pickle-like).",
  },
  {
    combination: ["HP0", "MP0"],
    description: "Restores your hp and mp during combat.",
  },
  {
    combination: ["HP0"],
    description: "Heals you during combat.",
  },
  {
    combination: ["MP0"],
    description: "Restores your mp during combat.",
  },
  {
    combination: ["MEAT1"],
    description: "Drops meat during combat.",
  },
  {
    combination: ["STAT2"],
    description: "Grants stats during combat.",
  },
  {
    combination: ["OTHER0"],
    description: "Does something unusual during combat.",
  },
  {
    combination: ["HP1", "MP1"],
    description: "Restores your hp and mp after combat.",
  },
  {
    combination: ["HP1"],
    description: "Heals you after combat.",
  },
  {
    combination: ["MP1"],
    description: "Restores mp after combat.",
  },
  {
    combination: ["STAT3"],
    description: "Grants stats after combat.",
  },
  {
    combination: ["OTHER1"],
    description: "Does something unusual after combat.",
  },
  {
    combination: ["PASSIVE"],
    description: "Grants a passive benefit.",
  },
  {
    combination: ["DROP"],
    description: "Drops special items.",
  },
  {
    combination: ["VARIABLE"],
    description: "Has varying abilities.",
  },
  {
    combination: ["UNDERWATER"],
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
  ["peppermint rhino", "Boosts item drops, especially candy drops.\n"],
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

interface TFamiliar {
  id: number;
  name: string;
  image: string;

  familiarModifierByFamiliar: {
    modifiers: Record<string, string>;
  } | null;
  itemByLarva: {
    id: number;
    name: string;
    image: string;
  } | null;
  itemByEquipment: {
    id: number;
    name: string;
    image: string;
  } | null;
  categories: (FamiliarCategory | null)[] | null;
  attributes: (string | null)[];
}

export class Familiar extends Thing {
  private familiar: TFamiliar;
  hatchling: Item | undefined;
  equipment: Item | undefined;

  constructor(familiar: TFamiliar) {
    super(familiar.id, familiar.name, familiar.image);
    this.familiar = familiar;
    this.hatchling = familiar.itemByLarva
      ? new Item(familiar.itemByLarva)
      : undefined;
    this.equipment = familiar.itemByEquipment
      ? new Item(familiar.itemByEquipment)
      : undefined;
  }

  getModifiers(): Record<string, string> {
    return this.familiar.familiarModifierByFamiliar?.modifiers ?? {};
  }

  private classify(): string {
    const hardcoded = HARD_CODED_FAMILIARS.get(this.name.toLowerCase());
    if (hardcoded) return hardcoded;

    const classifications: string[] = [];
    let categoriesUnassigned = [
      ...(this.familiar.categories?.filter((c) => c !== null) ?? []),
    ];

    // For each classification...
    for (const classification of FAMILIAR_CLASSIFCATIONS) {
      // ... if the set of types to consider wholly reflects this familiar classification...
      if (
        classification.combination.every((cat) =>
          categoriesUnassigned.includes(cat),
        )
      ) {
        // ... remove the types that are reflected by this classification from future consideration...
        categoriesUnassigned = categoriesUnassigned.filter(
          (cat) => !classification.combination.includes(cat),
        );
        // ... and add this classification to the list we use to describe this familair.
        classifications.push(classification.description);
      }
    }

    return classifications.join("\n");
  }

  async formatEquipmentDescription() {
    if (!this.equipment?.descid) return "";

    const { melting, singleEquip, blueText, effect } =
      await kolClient.getItemDescription(this.equipment.descid);

    const output: string[] = [];

    if (melting) output.push("Disappears at rollover");
    if (singleEquip) output.push("Single equip only.");
    if (blueText) output.push(blueText);
    if (effect) {
      const { blueText: effectBlueText } = await kolClient.getEffectDescription(
        effect.descid,
      );
      output.push(
        `Gives ${effect.duration} adventures of ${bold(
          hyperlink(
            cleanString(effect.name),
            toWikiLink(cleanString(effect.name)),
          ),
        )}`,
        indent(effectBlueText),
      );
    }

    return output.join("\n");
  }

  @Memoize()
  async getDescription(): Promise<string> {
    const description = [
      bold("Familiar"),
      this.classify(),
      "",
      `Attributes: ${this.familiar.attributes || "None"}`,
      "",
    ];

    if (this.familiar.itemByLarva) {
      description.push(
        `Hatchling: ${hyperlink(this.familiar.itemByLarva.name ?? "unknown larva", toWikiLink(this.familiar.itemByLarva.name || ""))}`,
      );
    }

    if (this.hatchling) {
      const hatchlingDescription = await this.hatchling.getDescription(false);
      description.push(
        // Skip the first two lines and remove double spaces
        ...hatchlingDescription
          .split("\n")
          .slice(2)
          .filter((l) => l.length > 0),
      );
    }

    description.push("");

    if (this.familiar.itemByEquipment) {
      description.push(
        `Equipment: ${hyperlink(this.familiar.itemByEquipment.name, toWikiLink(this.familiar.itemByEquipment.name))}`,
      );
    }

    if (this.equipment) {
      description.push(indent(await this.formatEquipmentDescription()));
    }

    return description.join("\n");
  }
}
