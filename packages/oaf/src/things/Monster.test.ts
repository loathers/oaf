/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { MonsterDropCategory } from "data-of-loathing";
import { dedent } from "ts-dedent";
import { describe, expect, test } from "vitest";

import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

function makeMonster(overrides: Record<string, unknown>) {
  return {
    ambiguous: false,
    article: "a",
    boss: false,
    attack: "0",
    defence: "0",
    drippy: false,
    elementalResistance: "0",
    free: false,
    ghost: false,
    groupSize: 1,
    hp: "0",
    initiative: "0",
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

describe("Monster description", () => {
  test("Monsters with copied drops are described successfully", async () => {
    const monster = new Monster(
      makeMonster({
        id: 996,
        name: "drunken rat king",
        image: ["ratking.gif"],
        attack: "40",
        defence: "36",
        hp: "32",
        initiative: "100",
        meat: 40,
        nocopy: true,
        drops: {
          getItems: () => [
            {
              item: { name: "rat whisker", id: 197 },
              rate: 100,
              category: undefined,
            },
            {
              item: { name: "rat whisker", id: 197 },
              rate: 100,
              category: undefined,
            },
            {
              item: { name: "rat whisker", id: 197 },
              rate: 0,
              category: undefined,
            },
            {
              item: { name: "rat whisker", id: 197 },
              rate: 0,
              category: undefined,
            },
            {
              item: { name: "rat appendix", id: 198 },
              rate: 20,
              category: undefined,
            },
            {
              item: { name: "rat appendix", id: 198 },
              rate: 20,
              category: undefined,
            },
            {
              item: { name: "rat appendix", id: 198 },
              rate: 20,
              category: undefined,
            },
            {
              item: { name: "tangle of rat tails", id: 4736 },
              rate: 100,
              category: undefined,
            },
          ],
        },
      }),
    );

    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 996)
        Attack: 40 | Defense: 36 | HP: 32
        Phylum: beast 🐺
        Can't be copied.

        Drops:
        40 (±8) meat
        2x [rat whisker](https://wiki.kingdomofloathing.com/rat_whisker) (100%)
        2x [rat whisker](https://wiki.kingdomofloathing.com/rat_whisker) (Sometimes)
        3x [rat appendix](https://wiki.kingdomofloathing.com/rat_appendix) (20%)
        [tangle of rat tails](https://wiki.kingdomofloathing.com/tangle_of_rat_tails) (100%)
      `,
    );
  });

  test("Monsters with capped scaling are described successfully", async () => {
    const monster = new Monster(
      makeMonster({
        id: 1768,
        name: "Gurgle the Turgle",
        image: ["animturtle.gif"],
        element: "stench",
        initiative: "-10000",
        phylum: "construct",
        scaling: "[5+20*pref(dinseyAudienceEngagement)]",
        scalingCap: "11111",
        scalingFloor: "100",
        drops: {
          getItems: () => [
            {
              item: { name: "turtle voicebox", id: 8230 },
              rate: 15,
              category: undefined,
            },
            {
              item: { name: "fake washboard", id: 8231 },
              rate: 0.1,
              category: MonsterDropCategory.Conditional,
            },
          ],
        },
      }),
    );

    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1768)
        Scales to something weird (min 100, max 11111) | HP: 75% of defense.
        Phylum: construct 🤖
        Element: stench 💨
        Always loses initiative.

        Drops:
        [turtle voicebox](https://wiki.kingdomofloathing.com/turtle_voicebox) (15%)
        [fake washboard](https://wiki.kingdomofloathing.com/fake_washboard) (0.1%, conditional)
      `,
    );
  });

  test("Monsters with normal scaling are described successfully", async () => {
    const monster = new Monster(
      makeMonster({
        id: 1162,
        name: "clan of cave bars",
        image: ["cavebars.gif"],
        initiative: "-10000",
        meat: 400,
        nocopy: true,
        scaling: "20",
        scalingCap: "200",
        scalingFloor: "30",
      }),
    );

    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1162)
        Scales to your stats plus 20 (min 30, max 200) | HP: 75% of defense.
        Phylum: beast 🐺
        Always loses initiative.
        Can't be copied.

        Drops:
        400 (±80) meat
      `,
    );
  });

  test("Monsters who scale unusally are described successfully", async () => {
    const monster = new Monster(
      makeMonster({
        id: -89,
        name: "Count Drunkula (Hard Mode)",
        image: ["drunkula_hm.gif"],
        phylum: "undead",
        nocopy: true,
        drops: {
          getItems: () => [
            {
              item: { name: "Thunkula's drinking cap", id: 6469 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "Drunkula's cape", id: 6470 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "Drunkula's silky pants", id: 6471 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "Drunkula's ring of haze", id: 6473 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "Drunkula's wineglass", id: 6474 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "Drunkula's bell", id: 6472 },
              rate: 100,
              category: MonsterDropCategory.Conditional,
            },
            {
              item: { name: "skull capacitor", id: 6512 },
              rate: 100,
              category: undefined,
            },
          ],
        },
      }),
    );

    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster -89)
        Scales unusually.
        Phylum: undead 🧟
        Can't be copied.

        Drops:
        [Thunkula's drinking cap](https://wiki.kingdomofloathing.com/Thunkula's_drinking_cap) (100%, conditional)
        [Drunkula's cape](https://wiki.kingdomofloathing.com/Drunkula's_cape) (100%, conditional)
        [Drunkula's silky pants](https://wiki.kingdomofloathing.com/Drunkula's_silky_pants) (100%, conditional)
        [Drunkula's ring of haze](https://wiki.kingdomofloathing.com/Drunkula's_ring_of_haze) (100%, conditional)
        [Drunkula's wineglass](https://wiki.kingdomofloathing.com/Drunkula's_wineglass) (100%, conditional)
        [Drunkula's bell](https://wiki.kingdomofloathing.com/Drunkula's_bell) (100%, conditional)
        [skull capacitor](https://wiki.kingdomofloathing.com/skull_capacitor) (100%)
      `,
    );
  });

  test("Monsters with a stealable accordion are described successfully", async () => {
    const monster = new Monster(
      makeMonster({
        id: 202,
        name: "bar",
        image: ["bar.gif"],
        attack: "3",
        defence: "2",
        hp: "5",
        initiative: "50",
        meat: 15,
        drops: {
          getItems: () => [
            {
              item: { name: "bar skin", id: 70 },
              rate: 35,
              category: undefined,
            },
            {
              item: { name: "baritone accordion", id: 6811 },
              rate: 100,
              category: MonsterDropCategory.Accordion,
            },
          ],
        },
      }),
    );

    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 202)
        Attack: 3 | Defense: 2 | HP: 5
        Phylum: beast 🐺

        Drops:
        15 (±3) meat
        [bar skin](https://wiki.kingdomofloathing.com/bar_skin) (35%)
        [baritone accordion](https://wiki.kingdomofloathing.com/baritone_accordion) (Stealable accordion)
      `,
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Monsters", () => {
    const data = makeMonster({
      id: 202,
      name: "bar",
      image: ["bar.gif"],
      attack: "3",
      defence: "2",
      hp: "5",
      initiative: "50",
      meat: 15,
    });
    const a = new Monster(data);
    const b = new Monster(data);

    expect(a.hashcode()).toBe("Monster:202");
    expect(a.hashcode()).toEqual(b.hashcode());
  });

  test("Compares by thing type", () => {
    const a = new Monster(
      makeMonster({ id: 202, name: "bar", image: ["bar.gif"] }),
    );
    const b = new Effect({
      id: 202,
      image: "scwad.gif",
      name: "Spooky Demeanor",
      descid: "89099ac4df5c9d8171b4930a79feaeae",
      nohookah: false,
      nopvp: false,
      noremove: false,
      song: false,
      actions: [],
      ambiguous: false,
      quality: "good",
    } as any);

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});
