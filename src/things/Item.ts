import { bold, hyperlink } from "discord.js";
import { MemoizeExpiring } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { cleanString, pluralize, titleCase, toWikiLink } from "../utils/index.js";
import { Familiar } from "./Familiar.js";
import { Thing } from "./Thing.js";

const OTHER_TYPES = [
  "potion",
  "reusable",
  "usable",
  "multiple",
  "combat",
  "combat reusable",
  "grow",
] as const;
type OtherType = (typeof OTHER_TYPES)[number];

const CONSUMABLE_TYPES = ["food", "booze", "spleen"] as const;
type ConsumableType = (typeof CONSUMABLE_TYPES)[number];

const EQUIPMENT_TYPES = [
  "weapon",
  "offhand",
  "container",
  "hat",
  "shirt",
  "pants",
  "accessory",
  "familiar",
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

export class Item extends Thing {
  readonly descId: number;
  readonly shortDescription: string;
  readonly types: string[];
  readonly quest: boolean;
  readonly gift: boolean;
  readonly tradeable: boolean;
  readonly discardable: boolean;
  readonly autosell: number;
  readonly pluralName: string;

  container?: Item;
  contents?: Item;
  zapGroup?: Item[];
  foldGroup?: Item[];

  _addlDescription = "";

  static is(thing?: Thing | null): thing is Item {
    return !!thing && thing instanceof Item;
  }

  static from(line: string, itemInfoForUse = new Map<string, string[]>()): Item {
    const parts = line.split(/\t/);
    if (parts.length < 7) throw "Invalid data";

    return new Item(
      parseInt(parts[0]),
      cleanString(parts[1]),
      parseInt(parts[2]),
      parts[3],
      parts[4].split(", "),
      parts[5].indexOf("q") >= 0,
      parts[5].indexOf("g") >= 0,
      parts[5].indexOf("t") >= 0,
      parts[5].indexOf("d") >= 0,
      parseInt(parts[6]),
      cleanString(parts[7]) || `${cleanString(parts[1])}s`,
      itemInfoForUse
    );
  }

  constructor(
    id: number,
    name: string,
    descId: number,
    imageUrl: string,
    types: string[],
    quest: boolean,
    gift: boolean,
    tradeable: boolean,
    discardable: boolean,
    autosell: number,
    pluralName: string,
    itemInfoForUse: Map<string, string[]>
  ) {
    super(id, name, imageUrl);
    this.descId = descId;
    this.types = types;
    this.quest = quest;
    this.gift = gift;
    this.tradeable = tradeable;
    this.discardable = discardable;
    this.autosell = autosell;
    this.pluralName = pluralName;
    this.shortDescription = this.getShortDescription(itemInfoForUse);
  }

  mapQuality(rawQuality: string): string {
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

  mapStat(rawStat: string): string {
    switch (rawStat) {
      case "Mys":
        return "Mysticality";
      case "Mox":
        return "Moxie";
      case "Mus":
        return "Muscle";
      default:
        return "???";
    }
  }

  describeAdventures(adventures: string, size: number, consumableUnit: string) {
    const usePlural = adventures !== "1";
    let description = `${adventures} adventure${usePlural ? "s" : ""}`;

    const average = this.getAverageFromRange(adventures);

    const extra: string[] = [];
    if (adventures.includes("-")) {
      extra.push(`Average ${pluralize(average, "adventure")}`);
    }

    if (size > 1) {
      extra.push(`${Number((average / size).toFixed(2))} per ${consumableUnit}`);
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

  getShortDescription(itemInfoForUse: Map<string, string[]>): string {
    const itemRules: string[] = [];
    if (this.quest) itemRules.push("Quest Item");
    if (this.gift) itemRules.push("Gift Item");

    const tradeability: string[] = [];
    if (!this.tradeable) tradeability.push("traded");
    if (!this.discardable) tradeability.push("discarded");

    if (tradeability.length > 0) itemRules.push(`Cannot be ${tradeability.join(" or ")}.`);

    const data = itemInfoForUse.get(this.name.toLowerCase()) || [];

    const description = [`(Item ${this.id})`];

    const consumableType = this.types.find((t): t is ConsumableType =>
      CONSUMABLE_TYPES.includes(t as ConsumableType)
    );
    if (consumableType) {
      const [consumableName, consumableUnit] = (() => {
        switch (consumableType) {
          case "food":
            return ["food", "fullness"];
          case "booze":
            return ["booze", "inebriety"];
          case "spleen":
            return ["spleen item", "spleen"];
        }
      })();

      const [, sizeString, level, quality, adventures] = data;
      const size = parseInt(sizeString);

      description.push(
        `${bold(`${this.mapQuality(quality)} ${consumableName}`)} (Size ${size}${
          level !== "1" ? `, requires level ${level}` : ""
        })`
      );

      if (adventures !== "0") {
        description.push(this.describeAdventures(adventures, size, consumableUnit));
      }

      return description.concat(itemRules).join("\n");
    }

    const equipmentType = this.types.find((t): t is EquipmentType =>
      EQUIPMENT_TYPES.includes(t as EquipmentType)
    );
    if (equipmentType) {
      const [, powerString, requirementString, subtype] = data;

      const power = parseInt(powerString);

      const requirement = (() => {
        if (!requirementString || requirementString === "none") return null;
        const parts = requirementString.split(": ");
        return `requires ${parts[1]} ${this.mapStat(parts[0])}`;
      })();

      const equipInfo: string[] = [];

      if (requirement) equipInfo.push(requirement);

      switch (equipmentType) {
        case "weapon": {
          const damage = power / 10;
          description.push(bold(subtype));

          equipInfo.unshift(`${Math.round(damage)}-${Math.round(damage * 2)} damage`);
          break;
        }
        case "offhand": {
          const shield = subtype === "shield";
          description.push(bold(`Offhand ${shield ? "Shield" : "Item"}`));

          equipInfo.unshift(`${power} power`);
          if (shield) equipInfo.push(`Damage Reduction: ${Number((power / 15 - 1).toFixed(2))}`);
          break;
        }
        case "familiar": {
          description.push(bold("Familiar Equipment"));
          break;
        }
        default: {
          const equipmentName =
            equipmentType === "container" ? "Back Item" : titleCase(equipmentType);
          description.push(bold(equipmentName));

          equipInfo.unshift(`${power} power`);
          break;
        }
      }

      description.push(equipInfo.join(", "));

      return description.concat(itemRules).join("\n");
    }

    const otherType = this.types.find((t): t is OtherType => OTHER_TYPES.includes(t as OtherType));

    if (otherType) {
      const alsoCombat = this.types.includes("combat");

      const title = (() => {
        switch (otherType) {
          case "potion":
            return "Potion";
          case "reusable":
            return "Reusable item";
          case "multiple":
          case "usable":
            return "Usable item";
          case "combat":
            return "Combat item";
          case "combat reusable":
            return "Reusable combat item";
          case "grow":
            return "Familiar hatchling";
          case undefined:
            return "Miscellaneous Item";
        }
      })();

      const typeDescription: string[] = [bold(title)];
      if (!otherType?.startsWith("combat") && alsoCombat)
        typeDescription.push("(also usable in combat)");

      description.push(typeDescription.join(" "));
      description.push(...itemRules);
      return description.join("\n");
    }

    return ["Miscellaneous Item"].concat(itemRules).join("\n");
  }

  addGrowingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Grows into: ${bold(
      hyperlink(familiar.name, toWikiLink(familiar.name))
    )}\n`;
  }

  addEquppingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Familiar: ${hyperlink(familiar.name, toWikiLink(familiar.name))}\n`;
  }

  async getMallPrice() {
    if (!this.tradeable) return "";

    const { mallPrice, limitedMallPrice, formattedMallPrice, formattedLimitedMallPrice } =
      await kolClient.getMallPrice(this.id);

    const url = `https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=${this.id}&timespan=1&noanim=0`;

    if (mallPrice) {
      let output = `Mall Price: ${hyperlink(`${formattedMallPrice} meat`, url)}`;
      if (limitedMallPrice && limitedMallPrice < mallPrice) {
        output += ` (or ${formattedLimitedMallPrice} meat limited per day)`;
      }
      return output;
    } else if (limitedMallPrice) {
      return `Mall Price: ${hyperlink(
        `${formattedLimitedMallPrice} meat (only available limited per day)`,
        url
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
      `${titleCase(groupType)}s into: ${turnsInto}${group.length > 8 ? " ...and more." : ""}`
    );

    const tradeables = (
      await Promise.all(
        group
          .filter((item) => item.tradeable)
          .map(async (item) => ({
            item: item,
            price: await kolClient.getMallPrice(item.id),
          }))
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
          `https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=${cheapest.id}&timespan=1&noanim=0`
        );

        output.push(`(Cheapest: ${wikiLink} @ ${mallHistoryLink})`);
      }
    }

    return output.join("\n");
  }

  @MemoizeExpiring(15 * 60 * 1000) // Ensure that prices are accurate to the last 15 minutes
  async getDescription(withAddl = true): Promise<string> {
    const description: string[] = [this.shortDescription];

    if (withAddl) description.push(this._addlDescription);

    const blueText = await kolClient.getItemDescription(this.descId);

    if (blueText) description.push(blueText);

    if (this.discardable && this.autosell > 0) {
      description.push(`Autosell value: ${this.autosell} meat.`);
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
        `Enclosed in: ${bold(hyperlink(this.container.name, toWikiLink(this.container.name)))}`,
        await this.container?.getDescription(false)
      );
    }

    if (withAddl && this.contents) {
      description.push(
        `Encloses: ${bold(hyperlink(this.contents.name, toWikiLink(this.contents.name)))}`
      );
      description.push(await this.contents?.getDescription(false));
    }

    return description.join("\n");
  }
}
