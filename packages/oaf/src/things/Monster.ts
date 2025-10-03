import {
  type Monster as DMonster,
  MonsterDropCategory,
} from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { Memoize } from "typescript-memoize";

import { toWikiLink } from "../utils.js";
import { Thing } from "./Thing.js";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

interface TMonster extends DeepPartial<DMonster> {
  id: number;
  name: string;
  image: (string | null)[];
  monsterDropsByMonster?: {
    nodes: ({
      itemByItem: {
        name: string;
        id: number;
      } | null;
      rate: number;
      category: MonsterDropCategory | null;
    } | null)[];
  };
}

export class Monster extends Thing {
  static is(thing?: Thing | null): thing is Monster {
    return !!thing && thing instanceof Monster;
  }

  private monster: TMonster;

  constructor(monster: TMonster) {
    super(
      monster.id,
      monster.name,
      monster.image.filter((i) => i !== null)[0] || "nopic.gif",
    );
    this.monster = monster;
  }

  getModifiers(): Record<string, string> {
    return {};
  }

  getImagePath() {
    return `/adventureimages/${this.imageUrl}`;
  }

  private getDropsDescription() {
    const meat = this.monster.meat;
    const drops =
      this.monster.monsterDropsByMonster?.nodes.filter((d) => d !== null) ?? [];

    if (!drops.length && !meat) return null;

    const description = ["Drops:"];

    if (meat) {
      description.push(`${meat} (±${Math.floor(meat * 0.2)}) meat`);
    }

    const dropDescriptions = new Map<string, number>();

    for (const drop of drops) {
      const item = drop.itemByItem?.name;
      if (!item) continue;
      const dropDetails: string[] = [];
      if (drop.category === "A") {
        dropDetails.push("Stealable accordion");
      } else {
        dropDetails.push(drop.rate > 0 ? `${drop.rate}%` : "Sometimes");
        if (drop.category === "P") dropDetails.push("pickpocket only");
        if (drop.category === "N") dropDetails.push("can't be stolen");
        if (drop.category === "C") dropDetails.push("conditional");
        if (drop.category === "F")
          dropDetails.push("unaffected by item drop modifiers");
      }

      const dropDescription = `${hyperlink(
        item,
        toWikiLink(item),
      )} (${dropDetails.join(", ")})`;

      dropDescriptions.set(
        dropDescription,
        (dropDescriptions.get(dropDescription) || 0) + 1,
      );
    }

    description.push(
      ...[...dropDescriptions.entries()]
        .slice(0, 10)
        .map(
          ([drop, quantity]) => `${quantity > 1 ? `${quantity}x ` : ""}${drop}`,
        ),
    );

    if (dropDescriptions.size > 10) description.push("...and more.");

    return description.join("\n");
  }

  @Memoize()
  async getDescription(): Promise<string> {
    const description = [bold("Monster"), `(Monster ${this.id})`];

    const atk = this.monster.attack;
    const def = this.monster.defence;
    const hp = this.monster.hp;
    const scale = this.monster.scaling;

    if (atk && atk !== "0" && def && def !== "0" && hp && hp !== "0") {
      description.push(`Attack: ${atk} | Defense: ${def} | HP: ${hp}`);
    } else if (scale !== "0") {
      const scaleDetails: string[] = [];

      const scaleNum = Number(scale);

      if (Number.isNaN(scaleNum)) {
        scaleDetails.push("something weird");
      } else {
        scaleDetails.push(
          "your stats",
          scaleNum >= 0 ? "plus" : "minus",
          Math.abs(scaleNum).toString(),
        );
      }

      const scaleBounds: string[] = [];

      if (this.monster.scalingFloor !== "0")
        scaleBounds.push(`min ${this.monster.scalingFloor}`);
      if (this.monster.scalingCap !== "0")
        scaleBounds.push(`max ${this.monster.scalingCap}`);

      if (scaleBounds.length > 0)
        scaleDetails.push(`(${scaleBounds.join(", ")})`);

      description.push(
        `Scales to ${scaleDetails.join(" ")} | HP: ${
          hp && hp !== "0" ? hp : "75% of defense"
        }.`,
      );
    } else {
      description.push("Scales unusually.");
    }

    if (this.monster.phylum) description.push(`Phylum: ${this.monster.phylum}`);

    if (this.monster.element)
      description.push(`Element: ${this.monster.element.toLowerCase()}`);

    if (this.monster.initiative === "10000")
      description.push("Always wins initiative.");
    if (this.monster.initiative === "-10000")
      description.push("Always loses initiative.");
    if (this.monster.free) description.push("Doesn't cost a turn to fight.");
    if (this.monster.nocopy) description.push("Can't be copied.");
    if (this.monster.boss) description.push("Instakill immune.");
    if (this.monster.ultrarare) description.push("Ultra-rare encounter.");

    const drops = this.getDropsDescription();
    if (drops) {
      description.push("", drops);
    }

    return description.join("\n");
  }
}
