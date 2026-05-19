import {
  type Monster as DolMonster,
  MonsterDropCategory,
} from "data-of-loathing";
import { bold, hyperlink } from "discord.js";
import { toWikiLink } from "kol.js";

import { inlineExpression } from "../discordUtils.js";
import { memoize } from "../utils/memoize.js";
import { Thing } from "./Thing.js";

export class Monster extends Thing<DolMonster> {
  static is(thing?: Thing | null): thing is Monster {
    return !!thing && thing instanceof Monster;
  }

  constructor(monster: DolMonster) {
    super(monster, monster.image.filter((i) => i !== null)[0] || "nopic.gif");
  }

  get copyable() {
    return !this.dol.nocopy;
  }

  getPhylumEmoji() {
    switch (this.dol.phylum?.toLowerCase()) {
      case "beast":
        return "🐺";
      case "bug":
        return "🐛";
      case "constellation":
        return "✨";
      case "construct":
        return "🤖";
      case "demon":
        return "😈";
      case "dude":
        return "🙂";
      case "elemental":
        return "🌈";
      case "elf":
        return "🧝";
      case "fish":
        return "🐟";
      case "goblin":
        return "👺";
      case "hippy":
        return "🌼";
      case "hobo":
        return "🎒";
      case "horror":
        return "😱";
      case "humanoid":
        return "🧍";
      case "mer-kin":
        return "🧜";
      case "orc":
        return "🧌";
      case "penguin":
        return "🐧";
      case "pirate":
        return "🏴‍☠️";
      case "plant":
        return "🌱";
      case "slime":
        return "🦠";
      case "undead":
        return "🧟";
      case "weird":
        return "🌀";
    }
    return "⁉️";
  }

  getElementEmoji() {
    switch (this.dol.element?.toLowerCase()) {
      case "hot":
        return "🔥";
      case "cold":
        return "❄️";
      case "stench":
        return "💨";
      case "spooky":
        return "💀";
      case "sleaze":
        return "🍆";
    }
    return "⁉️";
  }

  getImagePath() {
    if (this.imageUrl.includes("/")) return `/${this.imageUrl}`;
    return `/adventureimages/${this.imageUrl}`;
  }

  private getDropsDescription() {
    const meat = this.dol.meat;
    const drops = this.dol.drops.getItems();

    if (!drops.length && !meat) return null;

    const description = ["Drops:"];

    if (meat) {
      description.push(`${meat} (±${Math.floor(meat * 0.2)}) meat`);
    }

    const dropDescriptions = new Map<string, number>();

    for (const drop of drops) {
      const itemName = drop.item?.name;
      if (!itemName) continue;
      const dropDetails: string[] = [];
      if (drop.category === MonsterDropCategory.Accordion) {
        dropDetails.push("Stealable accordion");
      } else {
        dropDetails.push(drop.rate > 0 ? `${drop.rate}%` : "Sometimes");
        if (drop.category === MonsterDropCategory.PickpocketOnly)
          dropDetails.push("pickpocket only");
        if (drop.category === MonsterDropCategory.NoPickpocket)
          dropDetails.push("can't be stolen");
        if (drop.category === MonsterDropCategory.Conditional)
          dropDetails.push("conditional");
        if (drop.category === MonsterDropCategory.Fixed)
          dropDetails.push("unaffected by item drop modifiers");
      }

      const dropDescription = `${hyperlink(itemName, toWikiLink(itemName))} (${dropDetails.join(", ")})`;
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

  @memoize()
  async getDescription(): Promise<string> {
    const description = [bold("Monster"), `(Monster ${this.id})`];

    const atk = this.dol.attack;
    const def = this.dol.defence;
    const hp = this.dol.hp;
    const scale = this.dol.scaling;

    if (atk && atk !== "0" && def && def !== "0" && hp && hp !== "0") {
      description.push(
        `Attack: ${inlineExpression(atk)} | Defense: ${inlineExpression(def)} | HP: ${inlineExpression(hp)}`,
      );
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
      if (this.dol.scalingFloor !== "0")
        scaleBounds.push(`min ${this.dol.scalingFloor}`);
      if (this.dol.scalingCap !== "0")
        scaleBounds.push(`max ${this.dol.scalingCap}`);
      if (scaleBounds.length > 0)
        scaleDetails.push(`(${scaleBounds.join(", ")})`);

      description.push(
        `Scales to ${scaleDetails.join(" ")} | HP: ${hp && hp !== "0" ? inlineExpression(hp) : "75% of defense"}.`,
      );
    } else {
      description.push("Scales unusually.");
    }

    if (this.dol.phylum)
      description.push(`Phylum: ${this.dol.phylum} ${this.getPhylumEmoji()}`);
    if (this.dol.element)
      description.push(
        `Element: ${this.dol.element.toLowerCase()} ${this.getElementEmoji()}`,
      );
    if (this.dol.initiative === "10000")
      description.push("Always wins initiative.");
    if (this.dol.initiative === "-10000")
      description.push("Always loses initiative.");
    if (this.dol.free) description.push("Doesn't cost a turn to fight.");
    if (this.dol.nocopy) description.push("Can't be copied.");
    if (this.dol.boss) description.push("Instakill immune.");
    if (this.dol.ultrarare) description.push("Ultra-rare encounter.");

    const drops = this.getDropsDescription();
    if (drops) description.push("", drops);

    return Promise.resolve(description.join("\n"));
  }
}
