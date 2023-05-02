import { EmbedBuilder, bold, hyperlink } from "discord.js";

import { kolClient } from "../clients/kol";
import { cleanString, pluralize, titleCase, toWikiLink } from "../utils";
import { Familiar } from "./Familiar";
import { Thing } from "./Thing";

export const isItem = (item?: Thing | null): item is Item => !!item && item instanceof Item;

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

export class Item implements Thing {
  _item: ItemData;
  _name: string;
  _shortDescription: string = "";
  _addlDescription: string = "";
  _fullDescription: string = "";
  _craftSting: string = "";
  _container: Item | undefined;
  _contents: Item | undefined;
  _zapGroup: Item[] | undefined;
  _foldGroup: Item[] | undefined;

  constructor(data: string, itemMap: Map<string, string[]>) {
    this._item = this.parseItemData(data);
    this._name = this._item.name.toLowerCase();
    this._shortDescription = this.buildShortDescription(itemMap);
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

  pluralizeAdventures(range: string) {
    const usePlural = range !== "1";
    return `${range} adventure${usePlural ? "s" : ""}`;
  }

  buildShortDescription(itemMap: Map<string, string[]>): string {
    let tradeability_section = "";
    if (this._item.quest) tradeability_section += "Quest Item\n";
    else if (this._item.gift) tradeability_section += "Gift Item\n";
    if (!this._item.tradeable) {
      if (this._item.discardable) tradeability_section += "Cannot be traded.\n";
      else tradeability_section += "Cannot be traded or discarded.\n";
    } else if (!this._item.discardable) tradeability_section += "Cannot be discarded.\n";

    const data = itemMap.get(this._name) || [];
    let desc = `(Item ${this._item.id})\n`;

    if (this._item.types.includes("food")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      desc += `${bold(`${this.mapQuality(data[3])} food`)} (Size ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${this.pluralizeAdventures(data[4])}`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${advRange.length > 1 ? `Average ${pluralize(average, "adventure")}` : ""}`;
          desc += `${
            size > 1
              ? `${advRange.length > 1 ? ", " : ""}${Number(
                  (average / size).toFixed(2)
                )} per fullness`
              : ""
          })`;
        }
      }
      desc += `\n${tradeability_section}\n`;
      return desc;
    }
    if (this._item.types.includes("drink")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      desc += `${bold(`${this.mapQuality(data[3])} booze`)} (Potency ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${this.pluralizeAdventures(data[4])}`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${advRange.length > 1 ? `Average ${pluralize(average, "adventure")}` : ""}`;
          desc += `${
            size > 1
              ? `${advRange.length > 1 ? ", " : ""}${Number(
                  (average / size).toFixed(2)
                )} per inebriety`
              : ""
          })`;
        }
      }
      desc += `\n${tradeability_section}\n`;
      return desc;
    }
    if (this._item.types.includes("spleen")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      desc += `${bold(`${this.mapQuality(data[3])} spleen item`)} (Toxicity ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${this.pluralizeAdventures(data[4])}`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${advRange.length > 1 ? `Average ${pluralize(average, "adventure")}` : ""}`;
          desc += `${
            size > 1
              ? `${advRange.length > 1 ? ", " : ""}${Number(
                  (average / size).toFixed(2)
                )} per spleen`
              : ""
          })`;
        }
      }
      desc += `\n${tradeability_section}\n`;
      return desc;
    }
    if (this._item.types.includes("weapon")) {
      const requirement = (data[2] || ": 0").split(": ");
      const damage = parseInt(data[1]) / 10;
      let equipString = `${bold(data[3])}\n`;
      equipString += `${Math.round(damage)}-${Math.round(damage * 2)} damage${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      }\n`;
      equipString += `${tradeability_section}\n`;
      return equipString;
    }
    if (this._item.types.includes("offhand")) {
      const requirement = (data[2] || ": 0").split(": ");
      const isShield = data[3] === "shield";
      let equipString = bold(`Offhand ${isShield ? "Shield" : "Item"}`);
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n`;
      if (isShield) equipString += `Damage Reduction: ${parseInt(data[1]) / 15 - 1}\n`;
      equipString += `${tradeability_section}\n`;
      return equipString;
    }
    if (this._item.types.includes("container")) {
      const requirement = (data[2] || ": 0").split(": ");
      let equipString = bold(`Back Item`);
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n`;
      equipString += `${tradeability_section}\n`;
      return equipString;
    }
    if (this._item.types.includes("familiar")) {
      return `${bold("Familiar Equipment")}\n`;
    }
    //This is hideous. but hey.
    let equipmentType = "";
    for (equipmentType of ["hat", "shirt", "pants", "accessory", ""]) {
      if (this._item.types.includes(equipmentType)) break;
    }
    if (equipmentType) {
      const requirement = (data[2] || ": 0").split(": ");
      let equipString = bold(titleCase(equipmentType));
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n`;
      equipString += `${tradeability_section}\n`;
      return equipString;
    }
    if (this._item.types.includes("potion")) {
      if (this._item.types.includes("combat")) return `${bold("Potion")} (also usable in combat)\n`;
      return `${bold("Potion")}\n${tradeability_section}`;
    }
    if (this._item.types.includes("reusable")) {
      if (this._item.types.includes("combat"))
        return `${bold("Reusable item")} (also usable in combat)\n`;
      return `${bold("Reusable item")}\n${tradeability_section}`;
    }
    if (this._item.types.includes("usable") || this._item.types.includes("multiple")) {
      if (this._item.types.includes("combat"))
        return `${bold("Usable item")} (also usable in combat)\n`;
      return `${bold("Usable item")}\n${tradeability_section}`;
    }
    if (this._item.types.includes("combat")) {
      return `${bold("Combat item")}\n${tradeability_section}`;
    }
    if (this._item.types.includes("combat reusable")) {
      return `${bold("Reusable combat item")}\n${tradeability_section}`;
    }
    if (this._item.types.includes("grow")) {
      return `${bold("Familiar hatchling")}\n${tradeability_section}`;
    }
    return `${bold("Miscellaneous Item")}\n${tradeability_section}`;
  }

  addGrowingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Grows into: ${bold(
      hyperlink(familiar.get().name, toWikiLink(familiar.get().name))
    )}\n`;
  }

  addEquppingFamiliar(familiar: Familiar): void {
    this._addlDescription = `Familiar: ${hyperlink(
      familiar.get().name,
      toWikiLink(familiar.get().name)
    )}\n`;
  }

  addContainer(container: Item) {
    this._container = container;
  }

  addContents(contents: Item) {
    this._contents = contents;
  }

  addZapGroup(zapGroup: Item[]) {
    this._zapGroup = zapGroup;
  }

  addFoldGroup(foldGroup: Item[]) {
    this._foldGroup = foldGroup;
  }

  get(): ItemData {
    return this._item;
  }

  name(): string {
    return this._name;
  }

  id(): number {
    return this._item.id;
  }

  async getMallPrice() {
    if (!this._item.tradeable) return "";

    const { mallPrice, limitedMallPrice, formattedMallPrice, formattedLimitedMallPrice } =
      await kolClient.getMallPrice(this._item.id);

    const url = `https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=${this._item.id}&timespan=1&noanim=0`;

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

  async buildFullDescription(withAddl: boolean = true): Promise<string> {
    let description_string = this._shortDescription + (withAddl ? this._addlDescription : "");

    let blueText = await kolClient.getItemDescription(this._item.descId);

    let autosell = "";
    if (this._item.discardable && this._item.autosell > 0) {
      autosell += `Autosell value: ${this._item.autosell} meat.`;
    }

    let price_section = await this.getMallPrice();

    let container = "";
    if (withAddl && this._container) {
      container = `\nEnclosed in: ${bold(
        hyperlink(this._container.get().name, toWikiLink(this._container.get().name))
      )}\n${await this._container?.buildFullDescription(false)}\n`;
    }

    let contents = "";
    if (withAddl && this._contents) {
      contents = `\nEncloses: ${bold(
        hyperlink(this._contents.get().name, toWikiLink(this._contents.get().name))
      )}\n${await this._contents?.buildFullDescription(false)}\n`;
    }

    let zapGroup = "";
    if (this._zapGroup) {
      zapGroup = `\nZaps into: ${this._zapGroup
        .filter((item) => item.name() !== this.name())
        .slice(0, 7)
        .map((item) => item.get().name)
        .map((name) => hyperlink(name, toWikiLink(name)))
        .join(", ")}${this._zapGroup.length > 8 ? " ...and more." : ""}\n`;

      const tradeables = (
        await Promise.all(
          this._zapGroup
            .filter((item) => item.get().tradeable)
            .map(async (item) => ({
              item: item,
              price: await kolClient.getMallPrice(item.get().id),
            }))
        )
      )
        .filter((item) => item.price.minPrice)
        .sort((a, b) => (a.price.minPrice as number) - (b.price.minPrice as number));
      if (tradeables.length > 0) {
        if (tradeables[0].item.get().id === this._item.id) {
          zapGroup += "(This item is the cheapest in its zap group)";
        } else {
          const cheapest = tradeables[0].item;
          zapGroup += `(Cheapest: ${hyperlink(
            cheapest.get().name,
            toWikiLink(cheapest.get().name)
          )} @ ${hyperlink(
            `${tradeables[0].price.formattedMinPrice} meat`,
            `https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=${
              cheapest.get().id
            }&timespan=1&noanim=0`
          )})\n`;
        }
      }
    }

    let foldGroup = "";
    if (this._foldGroup) {
      foldGroup = `\nFolds into: ${this._foldGroup
        .filter((item) => item.name() !== this.name())
        .slice(0, 7)
        .map((item) => item.get().name)
        .map((name) => hyperlink(name, toWikiLink(name)))
        .join(", ")}${this._foldGroup.length > 8 ? " ...and more." : ""}\n`;

      const tradeables = (
        await Promise.all(
          this._foldGroup
            .filter((item) => item.get().tradeable)
            .map(async (item) => ({
              item: item,
              price: await kolClient.getMallPrice(item.get().id),
            }))
        )
      )
        .filter((item) => item.price.minPrice)
        .sort((a, b) => (a.price.minPrice as number) - (b.price.minPrice as number));
      if (tradeables.length > 0) {
        if (tradeables[0].item.get().id === this._item.id) {
          foldGroup += "(This item is the cheapest in its fold group)";
        } else {
          const cheapest = tradeables[0].item;
          foldGroup += `(Cheapest: ${hyperlink(
            cheapest.get().name,
            toWikiLink(cheapest.get().name)
          )}) @ ${hyperlink(
            `${tradeables[0].price.formattedMinPrice} meat`,
            `https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=${
              cheapest.get().id
            }&timespan=1&noanim=0`
          )})\n`;
        }
      }
    }

    if (blueText && (autosell || price_section)) blueText += "\n";
    if (autosell) autosell += "\n";
    if (price_section) price_section += "\n";

    return `${description_string}${blueText}${autosell}${price_section}${zapGroup}${foldGroup}${container}${contents}`;
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._item.imageUrl}`);
    embed.setDescription(await this.buildFullDescription());
  }

  parseItemData(itemData: string): ItemData {
    const data = itemData.split(/\t/);
    if (data.length < 7) {
      throw "Invalid data";
    }
    return {
      id: parseInt(data[0]),
      name: cleanString(data[1]),
      descId: parseInt(data[2]),
      imageUrl: data[3],
      types: data[4].split(", "),
      quest: data[5].indexOf("q") >= 0,
      gift: data[5].indexOf("g") >= 0,
      tradeable: data[5].indexOf("t") >= 0,
      discardable: data[5].indexOf("d") >= 0,
      autosell: parseInt(data[6]),
      pluralName: cleanString(data[7]) || `${cleanString(data[1])}s`,
    };
  }
}
