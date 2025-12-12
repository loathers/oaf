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
    const item = new Item({
      id: 1365,
      name: "tofurkey leg",
      image: "turkeyleg.gif",
      descid: 927393854,
      uses: ["FOOD"],
      quest: false,
      tradeable: true,
      discardable: true,
      gift: false,
      autosell: 50,
      itemModifierByItem: null,
      consumableById: {
        adventureRange: "7-14",
        adventures: 10.5,
        stomach: 3,
        liver: 0,
        spleen: 0,
        levelRequirement: 5,
        quality: "AWESOME",
      },
      equipmentById: null,
    });

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
    const item = new Item({
      id: 9423,
      name: "alien meat",
      image: "alienmeat.gif",
      descid: 672000286,
      uses: ["FOOD", "COOK"],
      quest: false,
      tradeable: true,
      discardable: true,
      gift: false,
      autosell: 8,
      itemModifierByItem: {
        modifiers: {
          "Last Available": '"2017-04"',
        },
      },
      consumableById: {
        adventureRange: "3",
        adventures: 3,
        stomach: 1,
        liver: 0,
        spleen: 0,
        levelRequirement: 1,
        quality: "GOOD",
      },
      equipmentById: null,
    });

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
    const item = new Item({
      id: 9327,
      name: "LOV Elephant",
      image: "pl_elephant.gif",
      descid: 284967813,
      uses: ["OFFHAND"],
      quest: false,
      tradeable: false,
      discardable: true,
      gift: true,
      autosell: 5,
      itemModifierByItem: {
        modifiers: {
          "Last Available": '"2017-02"',
          "Damage Reduction": "16",
        },
      },
      consumableById: null,
      equipmentById: {
        power: 100,
        moxRequirement: 0,
        mysRequirement: 0,
        musRequirement: 25,
        type: "shield",
      },
    });

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
    const item = new Item({
      id: 518,
      name: "magical mystery juice",
      image: "potion4.gif",
      descid: 400545756,
      uses: ["MULTIPLE", "COMBAT"],
      quest: false,
      tradeable: false,
      discardable: true,
      gift: false,
      autosell: 50,
      itemModifierByItem: null,
      consumableById: null,
      equipmentById: null,
    });

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
    const item = new Item({
      id: 3915,
      name: "turtle wax shield",
      image: "waxshield.gif",
      descid: 490908351,
      uses: ["OFFHAND", "USABLE"],
      quest: false,
      tradeable: true,
      discardable: true,
      gift: false,
      plural: null,
      autosell: 7,
      itemModifierByItem: {
        modifiers: {
          "Maximum HP": "+10",
          "Damage Reduction": "2",
        },
      },
      consumableById: null,
      equipmentById: {
        power: 40,
        moxRequirement: 0,
        mysRequirement: 0,
        musRequirement: 5,
        type: "shield",
      },
      foldablesByItem: {
        nodes: [
          {
            foldGroupByFoldGroup: {
              foldablesByFoldGroup: {
                nodes: [
                  {
                    itemByItem: {
                      id: 3915,
                      image: "waxshield.gif",
                      name: "turtle wax shield",
                      tradeable: true,
                    },
                  },
                  {
                    itemByItem: {
                      id: 3916,
                      image: "waxhat.gif",
                      name: "turtle wax helmet",
                      tradeable: true,
                    },
                  },
                  {
                    itemByItem: {
                      id: 3917,
                      image: "waxgreaves.gif",
                      name: "turtle wax greaves",
                      tradeable: true,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    });

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
