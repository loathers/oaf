import axios from "axios";
import { dedent } from "ts-dedent";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { kolClient } from "../clients/kol.js";
import { respondWithFixture } from "../testUtils.js";
import { Item } from "./Item.js";

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

describe("Foldable", () => {
  test("Can describe a foldable", async () => {
    vi.mocked(axios)
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "desc_item_turtle_wax_shield.html")
      )
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_turtle_wax_shield.html")
      )
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_turtle_wax_shield.html")
      )
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_turtle_wax_helmet.html")
      )
      .mockResolvedValueOnce(
        await respondWithFixture(__dirname, "backoffice_prices_turtle_wax_greaves.html")
      );

    const itemMeta = new Map([
      ["turtle wax helmet", ["turtle wax helmet", "40", "Mox: 5"]],
      ["turtle wax greaves", ["turtle wax greaves", "40", "Mox: 5"]],
      ["turtle wax shield", ["turtle wax shield", "40", "Mus: 5", "shield"]],
    ]);

    const item = Item.from(
      "3915	turtle wax shield	490908351	waxshield.gif	offhand, usable	t,d	7",
      itemMeta
    );

    const group = [
      item,
      Item.from("3916	turtle wax helmet	760962787	waxhat.gif	hat, usable	t,d	7", itemMeta),
      Item.from(
        "3917	turtle wax greaves	649657203	waxgreaves.gif	pants, usable	t,d	7	pairs of turtle wax greaves",
        itemMeta
      ),
    ];

    item.foldGroup = group;

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 3915)
        **Offhand Shield**
        40 power, requires 5 Muscle, Damage Reduction: 1.67

        Maximum HP +10
        Autosell value: 7 meat.
        Mall Price: [500 meat](https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=3915&timespan=1&noanim=0)
        Folds into: [turtle wax helmet](https://kol.coldfront.net/thekolwiki/index.php/turtle_wax_helmet), [turtle wax greaves](https://kol.coldfront.net/thekolwiki/index.php/turtle_wax_greaves)
        (Cheapest: [turtle wax helmet](https://kol.coldfront.net/thekolwiki/index.php/turtle_wax_helmet) @ [100 meat](https://g1wjmf0i0h.execute-api.us-east-2.amazonaws.com/default/itemgraph?itemid=3916&timespan=1&noanim=0))
      `
    );
  });
});
