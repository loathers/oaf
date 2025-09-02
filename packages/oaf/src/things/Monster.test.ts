import { dedent } from "ts-dedent";
import { describe, expect, test } from "vitest";

import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

describe("Monster description", () => {
  test("Monsters with copied drops are described successfully", async () => {
    const monster = new Monster({
      ambiguous: false,
      article: "a",
      boss: false,
      attack: "40",
      defence: "36",
      elementalDefence: "COLD",
      drippy: false,
      element: "COLD",
      elementalAttack: "COLD",
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "32",
      id: 996,
      image: ["ratking.gif"],
      initiative: "100",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 40,
      meatExpression: "40",
      monsterDropsByMonster: {
        nodes: [
          {
            category: null,
            rate: 100,
            itemByItem: {
              name: "rat whisker",
              id: 197,
            },
          },
          {
            category: null,
            rate: 100,
            itemByItem: {
              name: "rat whisker",
              id: 197,
            },
          },
          {
            category: null,
            rate: 0,
            itemByItem: {
              name: "rat whisker",
              id: 197,
            },
          },
          {
            category: null,
            rate: 0,
            itemByItem: {
              name: "rat whisker",
              id: 197,
            },
          },
          {
            category: null,
            rate: 20,
            itemByItem: {
              name: "rat appendix",
              id: 198,
            },
          },
          {
            category: null,
            rate: 20,
            itemByItem: {
              name: "rat appendix",
              id: 198,
            },
          },
          {
            category: null,
            rate: 20,
            itemByItem: {
              name: "rat appendix",
              id: 198,
            },
          },
          {
            category: null,
            rate: 100,
            itemByItem: {
              name: "tangle of rat tails",
              id: 4736,
            },
          },
        ],
      },
      monsterLevelMultiplier: "1",
      name: "drunken rat king",
      nobanish: false,
      nocopy: true,
      nodeId: "WyJtb25zdGVycyIsOTk2XQ==",
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
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 996)
        Attack: 40 | Defense: 36 | HP: 32
        Phylum: beast
        Can't be copied.

        Drops:
        40 (±8) meat
        4x [rat whisker](https://kol.coldfront.net/thekolwiki/index.php/rat_whisker) (100%)
        [tangle of rat tails](https://kol.coldfront.net/thekolwiki/index.php/tangle_of_rat_tails) (100%)
        3x [rat appendix](https://kol.coldfront.net/thekolwiki/index.php/rat_appendix) (20%)
      `,
    );
  });

  test("Monsters with capped scaling are described successfully", async () => {
    const monster = new Monster({
      ambiguous: false,
      article: "undefined",
      boss: false,
      attack: "0",
      defence: "0",
      elementalDefence: "COLD",
      drippy: false,
      element: "STENCH",
      elementalAttack: "COLD",
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "0",
      id: 1768,
      image: ["animturtle.gif"],
      initiative: "-10000",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 0,
      meatExpression: null,
      monsterDropsByMonster: {
        nodes: [
          {
            category: null,
            rate: 15,
            itemByItem: {
              name: "turtle voicebox",
              id: 8230,
            },
          },
        ],
      },
      monsterLevelMultiplier: "[3+2*pref(dinseyAudienceEngagement)]",
      name: "Gurgle the Turgle",
      nobanish: true,
      nocopy: false,
      nodeId: "WyJtb25zdGVycyIsMTc2OF0=",
      nomanuel: false,
      nowander: false,
      nowish: false,
      phylum: "construct",
      physicalResistance: "0",
      poison: null,
      scaling: "[5+20*pref(dinseyAudienceEngagement)]",
      scalingCap: "11111",
      scalingFloor: "100",
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
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1768)
        Scales to something weird (min 100, max 11111) | HP: 75% of defense.
        Phylum: construct
        Element: stench
        Always loses initiative.

        Drops:
        [turtle voicebox](https://kol.coldfront.net/thekolwiki/index.php/turtle_voicebox) (Sometimes)
        [fake washboard](https://kol.coldfront.net/thekolwiki/index.php/fake_washboard) (Sometimes, conditional)
      `,
    );
  });

  test("Monsters with normal scaling are described successfully", async () => {
    const monster = new Monster({
      ambiguous: false,
      article: "a",
      boss: false,
      attack: "0",
      defence: "0",
      elementalDefence: "COLD",
      drippy: false,
      element: "COLD",
      elementalAttack: "COLD",
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 10,
      hp: "0",
      id: 1162,
      image: ["cavebars.gif"],
      initiative: "-10000",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 400,
      meatExpression: "400",
      monsterDropsByMonster: {
        nodes: [],
      },
      monsterLevelMultiplier: "5",
      name: "clan of cave bars",
      nobanish: false,
      nocopy: true,
      nodeId: "WyJtb25zdGVycyIsMTE2Ml0=",
      nomanuel: false,
      nowander: false,
      nowish: false,
      phylum: "beast",
      physicalResistance: "0",
      poison: null,
      scaling: "20",
      scalingCap: "200",
      scalingFloor: "30",
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
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1162)
        Scales to your stats plus 20 (min 30, max 200) | HP: 75% of defense.
        Phylum: beast
        Always loses initiative.
        Can't be copied.

        Drops:
        400 (±80) meat
      `,
    );
  });

  test("Monsters who scale unusally are described successfully", async () => {
    const monster = new Monster({
      ambiguous: false,
      article: "undefined",
      boss: false,
      attack: "0",
      defence: "0",
      elementalDefence: "COLD",
      drippy: false,
      element: "COLD",
      elementalAttack: "COLD",
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "0",
      id: -89,
      image: ["drunkula_hm.gif"],
      initiative: "0",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 0,
      meatExpression: null,
      monsterDropsByMonster: {
        nodes: [
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Thunkula's drinking cap",
              id: 6469,
            },
          },
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Drunkula's cape",
              id: 6470,
            },
          },
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Drunkula's silky pants",
              id: 6471,
            },
          },
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Drunkula's ring of haze",
              id: 6473,
            },
          },
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Drunkula's wineglass",
              id: 6474,
            },
          },
          {
            category: "C",
            rate: 100,
            itemByItem: {
              name: "Drunkula's bell",
              id: 6472,
            },
          },
          {
            category: null,
            rate: 100,
            itemByItem: {
              name: "skull capacitor",
              id: 6512,
            },
          },
        ],
      },
      monsterLevelMultiplier: "1",
      name: "Count Drunkula (Hard Mode)",
      nobanish: false,
      nocopy: true,
      nodeId: "WyJtb25zdGVycyIsLTg5XQ==",
      nomanuel: true,
      nowander: false,
      nowish: false,
      phylum: "undead",
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
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster -89)
        Scales unusually.
        Phylum: undead
        Can't be copied.

        Drops:
        [Thunkula's drinking cap](https://kol.coldfront.net/thekolwiki/index.php/Thunkula's_drinking_cap) (Sometimes, conditional)
        [Drunkula's cape](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_cape) (Sometimes, conditional)
        [Drunkula's silky pants](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_silky_pants) (Sometimes, conditional)
        [Drunkula's ring of haze](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_ring_of_haze) (Sometimes, conditional)
        [Drunkula's wineglass](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_wineglass) (Sometimes, conditional)
      `,
    );
  });

  test("Monsters with a stealable accordion are described successfully", async () => {
    const monster = new Monster({
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
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 202)
        Attack: 3 | Defense: 2 | HP: 5
        Phylum: beast

        Drops:
        15 (±3) meat
        [bar skin](https://kol.coldfront.net/thekolwiki/index.php/bar_skin) (35%)
        [baritone accordion](https://kol.coldfront.net/thekolwiki/index.php/baritone_accordion) (Stealable accordion)
      `,
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Monsters", () => {
    const data = {
      ambiguous: false,
      article: "a",
      boss: false,
      attack: "3",
      defence: "2",
      elementalDefence: "COLD" as const,
      drippy: false,
      element: "COLD" as const,
      elementalAttack: "COLD" as const,
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
            category: "A" as const,
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
    };
    const a = new Monster(data);
    const b = new Monster(data);

    expect(a.hashcode()).toBe("Monster:202");
    expect(a.hashcode()).toEqual(b.hashcode());
  });

  test("Compares by thing type", () => {
    const a = new Monster({
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
    const b = new Effect({
      id: 202,
      image: "scwad.gif",
      name: "Spooky Demeanor",
      descid: "89099ac4df5c9d8171b4930a79feaeae",
      nohookah: false,
      quality: "GOOD",
      effectModifierByEffect: null,
    });

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});
