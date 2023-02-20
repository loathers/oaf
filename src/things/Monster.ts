import { EmbedBuilder, bold, hyperlink } from "discord.js";

import { kolClient } from "../clients/kol";
import { cleanString, toWikiLink } from "../utils";
import { Thing } from "./Thing";

export type MonsterData = {
  name: string;
  id: number;
  imageUrl: string;
  parameters: string;
  drops: Drop[];
};

export type Drop = {
  item: string;
  droprate: number;
  attributes: {
    pickpocketOnly: boolean;
    noPickpocket: boolean;
    conditional: boolean;
    fixedRate: boolean;
    accordion: boolean;
  };
};

export function convertToDrop(drop: string): Drop | undefined {
  const dropMatch = drop.match(/^(?<itemName>.+) \((?<attributes>[a-z]*)(?<droprate>[\d]+)\)$/);
  if (dropMatch) {
    const attributes = dropMatch.groups?.attributes || "";
    return {
      item: dropMatch.groups?.itemName || "",
      droprate: parseInt(dropMatch.groups?.droprate || "0"),
      attributes: {
        pickpocketOnly: attributes.indexOf("p") > -1,
        noPickpocket: attributes.indexOf("n") > -1,
        conditional: attributes.indexOf("c") > -1,
        fixedRate: attributes.indexOf("f") > -1,
        accordion: attributes.indexOf("a") > -1,
      },
    };
  }
  return undefined;
}

export class Monster implements Thing {
  _monster: MonsterData;
  _name: string;
  _description: string = "";

  constructor(data: string) {
    this._monster = this.parseMonsterData(data);
    this._name = this._monster.name.toLowerCase();
  }

  get(): MonsterData {
    return this._monster;
  }

  name(): string {
    return this._name;
  }

  async buildDescription(): Promise<string> {
    let description = `${bold("Monster")}\n(Monster ${this._monster.id})\n`;
    const atk = this._monster.parameters.match(/Atk: (?<atk>\-?[\d]+)/);
    const def = this._monster.parameters.match(/Def: (?<def>\-?[\d]+)/);
    const hp = this._monster.parameters.match(/HP: (?<hp>\-?[\d]+)/);
    const scale = this._monster.parameters.match(/Scale: (?<scale>-?[\d]+)/);
    const floor = this._monster.parameters.match(/Floor: (?<floor>[\d]+)/);
    const cap = this._monster.parameters.match(/Cap: (?<cap>[\d]+)/);

    if (atk && def && hp) {
      description += `Attack: ${atk[1]} | Defense: ${def[1]} | HP: ${hp[1]}\n`;
    } else if (scale) {
      let scaleString =
        parseInt(scale[1]) >= 0 ? `plus ${scale[1]}` : `minus ${scale[1].substring(1)}`;
      if (cap || floor) {
        scaleString += " (";
        if (floor) scaleString += `min ${floor[1]}`;
        if (floor && cap) scaleString += ", ";
        if (cap) scaleString += `max ${cap[1]}`;
        scaleString += ")";
      }
      if (hp) {
        description += `Scales to your stats ${scaleString} | HP: ${hp[1]}\n`;
      } else {
        description += `Scales to your stats ${scaleString} | HP: 75% of defense.\n`;
      }
    } else if (this._monster.parameters.indexOf("Scales: ")) {
      let capString = "";
      if (cap || floor) {
        capString += " (";
        if (floor) capString += `min ${floor[1]}`;
        if (floor && cap) capString += ", ";
        if (cap) capString += `max ${cap[1]}`;
        capString += ")";
      }
      if (hp) description += `Scales to your stats${capString} | HP: ${hp[1]}\n`;
      else description += `Scales to your stats${capString} | HP: 75% of defense.\n`;
    } else description += "Scales unusually.\n";

    const phylum = this._monster.parameters.match(/P: (?<phylum>[\a-z]+)/);
    if (phylum) {
      description += `Phylum: ${phylum[1]}\n`;
    }
    const element = this._monster.parameters.match(/E: (?<element>[\a-z]+)/);
    if (element) {
      description += `Element: ${element[1]}\n`;
    }
    if (this._monster.parameters.indexOf("Init: 10000") > -1)
      description += "Always wins initiative.\n";
    if (this._monster.parameters.indexOf("Init: -10000") > -1)
      description += "Always loses initiative.\n";
    if (this._monster.parameters.indexOf("FREE") > -1)
      description += "Doesn't cost a turn to fight.\n";
    if (this._monster.parameters.indexOf("NOCOPY") > -1) description += "Can't be copied.\n";
    if (this._monster.parameters.indexOf("BOSS") > -1) description += "Instakill immune.\n";
    if (this._monster.parameters.indexOf("ULTRARARE") > -1)
      description += "Ultra-rare encounter.\n";

    const meat = this._monster.parameters.match(/Meat: (?<meat>[\d]+)/);
    if (this._monster.drops.length || meat) {
      description += "\nDrops:\n";
      if (meat) {
        const meatInt = parseInt(meat[1]);
        description += `${meat[1]} (±${Math.floor(meatInt * 0.2)}) meat\n`;
      }
      const dedupedDrops = new Map<string, number>();
      let dropArray = [];
      for (let drop of this._monster.drops) {
        let dropDesc = "";
        if (drop.attributes.accordion) {
          dropDesc += `${hyperlink(drop.item, toWikiLink(drop.item))} (Stealable accordion)\n`;
        } else {
          dropDesc += `${hyperlink(drop.item, toWikiLink(drop.item))} (${
            drop.droprate > 0 ? `${drop.droprate}%` : "Sometimes"
          }`;
          if (drop.attributes.pickpocketOnly) dropDesc += ", pickpocket only";
          if (drop.attributes.noPickpocket) dropDesc += ", can't be stolen";
          if (drop.attributes.conditional) dropDesc += ", conditional";
          if (drop.attributes.fixedRate) dropDesc += ", unaffected by item drop modifiers";
          dropDesc += ")";
        }
        if (dedupedDrops.has(dropDesc))
          dedupedDrops.set(dropDesc, (dedupedDrops.get(dropDesc) || 0) + 1);
        else dedupedDrops.set(dropDesc, 1);
        dropArray.push(dropDesc);
      }
      let dropsWritten = 0;
      for (let drop of dropArray) {
        if (dedupedDrops.has(drop)) {
          const quantity = dedupedDrops.get(drop) || 1;
          description += `${quantity > 1 ? `${quantity}x ` : ""}${drop}\n`;
          dedupedDrops.delete(drop);
          dropsWritten += 1;
          if (dropsWritten >= 10) break;
        }
      }
      if (dedupedDrops.size > 0) description += "...and more.";
    }
    return description;
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    embed.setThumbnail(
      `http://images.kingdomofloathing.com/adventureimages/${this._monster.imageUrl}`
    );
    if (!this._description) this._description = await this.buildDescription();
    embed.setDescription(this._description);
  }

  parseMonsterData(monsterData: string): MonsterData {
    const data = monsterData.split(/\t/);
    if (data.length < 4) throw "Invalid data";
    return {
      name: cleanString(data[0]),
      id: parseInt(data[1]),
      imageUrl: data[2].split(",")[0],
      parameters: data[3],
      drops: data[4]
        ? (
            data
              .slice(4)
              .map((drop) => convertToDrop(cleanString(drop)))
              .filter((drop) => drop !== undefined) as Drop[]
          ).sort((a, b) => b.droprate - a.droprate)
        : [],
    };
  }
}
