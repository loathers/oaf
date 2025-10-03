import { ItemUse } from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { MemoizeExpiring } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { pluralize, titleCase, toWikiLink } from "../utils.js";
import { Familiar } from "./Familiar.js";
import { Thing } from "./Thing.js";

const OTHER_USES = [
  "POTION",
  "REUSABLE",
  "USABLE",
  "MULTIPLE",
  "COMBAT",
  "COMBAT_REUSABLE",
  "GROW",
] as const;
type OtherUse = (typeof OTHER_USES)[number];

const CONSUMABLE_TYPES = ["FOOD", "DRINK", "SPLEEN"] as const;
type ConsumableType = (typeof CONSUMABLE_TYPES)[number];

const EQUIPMENT_TYPES = [
  "WEAPON",
  "OFFHAND",
  "CONTAINER",
  "HAT",
  "SHIRT",
  "PANTS",
  "ACCESSORY",
  "FAMILIAR",
] as const;
type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export type ItemData = {
  id: number;
  name: string;
  descId: number;
  imageUrl: string;
  types: string[];
  quest: boolean;
  gift: boolean;
  tradeable: boolean;
  discardable: boolean;
  autosell: number;
  pluralName: string;
};

interface TItem {
  id: number;
  name: string;
  image: string;
  descid?: number | null;
  quest?: boolean;
  autosell?: number;
  tradeable?: boolean;
  discardable?: boolean;
  gift?: boolean;
  uses?: (ItemUse | null)[];
  consumableById?: {
    adventureRange: string;
    adventures: number;
    stomach: number;
    liver: number;
    spleen: number;
    levelRequirement: number;
    quality: string | null;
  } | null;
  equipmentById?: {
    moxRequirement: number;
    mysRequirement: number;
    musRequirement: number;
    power: number;
    type: string | null;
  } | null;
}

export class Item extends Thing {
  readonly item: TItem;

  container?: Item;
  contents?: Item;
  zapGroup?: Item[];
  foldGroup?: Item[];

  _addlDescription = "";

  static is(thing?: Thing | null): thing is Item {
    return !!thing && thing instanceof Item;
  }

  constructor(item: TItem) {
    super(item.id, item.name, item.image);
    this.item = item;
  }

  get descid() {
    return this.item.descid;
  }

  mapQuality(rawQuality: string | null): string {
    switch (rawQuality) {
      case "crappy":
        return "Crappy";
      case "decent":
        return "Decent";
      case "good":
        return "Good";
      case "awesome":
        return "Awesome";
      case "EPIC":
        return "EPIC";
      default:
        return "????";
    }
  }

  describeAdventures(
    average: number,
    adventureRange: string,
    size: number,
    consumableUnit: string,
  ) {
    const usePlural = adventureRange !== "1";
    let description = `${adventureRange} adventure${usePlural ? "s" : ""}`;

    const extra: string[] = [];
    if (adventureRange.includes("-")) {
      extra.push(`Average ${pluralize(average, "adventure")}`);
    }

    if (size > 1) {
      extra.push(
        `${Number((average / size).toFixed(2))} per ${consumableUnit}`,
      );
    }

    if (extra.length > 0) {
      description += ` (${extra.join(", ")})`;
    }

    return description;
  }

  getAverageFromRange(adventures: string) {
    const advRange = adventures.split("-");
    return advRange.length > 1
      ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
      : parseInt(adventures);
  }

  getConsumableDescription() {
    const consumableType = this.item.uses?.find((t): t is ConsumableType =>
      CONSUMABLE_TYPES.includes(t as ConsumableType),
    );
    if (!consumableType) return null;

    const consumable = this.item.consumableById;
    if (!consumable) return null;

    const description = [];
    const [consumableName, consumableUnit, organ] = (() => {
      switch (consumableType) {
        case "FOOD":
          return ["food", "fullness", "stomach"] as const;
        case "DRINK":
          return ["booze", "inebriety", "liver"] as const;
        case "SPLEEN":
          return ["spleen item", "spleen", "spleen"] as const;
      }
    })();

    const size = consumable[organ];
    const { levelRequirement, adventures, adventureRange, quality } =
      consumable;

    const name = [];
    if (consumableType !== "SPLEEN") name.push(this.mapQuality(quality));
    name.push(consumableName);

    const requirements = [`Size ${size}`];
    if (levelRequirement !== 1)
      requirements.push(`requires level ${levelRequirement}`);

    const stats = `${bold(name.join(" "))} (${requirements.join(", ")})`;
    description.push(stats);

    if (adventures !== 0) {
      description.push(
        this.describeAdventures(
          adventures,
          adventureRange,
          size,
          consumableUnit,
        ),
      );
    }

    return description;
  }

  getEquipmentDescription() {
    const equipmentType = this.item.uses?.find((t): t is EquipmentType =>
      EQUIPMENT_TYPES.includes(t as EquipmentType),
    );
    if (!equipmentType) return null;

    const equipment = this.item.equipmentById;
    if (!equipment) return null;

    const description = [];
    const { power, moxRequirement, mysRequirement, musRequirement, type } =
      equipment;

    const requirement = (() => {
      if (moxRequirement > 0) return `requires ${moxRequirement} moxie`;
      if (mysRequirement > 0) return `requires ${mysRequirement} mysticality`;
      if (musRequirement > 0) return `requires ${musRequirement} muscle`;
      return null;
    })();

    const equipInfo: string[] = [];

    if (requirement) equipInfo.push(requirement);

    switch (equipmentType) {
      case "WEAPON": {
        const damage = power / 10;
        description.push(bold(type!));

        equipInfo.unshift(
          `${Math.round(damage)}-${Math.round(damage * 2)} damage`,
        );
        break;
      }
      case "OFFHAND": {
        const shield = type === "shield";
        description.push(bold(`Offhand ${shield ? "Shield" : "Item"}`));

        equipInfo.unshift(`${power} power`);
        if (shield)
          equipInfo.push(
            `Damage Reduction: ${Number((power / 15 - 1).toFixed(2))}`,
          );
        break;
      }
      case "FAMILIAR": {
        description.push(bold("Familiar Equipment"));
        break;
      }
      default: {
        const equipmentName =
          equipmentType === "CONTAINER"
            ? "Back Item"
            : titleCase(equipmentType);
        description.push(bold(equipmentName));

        equipInfo.unshift(`${power} power`);
        break;
      }
    }

    description.push(equipInfo.join(", "));

    return description;
  }

  getOtherDescription() {
    const otherUses = this.item.uses?.find((t): t is OtherUse =>
      OTHER_USES.includes(t as OtherUse),
    );

    if (!otherUses) return null;

    const alsoCombat = this.item.uses?.includes("COMBAT");

    const title = (() => {
      switch (otherUses) {
        case "POTION":
          return "Potion";
        case "REUSABLE":
          return "Reusable item";
        case "MULTIPLE":
        case "USABLE":
          return "Usable item";
        case "COMBAT":
          return "Combat item";
        case "COMBAT_REUSABLE":
          return "Reusable combat item";
        case "GROW":
          return "Familiar hatchling";
      }
    })();

    const typeDescription: string[] = [bold(title)];

    if (!otherUses.startsWith("combat") && alsoCombat)
      typeDescription.push("(also usable in combat)");

    return [typeDescription.join(" ")];
  }

  getShortDescription(): string {
    const itemRules: string[] = [];
    if (this.item.quest) itemRules.push("Quest Item");
    if (this.item.gift) itemRules.push("Gift Item");

    const tradeability: string[] = [];
    if (!this.item.tradeable) tradeability.push("traded");
    if (!this.item.discardable) tradeability.push("discarded");

    if (tradeability.length > 0)
      itemRules.push(`Cannot be ${tradeability.join(" or ")}.`);

    const description = [`(Item ${this.id})`];

    return [
      ...description,
      ...(this.getConsumableDescription() ||
        this.getEquipmentDescription() ||
        this.getOtherDescription() || ["Miscellaneous Item"]),
      ...itemRules,
    ].join("\n");
  }

  addGrowingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Grows into: ${bold(
      hyperlink(familiar.name, toWikiLink(familiar.name)),
    )}\n`;
  }

  addEquppingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Familiar: ${hyperlink(
      familiar.name,
      toWikiLink(familiar.name),
    )}\n`;
  }

  async getMallPrice() {
    if (!this.item.tradeable) return "";

    const {
      mallPrice,
      limitedMallPrice,
      formattedMallPrice,
      formattedLimitedMallPrice,
    } = await kolClient.getMallPrice(this.id);

    const url = `https://api.aventuristo.net/itemgraph?itemid=${this.id}&timespan=1&noanim=0`;

    if (kolClient.isRollover()) {
      return `Mall Price: ${hyperlink("Can't check, rollover", url)}`;
    } else if (mallPrice) {
      let output = `Mall Price: ${hyperlink(
        `${formattedMallPrice} meat`,
        url,
      )}`;
      if (limitedMallPrice && limitedMallPrice < mallPrice) {
        output += ` (or ${formattedLimitedMallPrice} meat limited per day)`;
      }
      return output;
    } else if (limitedMallPrice) {
      return `Mall Price: ${hyperlink(
        `${formattedLimitedMallPrice} meat (only available limited per day)`,
        url,
      )}`;
    } else {
      return "Mall extinct.";
    }
  }

  async formatGroup(group: Item[], groupType: string) {
    const output: string[] = [];

    const turnsInto = group
      .filter((item) => item.name !== this.name)
      .slice(0, 7)
      .map((item) => item.name)
      .map((name) => hyperlink(name, toWikiLink(name)))
      .join(", ");

    output.push(
      `${titleCase(groupType)}s into: ${turnsInto}${
        group.length > 8 ? " ...and more." : ""
      }`,
    );

    const tradeables = (
      await Promise.all(
        group
          .filter((item) => item.item.tradeable)
          .map(async (item) => ({
            item: item,
            price: await kolClient.getMallPrice(item.id),
          })),
      )
    )
      .filter((item) => item.price.minPrice)
      .sort((a, b) => a.price.minPrice! - b.price.minPrice!);

    if (tradeables.length > 0) {
      if (tradeables[0].item.id === this.id) {
        output.push(`(This item is the cheapest in its ${groupType} group)`);
      } else {
        const cheapest = tradeables[0].item;
        const wikiLink = hyperlink(cheapest.name, toWikiLink(cheapest.name));
        const mallHistoryLink = hyperlink(
          `${tradeables[0].price.formattedMinPrice} meat`,
          `https://api.aventuristo.net/itemgraph?itemid=${cheapest.id}&timespan=1&noanim=0`,
        );

        output.push(`(Cheapest: ${wikiLink} @ ${mallHistoryLink})`);
      }
    }

    return output.join("\n");
  }

  @MemoizeExpiring(15 * 60 * 1000) // Ensure that prices are accurate to the last 15 minutes
  async getDescription(withAddl = true): Promise<string> {
    const description: string[] = [this.getShortDescription()];

    if (withAddl) description.push(this._addlDescription);

    const { blueText } = await kolClient.getItemDescription(this.item.descid!);

    if (blueText) description.push(blueText);

    if (this.item.discardable && (this.item.autosell ?? 0) > 0) {
      description.push(`Autosell value: ${this.item.autosell} meat.`);
    }

    const price = await this.getMallPrice();
    if (price) {
      description.push(price);
    }

    if (this.zapGroup) {
      description.push(await this.formatGroup(this.zapGroup, "zap"));
    }

    if (this.foldGroup) {
      description.push(await this.formatGroup(this.foldGroup, "fold"));
    }

    if (withAddl && this.container) {
      description.push(
        `Enclosed in: ${bold(
          hyperlink(this.container.name, toWikiLink(this.container.name)),
        )}`,
        await this.container?.getDescription(false),
      );
    }

    if (withAddl && this.contents) {
      description.push(
        `Encloses: ${bold(
          hyperlink(this.contents.name, toWikiLink(this.contents.name)),
        )}`,
      );
      description.push(await this.contents?.getDescription(false));
    }

    return description.join("\n");
  }
}
