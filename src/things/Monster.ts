import { bold, hyperlink } from "discord.js";
import { Memoize } from "typescript-memoize";

import { cleanString, notNull, toWikiLink } from "../utils/index.js";
import { Thing } from "./Thing.js";

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
  static is(thing?: Thing | null): thing is Monster {
    return !!thing && thing instanceof Monster;
  }

  static from(line: string): Monster {
    const parts = line.split(/\t/);
    if (parts.length < 4) throw "Invalid data";

    return new Monster(
      cleanString(parts[0]),
      parseInt(parts[1]),
      parts[2].split(",")[0],
      parts[3],
      parts[4]
        ? parts
            .slice(4)
            .map((drop) => convertToDrop(cleanString(drop)))
            .filter(notNull)
            .sort((a, b) => b.droprate - a.droprate)
        : []
    );
  }

  readonly parameters: string;
  readonly drops: Drop[];

  constructor(name: string, id: number, imageUrl: string, parameters: string, drops: Drop[]) {
    super(id, name, imageUrl);
    this.parameters = parameters;
    this.drops = drops;
  }

  getImagePath() {
    return `/adventureimages/${this.imageUrl}`;
  }

  private getDropsDescription() {
    const meatMatcher = this.parameters.match(/Meat: (?<meat>[\d]+)/);

    if (!this.drops.length && !meatMatcher) return null;

    const description = ["Drops:"];

    if (meatMatcher) {
      const meat = parseInt(meatMatcher[1]);
      description.push(`${meat} (±${Math.floor(meat * 0.2)}) meat`);
    }

    const drops = new Map<string, number>();

    for (const drop of this.drops) {
      const dropDetails: string[] = [];
      if (drop.attributes.accordion) {
        dropDetails.push("Stealable accordion");
      } else {
        dropDetails.push(drop.droprate > 0 ? `${drop.droprate}%` : "Sometimes");
        if (drop.attributes.pickpocketOnly) dropDetails.push("pickpocket only");
        if (drop.attributes.noPickpocket) dropDetails.push("can't be stolen");
        if (drop.attributes.conditional) dropDetails.push("conditional");
        if (drop.attributes.fixedRate) dropDetails.push("unaffected by item drop modifiers");
      }

      const dropDescription = `${hyperlink(drop.item, toWikiLink(drop.item))} (${dropDetails.join(
        ", "
      )})`;

      drops.set(dropDescription, (drops.get(dropDescription) || 0) + 1);
    }

    description.push(
      ...[...drops.entries()]
        .slice(0, 10)
        .map(([drop, quantity]) => `${quantity > 1 ? `${quantity}x ` : ""}${drop}`)
    );

    if (drops.size > 10) description.push("...and more.");

    return description.join("\n");
  }

  @Memoize()
  async getDescription(): Promise<string> {
    const description = [bold("Monster"), `(Monster ${this.id})`];

    const atk = this.parameters.match(/Atk: (?<atk>-?[\d]+)/);
    const def = this.parameters.match(/Def: (?<def>-?[\d]+)/);
    const hp = this.parameters.match(/HP: (?<hp>-?[\d]+)/);
    const scaleMatcher = this.parameters.match(/Scale: (?<scale>(-?[\d]|\[.*?\])+)/);

    if (atk && def && hp) {
      description.push(`Attack: ${atk[1]} | Defense: ${def[1]} | HP: ${hp[1]}`);
    } else if (scaleMatcher) {
      const scaleDetails: string[] = [];

      const scale = Number(scaleMatcher[1]);

      if (Number.isNaN(scale)) {
        scaleDetails.push("something weird");
      } else {
        scaleDetails.push("your stats", scale >= 0 ? "plus" : "minus", Math.abs(scale).toString());
      }

      const scaleBounds: string[] = [];

      const floor = this.parameters.match(/Floor: (?<floor>[\d]+)/);
      if (floor) scaleBounds.push(`min ${floor[1]}`);

      const cap = this.parameters.match(/Cap: (?<cap>[\d]+)/);
      if (cap) scaleBounds.push(`max ${cap[1]}`);

      if (scaleBounds.length > 0) scaleDetails.push(`(${scaleBounds.join(", ")})`);

      description.push(
        `Scales to ${scaleDetails.join(" ")} | HP: ${hp ? hp[1] : "75% of defense"}.`
      );
    } else {
      description.push("Scales unusually.");
    }

    const phylum = this.parameters.match(/P: (?<phylum>[a-z]+)/);
    if (phylum) description.push(`Phylum: ${phylum[1]}`);

    const element = this.parameters.match(/E: (?<element>[a-z]+)/);
    if (element) description.push(`Element: ${element[1]}`);

    if (this.parameters.includes("Init: 10000")) description.push("Always wins initiative.");
    if (this.parameters.includes("Init: -10000")) description.push("Always loses initiative.");
    if (this.parameters.includes("FREE")) description.push("Doesn't cost a turn to fight.");
    if (this.parameters.includes("NOCOPY")) description.push("Can't be copied.");
    if (this.parameters.includes("BOSS")) description.push("Instakill immune.");
    if (this.parameters.includes("ULTRARARE")) description.push("Ultra-rare encounter.");

    const drops = this.getDropsDescription();
    if (drops) {
      description.push("", drops);
    }

    return description.join("\n");
  }
}
