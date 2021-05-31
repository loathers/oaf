import { MessageEmbed } from "discord.js";
import { decode } from "html-entities";
import { KOLClient } from "./kolclient";

export abstract class Thing {
  abstract name(): string;
  abstract addToEmbed(embed: MessageEmbed, client: KOLClient): void;
}

type ItemData = {
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
  _fullDescription: string = "";
  _craftSting: string = "";

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

  buildShortDescription(itemMap: Map<string, string[]>): string {
    const data = itemMap.get(this._name) || [];
    if (this._item.types.includes("food")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      let desc = `**${this.mapQuality(data[3])} food** (Size ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${advRange.length > 1 ? `${advRange[0]}-${advRange[1]}` : data[4]} adventure${
          data[4] === "1" ? "" : "s"
        }`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${
            advRange.length > 1 ? `Average ${average} adventure${data[4] === "1" ? "" : "s"}` : ""
          }`;
          desc += `${
            size > 1 ? `${advRange.length > 1 ? ", " : ""}${average / size} per fullness` : ""
          })`;
        }
      }
      desc += "\n\n";
      return desc;
    }
    if (this._item.types.includes("drink")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      let desc = `**${this.mapQuality(data[3])} booze** (Potency ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${advRange.length > 1 ? `${advRange[0]}-${advRange[1]}` : data[4]} adventure${
          data[4] === "1" ? "" : "s"
        }`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${
            advRange.length > 1 ? `Average ${average} adventure${data[4] === "1" ? "" : "s"}` : ""
          }`;
          desc += `${
            size > 1 ? `${advRange.length > 1 ? ", " : ""}${average / size} per inebriety` : ""
          })`;
        }
      }
      desc += "\n\n";
      return desc;
    }
    if (this._item.types.includes("spleen")) {
      const advRange = data[4].split("-");
      const size = parseInt(data[1]);
      const average =
        advRange.length > 1
          ? (parseInt(advRange[0]) + parseInt(advRange[1])) / 2
          : parseInt(data[4]);
      let desc = `**${this.mapQuality(data[3])} spleen item** (Toxicity ${data[1]}${
        data[2] !== "1" ? `, requires level ${data[2]}` : ""
      })`;
      if (data[4] !== "0") {
        desc += `\n${advRange.length > 1 ? `${advRange[0]}-${advRange[1]}` : data[4]} adventure${
          data[4] === "1" ? "" : "s"
        }`;
        if (advRange.length > 1 || size > 1) {
          desc += ` (${
            advRange.length > 1 ? `Average ${average} adventure${data[4] === "1" ? "" : "s"}` : ""
          }`;
          desc += `${
            size > 1 ? `${advRange.length > 1 ? ", " : ""}${average / size} per spleen` : ""
          })`;
        }
      }
      desc += "\n\n";
      return desc;
    }
    if (this._item.types.includes("weapon")) {
      const requirement = (data[2] || ": 0").split(": ");
      const damage = parseInt(data[1]) / 10;
      let equipString = `**${data[3]}**\n`;
      equipString += `${Math.round(damage)}-${Math.round(damage * 2)} damage${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      }\n\n`;
      return equipString;
    }
    if (this._item.types.includes("offhand")) {
      const requirement = (data[2] || ": 0").split(": ");
      const isShield = data[3] === "shield";
      let equipString = `**Offhand ${isShield ? "Shield" : "Item"}**`;
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n\n`;
      if (isShield) equipString += `Damage Reduction: ${parseInt(data[1]) / 15 - 1}\n`;
      return equipString;
    }
    if (this._item.types.includes("container")) {
      const requirement = (data[2] || ": 0").split(": ");
      let equipString = `**Back Item**`;
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n\n`;
      return equipString;
    }
    if (this._item.types.includes("familiar")) {
      return `**Familiar Equipment**\n`;
    }
    //This is hideous. but hey.
    let equipmentType = "";
    for (equipmentType of ["hat", "shirt", "pants", "accessory", ""]) {
      if (this._item.types.includes(equipmentType)) break;
    }
    if (equipmentType) {
      const requirement = (data[2] || ": 0").split(": ");
      let equipString = `**${equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}**`;
      equipString += ` (${data[1]} power${
        data[2] !== "none" && requirement[1] !== "0"
          ? `, requires ${requirement[1]} ${this.mapStat(requirement[0])}`
          : ""
      })\n\n`;
      return equipString;
    }
    if (this._item.types.includes("potion")) {
      if (this._item.types.includes("combat")) return "**Potion** (also usable in combat)\n";
      return "**Potion**\n";
    }
    if (this._item.types.includes("reusable")) {
      if (this._item.types.includes("combat")) return "**Reusable item** (also usable in combat)\n";
      return "**Reusable item**\n";
    }
    if (this._item.types.includes("usable") || this._item.types.includes("multiple")) {
      if (this._item.types.includes("combat")) return "**Usable item** (also usable in combat)\n";
      return "**Usable item**\n";
    }
    if (this._item.types.includes("combat")) {
      return "**Combat item**\n";
    }
    if (this._item.types.includes("combat reusable")) {
      return "**Reusable combat item**\n";
    }
    if (this._item.types.includes("grow")) {
      return "**Familiar hatchling**\n";
    }
    return "**Miscellaneous Item**\n";
  }

  addFamiliar(familiar: Familiar): void {
    this._shortDescription += `Familiar: ${familiar.name()}\n\n`;
  }

  get(): ItemData {
    return this._item;
  }

  name(): string {
    return this._name;
  }

  async buildFullDescription(client: KOLClient): Promise<string> {
    let description_string = this._shortDescription;

    let tradeability_section = "";
    if (this._item.quest) tradeability_section += "Quest Item\n";
    else if (this._item.gift) tradeability_section += "Gift Item\n";
    if (!this._item.tradeable) {
      if (this._item.discardable) tradeability_section += "Cannot be traded.";
      else tradeability_section += "Cannot be traded or discarded.";
    } else if (!this._item.discardable) tradeability_section += "Cannot be discarded.";

    let blueText = await client.getItemDescription(this._item.descId);

    let autosell = "";
    if (this._item.discardable && this._item.autosell > 0) {
      autosell += `Autosell value: ${this._item.autosell} meat.`;
    }

    let price_section = "";
    if (this._item.tradeable) {
      const { mallPrice, limitedMallPrice, formattedMallPrice, formattedLimitedMallPrice } =
        await client.getMallPrice(this._item.id);
      if (mallPrice) {
        price_section += `Mall Price: ${formattedMallPrice} meat`;
        if (limitedMallPrice && limitedMallPrice < mallPrice)
          price_section += ` (or ${formattedLimitedMallPrice} meat limited per day)`;
      } else if (limitedMallPrice)
        price_section += `Mall Price: ${formattedLimitedMallPrice} meat (only available limited per day)`;
      else price_section += "Mall extinct.";
    }

    if (tradeability_section) tradeability_section += "\n";
    if (blueText && (autosell || price_section)) blueText += "\n";
    if (autosell) autosell += "\n";
    if (price_section) price_section += "\n";

    return `${description_string}${tradeability_section}${blueText}${autosell}${price_section}`;
  }

  async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._item.imageUrl}`);
    embed.setDescription(await this.buildFullDescription(client));
  }

  parseItemData(itemData: string): ItemData {
    const data = itemData.split(/\t/);
    if (data.length < 7) {
      throw "Invalid data";
    }
    return {
      id: parseInt(data[0]),
      name: decode(data[1]),
      descId: parseInt(data[2]),
      imageUrl: data[3],
      types: data[4].split(", "),
      quest: data[5].indexOf("q") >= 0,
      gift: data[5].indexOf("g") >= 0,
      tradeable: data[5].indexOf("t") >= 0,
      discardable: data[5].indexOf("d") >= 0,
      autosell: parseInt(data[6]),
      pluralName: data[7] || `${data[1]}s`,
    };
  }
}

type EffectData = {
  id: number;
  name: string;
  imageUrl: string;
  descId: string;
  quality: string;
  attributes: string;
};

export class Effect implements Thing {
  _effect: EffectData;
  _name: string;
  _description: string = "";

  constructor(data: string) {
    this._effect = this.parseEffectData(data);
    this._name = this._effect.name.toLowerCase();
  }

  get(): EffectData {
    return this._effect;
  }

  name(): string {
    return this._name;
  }

  async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._effect.imageUrl}`);
    if (!this._description)
      this._description = `**Effect**\n${await client.getEffectDescription(this._effect.descId)}`;
    embed.setDescription(this._description);
  }

  parseEffectData(effectData: string): EffectData {
    const data = effectData.split(/\t/);
    if (data.length < 6) throw "Invalid data";
    return {
      id: parseInt(data[0]),
      name: decode(data[1]),
      imageUrl: data[2],
      descId: data[3],
      quality: data[4],
      attributes: data[5],
    };
  }
}

type SkillData = {
  id: number;
  name: string;
  imageUrl: string;
  type: number;
  manaCost: number;
  duration: number;
  level?: number;
};

export class Skill implements Thing {
  _skill: SkillData;
  _name: string;
  _description: string = "";

  constructor(data: string) {
    this._skill = this.parseSkillData(data);
    this._name = this._skill.name.toLowerCase();
  }

  get(): SkillData {
    return this._skill;
  }

  name(): string {
    return this._name;
  }

  async buildDescription(client: KOLClient): Promise<string> {
    let description = "";
    switch (this._skill.type) {
      case 0:
        description += "**Passive Skill**";
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        description += `**Skill**\nCost: ${this._skill.manaCost}mp`;
        break;
      case 5:
        description += `**Combat Skill**\nCost: ${this._skill.manaCost}mp`;
        break;
      case 6:
        description += `**Skill (Boris Song)**\nCost: ${this._skill.manaCost}mp`;
        break;
      case 7:
        description += `**Combat/Noncombat Skill**\nCost: ${this._skill.manaCost}mp`;
        break;
      case 8:
        description += `**Combat Passive Skill**`;
        break;
      case 9:
        description += `**Skill (Expression)**\nCost: ${this._skill.manaCost}mp`;
        break;
      case 10:
        description += `**Skill (Walk)**\nCost: ${this._skill.manaCost}mp`;
        break;
      default:
        "**Skill**";
    }
    description += "\n\n";
    description += await client.getSkillDescription(this._skill.id);
    return description;
  }

  async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._skill.imageUrl}`);
    if (!this._description) this._description = await this.buildDescription(client);
    embed.setDescription(this._description);
  }

  parseSkillData(skillData: string): SkillData {
    const data = skillData.split(/\t/);
    if (data.length < 6) throw "Invalid data";
    return {
      id: parseInt(data[0]),
      name: decode(data[1]),
      imageUrl: data[2],
      type: parseInt(data[3]),
      manaCost: parseInt(data[4]),
      duration: parseInt(data[5]),
      level: data[6] ? parseInt(data[6]) : undefined,
    };
  }
}

type FamiliarData = {
  id: number;
  name: string;
  imageUrl: string;
  types: string[];
  larva: string;
  item: string;
  attributes: string;
};

export class Familiar implements Thing {
  _familiar: FamiliarData;
  _name: string;
  _description: string = "";
  _hatchling: Item | undefined;
  _equipment: Item | undefined;

  constructor(data: string) {
    this._familiar = this.parseFamiliarData(data);
    this._name = this._familiar.name.toLowerCase();
  }

  get(): FamiliarData {
    return this._familiar;
  }

  name(): string {
    return this._name;
  }

  addHatchling(hatchling: Item) {
    this._hatchling = hatchling;
  }

  addEquipment(equipment: Item) {
    this._equipment = equipment;
  }

  parseTypes(): string {
    let types = "";
    if (this._familiar.types.includes("none")) {
      types += "Does nothing useful.\n";
    }
    if (this._familiar.types.includes("stat0")) {
      types += "Boosts stat gains (volleyball formula).\n";
    }
    if (this._familiar.types.includes("stat1")) {
      types += "Boosts stat gains (sombrero formula).\n";
    }
    if (this._familiar.types.includes("item0")) {
      types += "Boosts item drops.\n";
    }
    if (this._familiar.types.includes("meat0")) {
      types += "Boosts meat drops.\n";
    }
    if (this._familiar.types.includes("combat0")) {
      types += "Deals physical damage in combat.\n";
    }
    if (this._familiar.types.includes("combat1")) {
      types += "Deals elemental damage in combat.\n";
    }
    if (this._familiar.types.includes("block")) {
      types += "Blocks enemy attacks.\n";
    }
    if (this._familiar.types.includes("delevel")) {
      types += "Delevels enemies in combat.\n";
    }
    if (this._familiar.types.includes("hp0")) {
      types += "Heals you during combat.\n";
    }
    if (this._familiar.types.includes("mp0")) {
      types += "Restores your mp during combat.\n";
    }
    if (this._familiar.types.includes("meat1")) {
      types += "Drops meat during combat.\n";
    }
    if (this._familiar.types.includes("stat2")) {
      types += "Grants stats during combat.\n";
    }
    if (this._familiar.types.includes("other0")) {
      types += "Does something unusual during combat.\n";
    }
    if (this._familiar.types.includes("hp1")) {
      types += "Heals you after combat.\n";
    }
    if (this._familiar.types.includes("mp1")) {
      types += "Restores your mp after combat.\n";
    }
    if (this._familiar.types.includes("stat3")) {
      types += "Boosts stat gains (unusual formula).\n";
    }
    if (this._familiar.types.includes("other1")) {
      types += "Does something unusual after combat.\n";
    }
    if (this._familiar.types.includes("passive")) {
      types += "Grants a passive benefit.\n";
    }
    if (this._familiar.types.includes("drop")) {
      types += "Drops special items.\n";
    }
    if (this._familiar.types.includes("variable")) {
      types += "Has varying abilities.\n";
    }
    if (this._familiar.types.includes("underwater")) {
      types += "Can naturally breathe underwater.\n";
    }
    return types;
  }

  async buildDescription(client: KOLClient): Promise<string> {
    let description_string = "**Familiar**\n";
    description_string += `${this.parseTypes()}\n`;
    if (this._familiar.larva)
      description_string += `Hatchling: ${this._familiar.larva}\n${(
        await this._hatchling?.buildFullDescription(client)
      )?.substring(23)}\n`;
    if (this._familiar.item)
      description_string += `Equipment: ${this._familiar.item}\n${await client.getItemDescription(
        this._equipment?.get().descId || 0
      )}\n`;
    description_string += `Attributes: ${this._familiar.attributes || "None"}`;
    return description_string;
  }

  async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._familiar.imageUrl}`);
    if (!this._description) this._description = await this.buildDescription(client);
    embed.setDescription(this._description);
  }

  parseFamiliarData(familiarData: string): FamiliarData {
    const data = familiarData.split(/\t/);
    if (data.length < 10) throw "Invalid data";
    return {
      id: parseInt(data[0]),
      name: decode(data[1]),
      imageUrl: data[2],
      types: data[3].split(","),
      larva: decode(data[4]),
      item: decode(data[5]),
      attributes: data[10] ? data[10].replace(/,/g, ", ") : "",
    };
  }
}
