import { Effect as DolEffect, Monster as DolMonster } from "data-of-loathing";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getEffectDescription = blueText;
  return koljs;
});

let pastaEffect: Effect;
let avatarEffect: Effect;
let barMonster: Monster;

beforeAll(async () => {
  const client = await testDb;
  const em = client.query;
  pastaEffect = new Effect(
    (await em.findOne(DolEffect, { id: 23 }, { populate: ["modifiers"] }))!,
  );
  avatarEffect = new Effect(
    (await em.findOne(DolEffect, { id: 1888 }, { populate: ["modifiers"] }))!,
  );
  barMonster = new Monster(
    (await em.findOne(DolMonster, { id: 202 }, { populate: ["drops.item"] }))!,
  );
});

describe("Effect descriptions", () => {
  test("Can describe an Effect", async () => {
    pastaEffect.pizza = { letters: "PAST", options: 2 };
    blueText.mockResolvedValueOnce({ blueText: "Mysticality +2" });
    const description = await pastaEffect.getDescription();
    expect(description).toBe(
      [
        "**Effect**",
        "(Effect 23)",
        "Mysticality +2",
        "",
        "Pizza: PAST (1 in 2)",
      ].join("\n"),
    );
  });

  test("Can describe an avatar effect", async () => {
    blueText.mockResolvedValueOnce({
      blueText: "Makes you look like a skeleton",
    });
    const description = await avatarEffect.getDescription();
    expect(description).toBe(
      [
        "**Effect**",
        "(Effect 1888)",
        "Makes you look like a skeleton",
        "",
        "Ineligible for pizza, wishes, or hookahs.",
      ].join("\n"),
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Effect", () => {
    expect(pastaEffect.hashcode()).toBe("Effect:23");
  });

  test("Compares by thing type", () => {
    expect(pastaEffect.hashcode()).not.toEqual(barMonster.hashcode());
  });
});
