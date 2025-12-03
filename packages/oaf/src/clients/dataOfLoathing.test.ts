import { describe, expect, test } from "vitest";

import { Monster } from "../things/Monster.js";
import { dataOfLoathingClient } from "./dataOfLoathing.js";

describe("Wiki link", () => {
  test("Hermit", () => {
    const monster = new Monster({
      id: 1781,
      ambiguous: false,
      article: "undefined",
      attack: "100",
      boss: true,
      defence: "100",
      element: null,
      drippy: false,
      elementalAttack: "HOT",
      elementalDefence: null,
      elementalResistance: "0",
      experience: null,
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "100",
      image: ["otherimages/hermit.gif"],
      initiative: "100",
      itemBlockChance: 0,
      lucky: false,
      manuel: null,
      meat: 0,
      meatExpression: null,
      monsterLevelMultiplier: "1",
      name: "The Hermit",
      nobanish: false,
      nocopy: true,
      nomanuel: true,
      nodeId: "WyJtb25zdGVycyIsMTc4MV0=",
      nowander: false,
      nowish: false,
      phylum: "dude",
      physicalResistance: "0",
      poison: null,
      scaling: "0",
      scalingFloor: "0",
      scalingCap: "0",
      skillBlockChance: 0,
      snake: false,
      sprinkles: ["0", "0"],
      spellBlockChance: 0,
      superlikely: false,
      ultrarare: false,
      wanderer: false,
      wiki: "Hermit (monster)",
      wish: false,
      monsterDropsByMonster: {
        nodes: [],
      },
      nativeMonstersByMonster: {
        nodes: [],
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
          __typename: "PageInfo",
        },
        totalCount: 0,
        __typename: "NativeMonstersConnection",
      },
    });

    const link = dataOfLoathingClient.getWikiLink(monster);

    expect(link).toBe(
      "https://wiki.kingdomofloathing.com/Hermit_%28monster%29",
    );
  });
});
