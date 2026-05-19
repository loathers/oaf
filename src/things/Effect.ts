import {
  type Effect as DolEffect,
  EffectQuality,
  getModifier,
} from "data-of-loathing";
import { bold } from "discord.js";

import { kolClient } from "../clients/kol.js";
import { memoize } from "../utils/memoize.js";
import { Thing } from "./Thing.js";

export type PizzaData = {
  letters: string;
  options: number;
};

export class Effect extends Thing<DolEffect> {
  readonly hookah: boolean;
  pizza?: PizzaData;

  static is(thing?: Thing | null): thing is Effect {
    return !!thing && thing instanceof Effect;
  }

  constructor(effect: DolEffect) {
    super(effect, effect.image);
    this.hookah =
      !getModifier(effect.modifiers?.modifiers ?? [], "Avatar") &&
      !effect.nohookah &&
      effect.quality !== EffectQuality.Bad;
  }

  describePizzaCompatibility() {
    if (!this.hookah) return "Ineligible for pizza, wishes, or hookahs.";
    if (!this.pizza) return "Pizza: Something is broken.";

    const options =
      this.pizza.options === 1 ? "Uncontested" : `1 in ${this.pizza.options}`;
    return `Pizza: ${this.pizza.letters.padEnd(4, "✱")} (${options})`;
  }

  @memoize()
  async getDescription() {
    if (!this.dol.descid) return "This effect seems to have no description";
    const { blueText } = await kolClient.getEffectDescription(this.dol.descid);
    return [
      bold("Effect"),
      `(Effect ${this.id})`,
      blueText || null,
      "",
      this.describePizzaCompatibility(),
    ]
      .filter((l) => l !== null)
      .join("\n");
  }
}
