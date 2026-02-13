import { bold } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { Thing } from "./Thing.js";
import { TData } from "./query.js";

export type PizzaData = {
  letters: string;
  options: number;
};

export type TEffect = NonNullable<
  NonNullable<TData["allEffects"]>["nodes"][number]
>;

export class Effect extends Thing {
  static is(thing?: Thing | null): thing is Effect {
    return !!thing && thing instanceof Effect;
  }

  private effect: TEffect;
  readonly hookah: boolean;
  pizza?: PizzaData;

  constructor(effect: TEffect) {
    super(effect.id, effect.name, effect.image);
    this.effect = effect;
    this.hookah =
      !("Avatar" in (effect.effectModifierByEffect?.modifiers ?? {})) &&
      !effect.nohookah &&
      effect.quality !== "BAD";
  }

  getModifiers(): Record<string, string> {
    return (this.effect.effectModifierByEffect?.modifiers ?? {}) as Record<
      string,
      string
    >;
  }

  describePizzaCompatibility() {
    if (!this.hookah) return "Ineligible for pizza, wishes, or hookahs.";
    if (!this.pizza) return "Pizza: Something is broken.";

    const options =
      this.pizza.options === 1 ? "Uncontested" : `1 in ${this.pizza.options}`;
    return `Pizza: ${this.pizza.letters.padEnd(4, "✱")} (${options})`;
  }

  @Memoize()
  async getDescription() {
    if (!this.effect.descid) return "This effect seems to have no description";
    const { blueText } = await kolClient.getEffectDescription(
      this.effect.descid,
    );
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
