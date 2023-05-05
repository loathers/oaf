import axios from "axios";
import dedent from "ts-dedent";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { kolClient } from "../clients/kol";
import { respondWithFixture } from "../testUtils";
import { Item } from "./Item";

vi.mock("axios");

beforeAll(() => {
  kolClient.mockLoggedIn = true;
});

afterAll(() => {
  kolClient.mockLoggedIn = false;
});

afterEach(() => {
  vi.mocked(axios).mockReset();
});

describe("Food", () => {
  test("Can describe a food with a range of adventures", async () => {
    vi.mocked(axios)
      .mockResolvedValueOnce(await respondWithFixture(__dirname, "desc_item_tofurkey_leg.html"))
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_tofurkey_leg.html")
      );

    const item = Item.from(
      "1365	tofurkey leg	927393854	turkeyleg.gif	food	t,d	50",
      new Map([["tofurkey leg", "tofurkey leg	3	5	awesome	7-14	70-74	0	0".split("	")]])
    );

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 1365)
        **Awesome food** (Size 3, requires level 5)
        7-14 adventures (Average 10.5 adventures, 3.5 per fullness)

        Autosell value: 50 meat.
        Mall Price: [502 meat](https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=1365&timespan=1&noanim=0)
      `
    );
  });

  test("Can describe a food with a set number of adventures", async () => {
    vi.mocked(axios)
      .mockResolvedValueOnce(await respondWithFixture(__dirname, "desc_item_alien_meat.html"))
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_alien_meat.html")
      );

    const item = Item.from(
      "9423	alien meat	672000286	alienmeat.gif	food, cook	t,d	8	pieces of alien meat",
      new Map([
        ["alien meat", "alien meat	1	1	good	3	0	0	0	gain 5 turns of a random positive effect".split("	")],
      ])
    );

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 9423)
        **Good food** (Size 1)
        3 adventures

        Gives 5 Adventures of a random positive effect
        Autosell value: 8 meat.
        Mall Price: [1,995 meat](https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=9423&timespan=1&noanim=0)
      `
    );
  });
});

describe("Equipment", () => {
  test("Can describe a shield", async () => {
    vi.mocked(axios)
      .mockResolvedValueOnce(await respondWithFixture(__dirname, "desc_item_lov_elephant.html"))
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_lov_elephant.html")
      );

    const item = Item.from(
      "9327	LOV Elephant	284967813	pl_elephant.gif	offhand	g,d	5",
      new Map([["lov elephant", ["LOV Elephant", "100", "Mus: 25", "shield"]]])
    );

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 9327)
        **Offhand Shield**
        100 power, requires 25 Muscle, Damage Reduction: 5.67
        Gift Item
        Cannot be traded.

        Damage Reduction: 10
        Autosell value: 5 meat.
      `
    );
  });
});

describe("Other", () => {
  test("Can describe a potion that is multiple use and combat usable", async () => {
    vi.mocked(axios)
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "desc_item_magical_mystery_juice.html")
      )
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_magical_mystery_juice.html")
      );

    const item = Item.from("518	magical mystery juice	400545756	potion4.gif	multiple, combat	d	50");

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 518)
        **Usable item** (also usable in combat)
        Cannot be traded.

        Restores an amount of MP that increases as you level up
        Autosell value: 50 meat.
      `
    );
  });
});