import {
  ConsumableQuality,
  type Item as DolItem,
  ItemUse,
} from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { toWikiLink } from "kol.js";

import { getMallPrice, kolClient } from "../clients/kol.js";
import { pluralize, titleCase } from "../utils.js";
import { memoizeExpiring } from "../utils/memoize.js";
import { Familiar } from "./Familiar.js";
import { Thing } from "./Thing.js";
import packages from "./iotmPackages.json" with { type: "json" };

const reversedPackages = new Map([
  ["grinning ghostling", "box o' ghosts"],
  ["gregarious ghostling", "box o' ghosts"],
  ["greedy ghostling", "box o' ghosts"],
  ...[...(Object.keys(packages) as (keyof typeof packages)[])].map(
    (key) => [packages[key] || "", key] as const,
  ),
]);

const CONSUMABLE_USES = [ItemUse.Food, ItemUse.Drink, ItemUse.Spleen] as const;
type ConsumableUse = (typeof CONSUMABLE_USES)[number];

const EQUIPMENT_USES = [
  ItemUse.Weapon,
  ItemUse.Offhand,
  ItemUse.Container,
  ItemUse.Hat,
  ItemUse.Shirt,
  ItemUse.Pants,
  ItemUse.Accessory,
  ItemUse.Familiar,
] as const;
type EquipmentUse = (typeof EQUIPMENT_USES)[number];

const OTHER_USES = [
  ItemUse.Potion,
  ItemUse.Reusable,
  ItemUse.Usable,
  ItemUse.Multiple,
  ItemUse.Combat,
  ItemUse.CombatReusable,
  ItemUse.Grow,
] as const;
type OtherUse = (typeof OTHER_USES)[number];

export class Item extends Thing {
  #item: DolItem;

  container?: string;
  contents?: string;
  zapGroup: Item[];
  foldGroup: Item[];

  _addlDescription = "";

  static is(thing?: Thing | null): thing is Item {
    return !!thing && thing instanceof Item;
  }

  constructor(item: DolItem, shallow = false) {
    super(item.id, item.name, item.image);
    this.#item = item;

    if (item.name in packages) {
      this.contents = packages[item.name as keyof typeof packages];
    }
    if (item.name in reversedPackages) {
      this.container = reversedPackages.get(item.name)!;
    }

    if (shallow) {
      this.foldGroup = [];
      this.zapGroup = [];
    } else {
      this.foldGroup = item.foldGroups
        .getItems()
        .flatMap((fg) => fg.items.getItems().map((i) => new Item(i, true)))
        .filter((i) => i.id !== item.id);
      this.zapGroup = item.zapGroups
        .getItems()
        .flatMap((zg) => zg.items.getItems().map((i) => new Item(i, true)))
        .filter((i) => i.id !== item.id);
    }
  }

  get descid() {
    return this.#item.descid;
  }

  get tradeable() {
    return this.#item.tradeable;
  }

  get gift() {
    return this.#item.gift;
  }

  get plural() {
    return this.#item.plural || `${this.name}s`;
  }

  get autosell() {
    return this.#item.autosell ?? 0;
  }

  mapQuality(rawQuality: ConsumableQuality | null | undefined): string {
    if (
      !rawQuality ||
      rawQuality === ConsumableQuality.Changing ||
      rawQuality === ConsumableQuality.None
    ) {
      return "???";
    }
    const quality = rawQuality
      .split("_")
      .map((w) => (w === "EPIC" ? w : w.toLowerCase()))
      .join(" ");
    return quality.charAt(0).toUpperCase() + quality.slice(1);
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
    const consumableUse = this.#item.uses.find((u): u is ConsumableUse =>
      CONSUMABLE_USES.includes(u as ConsumableUse),
    );
    if (!consumableUse) return null;

    const consumable = this.#item.consumable;
    if (!consumable) return null;

    const description = [];
    const [consumableName, consumableUnit, organ] = (() => {
      switch (consumableUse) {
        case ItemUse.Food:
          return ["food", "fullness", "stomach"] as const;
        case ItemUse.Drink:
          return ["booze", "inebriety", "liver"] as const;
        case ItemUse.Spleen:
          return ["spleen item", "spleen", "spleen"] as const;
        default:
          return [null, null, null] as const;
      }
    })();

    if (!consumableName || !consumableUnit || !organ) return null;

    const size = consumable[organ];
    const { levelRequirement, adventures, adventureRange, quality } =
      consumable;

    const name = [];
    if (consumableUse !== ItemUse.Spleen) name.push(this.mapQuality(quality));
    name.push(consumableName);

    const requirements = [`Size ${size}`];
    if (levelRequirement !== 1)
      requirements.push(`requires level ${levelRequirement}`);

    description.push(`${bold(name.join(" "))} (${requirements.join(", ")})`);

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
    const equipmentUse = this.#item.uses.find((u): u is EquipmentUse =>
      EQUIPMENT_USES.includes(u as EquipmentUse),
    );
    if (!equipmentUse) return null;

    const equipment = this.#item.equipment;
    if (!equipment) return null;

    const description = [];
    const { power, moxRequirement, mysRequirement, musRequirement, type } =
      equipment;

    const requirement = (() => {
      if (moxRequirement > 0) return `requires ${moxRequirement} Moxie`;
      if (mysRequirement > 0) return `requires ${mysRequirement} Mysticality`;
      if (musRequirement > 0) return `requires ${musRequirement} Muscle`;
      return null;
    })();

    const equipInfo: string[] = [];
    if (requirement) equipInfo.push(requirement);

    switch (equipmentUse) {
      case ItemUse.Weapon: {
        const damage = power / 10;
        description.push(bold(type!));
        equipInfo.unshift(
          `${Math.round(damage)}-${Math.round(damage * 2)} damage`,
        );
        break;
      }
      case ItemUse.Offhand: {
        const shield = type === "shield";
        description.push(bold(`Offhand ${shield ? "Shield" : "Item"}`));
        equipInfo.unshift(`${power} power`);
        if (shield)
          equipInfo.push(
            `Damage Reduction: ${Number((power / 15 - 1).toFixed(2))}`,
          );
        break;
      }
      case ItemUse.Familiar: {
        description.push(bold("Familiar Equipment"));
        break;
      }
      default: {
        const equipmentName =
          equipmentUse === ItemUse.Container
            ? "Back Item"
            : titleCase(equipmentUse);
        description.push(bold(equipmentName));
        equipInfo.unshift(`${power} power`);
        break;
      }
    }

    description.push(equipInfo.join(", "));
    return description;
  }

  getOtherDescription() {
    const otherUse = this.#item.uses.find((u): u is OtherUse =>
      OTHER_USES.includes(u as OtherUse),
    );
    if (!otherUse) return null;

    const alsoCombat = this.#item.uses.includes(ItemUse.Combat);

    const title = (() => {
      switch (otherUse) {
        case ItemUse.Potion:
          return "Potion";
        case ItemUse.Reusable:
          return "Reusable item";
        case ItemUse.Multiple:
        case ItemUse.Usable:
          return "Usable item";
        case ItemUse.Combat:
          return "Combat item";
        case ItemUse.CombatReusable:
          return "Reusable combat item";
        case ItemUse.Grow:
          return "Familiar hatchling";
        default:
          return "Unknown type";
      }
    })();

    const typeDescription: string[] = [bold(title)];
    if (!otherUse.startsWith("combat") && alsoCombat)
      typeDescription.push("(also usable in combat)");

    return [typeDescription.join(" ")];
  }

  getShortDescription(): string {
    const itemRules: string[] = [];
    if (this.#item.quest) itemRules.push("Quest Item");
    if (this.#item.gift) itemRules.push("Gift Item");

    const tradeability: string[] = [];
    if (!this.#item.tradeable) tradeability.push("traded");
    if (!this.#item.discardable) tradeability.push("discarded");
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
    this._addlDescription = `Grows into: ${bold(hyperlink(familiar.name, toWikiLink(familiar.name)))}\n`;
  }

  addEquppingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Familiar: ${hyperlink(familiar.name, toWikiLink(familiar.name))}\n`;
  }

  getPriceLink(text: string): string {
    return hyperlink(text, `https://pricegun.loathers.net/item/${this.id}`);
  }

  async getMallPrice() {
    if (!this.#item.tradeable) return "";

    const {
      mallPrice,
      limitedMallPrice,
      formattedMallPrice,
      formattedLimitedMallPrice,
    } = await getMallPrice(this.id);

    if (kolClient.isRollover()) {
      return `Mall Price: ${this.getPriceLink("Can't check, rollover")}`;
    } else if (mallPrice) {
      let output = `Mall Price: ${this.getPriceLink(`${formattedMallPrice} Meat`)}`;
      if (limitedMallPrice && limitedMallPrice < mallPrice) {
        output += ` (or ${formattedLimitedMallPrice} Meat limited per day)`;
      }
      return output;
    } else if (limitedMallPrice) {
      return `Mall Price: ${this.getPriceLink(`${formattedLimitedMallPrice} Meat (only available limited per day)`)}`;
    } else {
      return "Mall extinct.";
    }
  }

  async formatGroup(group: Item[], groupType: string) {
    if (group.length === 0) return null;

    const output: string[] = [];
    const turnsInto = group
      .filter((item) => item.name !== this.name)
      .slice(0, 7)
      .map((item) => hyperlink(item.name, toWikiLink(item.name)))
      .join(", ");

    output.push(
      `${titleCase(groupType)}s into: ${turnsInto}${group.length > 8 ? " ...and more." : ""}`,
    );

    const tradeables = (
      await Promise.all(
        group
          .filter((item) => item.tradeable)
          .map(async (item) => ({
            item,
            price: await getMallPrice(item.id),
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
        output.push(
          `(Cheapest: ${hyperlink(cheapest.name, toWikiLink(cheapest.name))} @ ${cheapest.getPriceLink(`${tradeables[0].price.formattedMinPrice} Meat`)})`,
        );
      }
    }

    return output.join("\n");
  }

  @memoizeExpiring(15 * 60 * 1000)
  async getDescription(withAddl = true): Promise<string> {
    const description: (string | null)[] = [this.getShortDescription()];

    if (withAddl) description.push(this._addlDescription);

    const { blueText } = await kolClient.getItemDescription(this.#item.descid!);
    if (blueText) description.push(blueText);

    if (this.#item.discardable && (this.#item.autosell ?? 0) > 0) {
      description.push(`Autosell value: ${this.#item.autosell} Meat.`);
    }

    const price = await this.getMallPrice();
    if (price) description.push(price);

    description.push(await this.formatGroup(this.zapGroup, "zap"));
    description.push(await this.formatGroup(this.foldGroup, "fold"));

    if (withAddl && this.container) {
      description.push(
        `Enclosed in: ${bold(hyperlink(this.container, toWikiLink(this.container)))}`,
      );
    }
    if (withAddl && this.contents) {
      description.push(
        `Encloses: ${bold(hyperlink(this.contents, toWikiLink(this.contents)))}`,
      );
    }

    return description.filter((line) => line !== null).join("\n");
  }
}
