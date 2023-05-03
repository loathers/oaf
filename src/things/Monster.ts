import { bold, hyperlink } from "discord.js";
import { memoizeAsync } from "utils-decorators";

import { cleanString, notNull, toWikiLink } from "../utils";
import { Thing } from "./Thing";

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

export function convertToDrop(drop: string): Drop | null {
  const dropMatch = drop.match(/^(?<item>.+) \((?<attributes>[a-z]*)(?<droprate>[\d]+)\)$/);
  if (!dropMatch?.groups) return null;

  const { item, attributes, droprate } = dropMatch.groups;

  return {
    item,
    droprate: parseInt(droprate || "0"),
    attributes: {
      pickpocketOnly: attributes.includes("p"),
      noPickpocket: attributes.includes("n"),
      conditional: attributes.includes("c"),
      fixedRate: attributes.includes("f"),
      accordion: attributes.includes("a"),
    },
  };
}

export class Monster extends Thing {
  static from(line: string): Monster {
    const parts = line.split(/\t/);
    if (parts.length < 4) throw "Invalid data";

    return new Monster(
      cleanString(parts[0]),
      parseInt(parts[1]),
      parts[2].split(",")[0],
      parts[3],
      parts[4]
        ? (
            parts
              .slice(4)
              .map((drop) => convertToDrop(cleanString(drop)))
              .filter(notNull)
          ).sort((a, b) => b.droprate - a.droprate)
        : [],
    );
  }

  readonly parameters: string;
  readonly drops: Drop[];

  constructor(name: string, id: number, imageUrl: string, parameters: string, drops: Drop[]) {
    super(id, name, imageUrl);
    this.parameters = parameters;
    this.drops = drops;
  }

  @memoizeAsync()
  async getDescription(): Promise<string> {
    let description = `${bold("Monster")}\n(Monster ${this.id})\n`;
    const atk = this.parameters.match(/Atk: (?<atk>\-?[\d]+)/);
    const def = this.parameters.match(/Def: (?<def>\-?[\d]+)/);
    const hp = this.parameters.match(/HP: (?<hp>\-?[\d]+)/);
    const scale = this.parameters.match(/Scale: (?<scale>-?[\d]+)/);
    const floor = this.parameters.match(/Floor: (?<floor>[\d]+)/);
    const cap = this.parameters.match(/Cap: (?<cap>[\d]+)/);

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
    } else if (this.parameters.indexOf("Scales: ")) {
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

    const phylum = this.parameters.match(/P: (?<phylum>[\a-z]+)/);
    if (phylum) {
      description += `Phylum: ${phylum[1]}\n`;
    }
    const element = this.parameters.match(/E: (?<element>[\a-z]+)/);
    if (element) {
      description += `Element: ${element[1]}\n`;
    }
    if (this.parameters.indexOf("Init: 10000") > -1)
      description += "Always wins initiative.\n";
    if (this.parameters.indexOf("Init: -10000") > -1)
      description += "Always loses initiative.\n";
    if (this.parameters.indexOf("FREE") > -1)
      description += "Doesn't cost a turn to fight.\n";
    if (this.parameters.indexOf("NOCOPY") > -1) description += "Can't be copied.\n";
    if (this.parameters.indexOf("BOSS") > -1) description += "Instakill immune.\n";
    if (this.parameters.indexOf("ULTRARARE") > -1)
      description += "Ultra-rare encounter.\n";

    const meat = this.parameters.match(/Meat: (?<meat>[\d]+)/);
    if (this.drops.length || meat) {
      description += "\nDrops:\n";
      if (meat) {
        const meatInt = parseInt(meat[1]);
        description += `${meat[1]} (±${Math.floor(meatInt * 0.2)}) meat\n`;
      }
      const dedupedDrops = new Map<string, number>();
      let dropArray = [];
      for (let drop of this.drops) {
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
}
