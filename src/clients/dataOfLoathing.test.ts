import { Monster as DolMonster } from "data-of-loathing";
import { beforeAll, describe, expect, test } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Monster } from "../things/Monster.js";
import { dataOfLoathingClient } from "./dataOfLoathing.js";

let hermit: Monster;

beforeAll(async () => {
  const client = await testDb;
  const dolMonster = await client.query.findOne(
    DolMonster,
    { id: 1781 },
    { populate: ["drops.item"] },
  );
  hermit = new Monster(dolMonster!);
});

describe("Wiki link", () => {
  test("Hermit", () => {
    const link = dataOfLoathingClient.getWikiLink(hermit);
    expect(link).toBe(
      "https://wiki.kingdomofloathing.com/Hermit_%28monster%29",
    );
  });
});
