/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { EffectQuality } from "data-of-loathing";
import { dedent } from "ts-dedent";
import { describe, expect, test, vi } from "vitest";

import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getEffectDescription = blueText;
  return koljs;
});

describe("Effect descriptions", () => {
  test("Can describe an Effect", async () => {
    const effect = new Effect({
      id: 23,
      image: "mandala.gif",
      name: "Pasta Oneness",
      descid: "583619abc0e4380d80629babe3677aed",
      nohookah: false,
      nopvp: false,
      noremove: false,
      song: false,
      actions: [],
      ambiguous: false,
      quality: EffectQuality.Good,
    } as any);
    effect.pizza = { letters: "PAST", options: 2 };

    blueText.mockResolvedValueOnce({ blueText: "Mysticality +2" });

    const description = await effect.getDescription();

    expect(description).toBe(
      dedent`
        **Effect**
        (Effect 23)
        Mysticality +2

        Pizza: PAST (1 in 2)
      `,
    );
  });

  test("Can describe an avatar effect", async () => {
    const effect = new Effect({
      id: 1888,
      image: "handmirror.gif",
      name: "The Visible Adventurer",
      descid: "a38d91d52ace7992b899402e9704d86d",
      nohookah: false,
      nopvp: false,
      noremove: false,
      song: false,
      actions: [],
      ambiguous: false,
      quality: EffectQuality.Neutral,
      modifiers: { modifiers: { Avatar: '"skeleton"' } },
    } as any);

    blueText.mockResolvedValueOnce({
      blueText: "Makes you look like a skeleton",
    });

    const description = await effect.getDescription();

    expect(description).toBe(
      dedent`
        **Effect**
        (Effect 1888)
        Makes you look like a skeleton

        Ineligible for pizza, wishes, or hookahs.
      `,
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Effect", () => {
    const data = {
      id: 23,
      image: "mandala.gif",
      name: "Pasta Oneness",
      descid: "583619abc0e4380d80629babe3677aed",
      nohookah: false,
      nopvp: false,
      noremove: false,
      song: false,
      actions: [],
      ambiguous: false,
      quality: EffectQuality.Good,
    };
    const a = new Effect(data as any);
    const b = new Effect(data as any);

    expect(a.hashcode()).toBe("Effect:23");
    expect(a.hashcode()).toEqual(b.hashcode());
  });

  test("Compares by thing type", () => {
    const a = new Effect({
      id: 23,
      image: "mandala.gif",
      name: "Pasta Oneness",
      descid: "583619abc0e4380d80629babe3677aed",
      nohookah: false,
      nopvp: false,
      noremove: false,
      song: false,
      actions: [],
      ambiguous: false,
      quality: EffectQuality.Good,
    } as any);
    const b = new Monster(
      makeMonster({ id: 202, name: "bar", image: ["bar.gif"] }),
    );

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});

function makeMonster(overrides: Record<string, unknown>) {
  return {
    ambiguous: false,
    article: "a",
    boss: false,
    attack: "3",
    defence: "2",
    drippy: false,
    elementalResistance: "0",
    free: false,
    ghost: false,
    groupSize: 1,
    hp: "5",
    initiative: "50",
    itemBlockChance: 0,
    lucky: false,
    monsterLevelMultiplier: "1",
    nobanish: false,
    nocopy: false,
    nomanuel: false,
    nowander: false,
    nowish: false,
    phylum: "beast",
    physicalResistance: "0",
    scaling: "0",
    scalingCap: "0",
    scalingFloor: "0",
    skeleton: false,
    skillBlockChance: 0,
    snake: false,
    spellBlockChance: 0,
    sprinkles: ["0", "0"] as [string, string],
    superlikely: false,
    ultrarare: false,
    wanderer: false,
    wish: false,
    zombie: false,
    drops: { getItems: () => [] },
    nativeLocations: { getItems: () => [] },
    ...overrides,
  } as any;
}
