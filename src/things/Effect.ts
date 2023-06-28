import { bold } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { cleanString } from "../utils/index.js";
import { Thing } from "./Thing.js";

export type EffectData = {
  id: number;
  name: string;
  imageUrl: string;
  descId: string;
  quality: string;
  hookah: boolean;
};

export type PizzaData = {
  letters: string;
  options: number;
};

export class Effect extends Thing {
  static is(thing?: Thing | null): thing is Effect {
    return !!thing && thing instanceof Effect;
  }

  static from(line: string, avatarPotions = new Set<string>()): Effect {
    const parts = line.split(/\t/);
    if (parts.length < 6) throw "Invalid data";

    const potion = parts[6]?.startsWith("use 1") ? parts[6].slice(6) : null;
    const isAvatar = potion && avatarPotions.delete(potion.toLowerCase());

    return new Effect(
      parseInt(parts[0]),
      cleanString(parts[1]),
      parts[2],
      parts[3],
      parts[4],
      !isAvatar && !parts[5].includes("nohookah") && parts[4] !== "bad"
    );
  }

  readonly descId: string;
  readonly quality: string;
  readonly hookah: boolean;
  pizza?: PizzaData;

  constructor(
    id: number,
    name: string,
    imageUrl: string,
    descId: string,
    quality: string,
    hookah: boolean
  ) {
    super(id, name, imageUrl);
    this.descId = descId;
    this.quality = quality;
    this.hookah = hookah;
  }

  describePizzaCompatibility() {
    if (!this.hookah) return "Ineligible for pizza, wishes, or hookahs.";
    if (!this.pizza)
      return "Pizza: If you are reading this, Captain 'Jalen' Scotch has hecked something up. Please ping him.";

    const options = this.pizza.options === 1 ? "Uncontested" : `1 in ${this.pizza.options}`;
    return `Pizza: ${this.pizza.letters.padEnd(4, "✱")} (${options})`;
  }

  @Memoize()
  async getDescription() {
    return [
      bold("Effect"),
      `(Effect ${this.id})`,
      await kolClient.getEffectDescription(this.descId),
      "",
      this.describePizzaCompatibility(),
    ].join("\n");
  }
}
