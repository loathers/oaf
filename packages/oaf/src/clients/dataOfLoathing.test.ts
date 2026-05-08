/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
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
      drippy: false,
      elementalResistance: "0",
      free: false,
      ghost: false,
      groupSize: 1,
      hp: "100",
      image: ["otherimages/hermit.gif"],
      initiative: "100",
      itemBlockChance: 0,
      lucky: false,
      meat: 0,
      monsterLevelMultiplier: "1",
      name: "The Hermit",
      nobanish: false,
      nocopy: true,
      nomanuel: true,
      nowander: false,
      nowish: false,
      phylum: "dude",
      physicalResistance: "0",
      scaling: "0",
      scalingFloor: "0",
      scalingCap: "0",
      skeleton: false,
      skillBlockChance: 0,
      snake: false,
      sprinkles: ["0", "0"],
      spellBlockChance: 0,
      superlikely: false,
      ultrarare: false,
      wanderer: false,
      wiki: "Hermit (monster)",
      wish: false,
      zombie: false,
      drops: { getItems: () => [] },
      nativeLocations: { getItems: () => [] },
    } as any);

    const link = dataOfLoathingClient.getWikiLink(monster);

    expect(link).toBe(
      "https://wiki.kingdomofloathing.com/Hermit_%28monster%29",
    );
  });
});
