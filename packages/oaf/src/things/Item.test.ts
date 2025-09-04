import { dedent } from "ts-dedent";
import { describe, expect, test, vi } from "vitest";

import { Item } from "./Item.js";

const { mallPrice, blueText } = vi.hoisted(() => ({
  blueText: vi.fn().mockResolvedValue({ blueText: "" }),
  mallPrice: vi.fn().mockResolvedValue({
    formattedMallPrice: "1",
    formattedLimitedMallPrice: "2",
    formattedMinPrice: "3",
    mallPrice: 1,
    limitedMallPrice: 2,
    minPrice: 3,
  }),
}));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getItemDescription = blueText;
  koljs.Client.prototype.getMallPrice = mallPrice;
  koljs.Client.prototype.isRollover = () => false;
  return koljs;
});

describe("Food", () => {
  test("Can describe a food with a range of adventures", async () => {
    const item = Item.from(
      "1365	tofurkey leg	927393854	turkeyleg.gif	food	t,d	50",
      new Map([["tofurkey leg", "tofurkey leg	3	5	awesome	7-14	70-74	0	0".split("	")]]),
    );

    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "502",
      mallPrice: 502,
    });

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 1365)
        **Awesome food** (Size 3, requires level 5)
        7-14 adventures (Average 10.5 adventures, 3.5 per fullness)

        Autosell value: 50 meat.
        Mall Price: [502 meat](https://api.aventuristo.net/itemgraph?itemid=1365&timespan=1&noanim=0)
      `,
    );
  });

  test("Can describe a food with a set number of adventures", async () => {
    const item = Item.from(
      "9423	alien meat	672000286	alienmeat.gif	food, cook	t,d	8	pieces of alien meat",
      new Map([
        [
          "alien meat",
          "alien meat	1	1	good	3	0	0	0	gain 5 turns of a random positive effect".split(
            "	",
          ),
        ],
      ]),
    );

    blueText.mockReturnValueOnce({
      blueText: "Gives 5 Adventures of a random positive effect",
    });
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "1,995",
      mallPrice: 1995,
    });

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 9423)
        **Good food** (Size 1)
        3 adventures

        Gives 5 Adventures of a random positive effect
        Autosell value: 8 meat.
        Mall Price: [1,995 meat](https://api.aventuristo.net/itemgraph?itemid=9423&timespan=1&noanim=0)
      `,
    );
  });
});

describe("Equipment", () => {
  test("Can describe a shield", async () => {
    const item = Item.from(
      "9327	LOV Elephant	284967813	pl_elephant.gif	offhand	g,d	5",
      new Map([["lov elephant", ["LOV Elephant", "100", "Mus: 25", "shield"]]]),
    );

    blueText.mockReturnValueOnce({ blueText: "Damage Reduction: 10" });

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
      `,
    );
  });
});

describe("Other", () => {
  test("Can describe a potion that is multiple use and combat usable", async () => {
    const item = Item.from(
      "518	magical mystery juice	400545756	potion4.gif	multiple, combat	d	50",
    );

    blueText.mockReturnValueOnce({
      blueText: "Restores an amount of MP that increases as you level up",
    });

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 518)
        **Usable item** (also usable in combat)
        Cannot be traded.

        Restores an amount of MP that increases as you level up
        Autosell value: 50 meat.
      `,
    );
  });
});

describe("Foldable", () => {
  test("Can describe a foldable", async () => {
    const itemMeta = new Map([
      ["turtle wax helmet", ["turtle wax helmet", "40", "Mox: 5"]],
      ["turtle wax greaves", ["turtle wax greaves", "40", "Mox: 5"]],
      ["turtle wax shield", ["turtle wax shield", "40", "Mus: 5", "shield"]],
    ]);

    const item = Item.from(
      "3915	turtle wax shield	490908351	waxshield.gif	offhand, usable	t,d	7",
      itemMeta,
    );

    const group = [
      item,
      Item.from(
        "3916	turtle wax helmet	760962787	waxhat.gif	hat, usable	t,d	7",
        itemMeta,
      ),
      Item.from(
        "3917	turtle wax greaves	649657203	waxgreaves.gif	pants, usable	t,d	7	pairs of turtle wax greaves",
        itemMeta,
      ),
    ];

    item.foldGroup = group;

    blueText.mockReturnValueOnce({ blueText: "Maximum HP +10" });
    // Shield
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "500",
      mallPrice: 500,
      minPrice: 500,
      formattedMinPrice: "500",
    });
    // Shield again
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "500",
      mallPrice: 500,
      minPrice: 500,
      formattedMinPrice: "500",
    });
    // Helmet
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "100",
      mallPrice: 100,
      minPrice: 100,
      formattedMinPrice: "100",
    });
    // Greaves
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "1000",
      mallPrice: 1000,
      minPrice: 1000,
      formattedMinPrice: "1000",
    });

    const description = await item.getDescription();

    expect(description).toBe(
      dedent`
        (Item 3915)
        **Offhand Shield**
        40 power, requires 5 Muscle, Damage Reduction: 1.67

        Maximum HP +10
        Autosell value: 7 meat.
        Mall Price: [500 meat](https://api.aventuristo.net/itemgraph?itemid=3915&timespan=1&noanim=0)
        Folds into: [turtle wax helmet](https://wiki.kingdomofloathing.com/turtle_wax_helmet), [turtle wax greaves](https://wiki.kingdomofloathing.com/turtle_wax_greaves)
        (Cheapest: [turtle wax helmet](https://wiki.kingdomofloathing.com/turtle_wax_helmet) @ [100 meat](https://api.aventuristo.net/itemgraph?itemid=3916&timespan=1&noanim=0))
      `,
    );
  });
});
