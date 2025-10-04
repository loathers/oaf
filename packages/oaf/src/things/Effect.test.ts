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
      quality: "GOOD",
      effectModifierByEffect: null,
    });
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
      quality: "NEUTRAL",
      effectModifierByEffect: {
        modifiers: {
          Avatar: '"skeleton"',
        },
      },
    });

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
      quality: "GOOD" as const,
      effectModifierByEffect: null,
    };
    const a = new Effect(data);
    const b = new Effect(data);

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
      quality: "GOOD",
      effectModifierByEffect: null,
    });
    const b = new Monster({
      ambiguous: false,
      article: "a",
      boss: false,
      attack: "3",
      defence: "2",
      elementalDefence: "COLD",
      drippy: false,
      element: "COLD",
      elementalAttack: "COLD",
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "5",
      id: 202,
      image: ["bar.gif"],
      initiative: "50",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 15,
      meatExpression: "15",
      monsterDropsByMonster: {
        nodes: [
          {
            category: null,
            rate: 35,
            itemByItem: {
              name: "bar skin",
              id: 70,
            },
          },
          {
            category: "A",
            rate: 100,
            itemByItem: {
              name: "baritone accordion",
              id: 6811,
            },
          },
        ],
      },
      monsterLevelMultiplier: "1",
      name: "bar",
      nobanish: false,
      nocopy: false,
      nodeId: "WyJtb25zdGVycyIsMjAyXQ==",
      nomanuel: false,
      nowander: false,
      nowish: false,
      phylum: "beast",
      physicalResistance: "0",
      poison: null,
      scaling: "0",
      scalingCap: "0",
      scalingFloor: "0",
      snake: false,
      skillBlockChance: 0,
      spellBlockChance: 0,
      sprinkles: ["0", "0"],
      superlikely: false,
      ultrarare: false,
      wanderer: false,
      wiki: null,
      wish: false,
    });

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});
