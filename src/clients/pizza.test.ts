import { Effect as DolEffect } from "data-of-loathing";
import { beforeAll, describe, expect, test } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Effect } from "../things/Effect.js";
import { PizzaTree } from "./pizza.js";

let hookahEffect: Effect;
let avatarEffect: Effect;

beforeAll(async () => {
  const client = await testDb;
  const em = client.query;
  // Effect 23: hookah-eligible
  hookahEffect = new Effect(
    (await em.findOne(DolEffect, { id: 23 }, { populate: ["modifiers"] }))!,
  );
  // Effect 1888: avatar (hookah-ineligible)
  avatarEffect = new Effect(
    (await em.findOne(DolEffect, { id: 1888 }, { populate: ["modifiers"] }))!,
  );
});

describe("PizzaTree degraded mode (empty data)", () => {
  test("findPizzas returns no options when tree is empty", () => {
    const tree = new PizzaTree();
    tree.build(new Map());
    const [options] = tree.findPizzas("past");
    expect(options).toHaveLength(0);
  });

  test("findPizzas returns no options for any input when tree is empty", () => {
    const tree = new PizzaTree();
    tree.build(new Map());
    const [options] = tree.findPizzas("a");
    expect(options).toHaveLength(0);
  });
});

describe("PizzaTree with data", () => {
  test("hookah-eligible effect is reachable by its first letter", () => {
    const tree = new PizzaTree();
    tree.build(new Map([[hookahEffect.name.toLowerCase(), hookahEffect]]));
    const firstLetter = hookahEffect.name.toLowerCase().charAt(0);
    const [options] = tree.findPizzas(firstLetter);
    expect(options).toContain(hookahEffect);
  });

  test("avatar (hookah-ineligible) effect is never added to the tree", () => {
    const tree = new PizzaTree();
    tree.build(
      new Map([
        [hookahEffect.name.toLowerCase(), hookahEffect],
        [avatarEffect.name.toLowerCase(), avatarEffect],
      ]),
    );
    const [allOptions] = tree.findPizzas("");
    expect(allOptions).toContain(hookahEffect);
    expect(allOptions).not.toContain(avatarEffect);
  });

  test("precalculate sets pizza metadata on effects", () => {
    const tree = new PizzaTree();
    tree.build(new Map([[hookahEffect.name.toLowerCase(), hookahEffect]]));
    // Uncontested effect needs no disambiguating letters
    expect(hookahEffect.pizza).toEqual({ letters: "", options: 1 });
  });
});
