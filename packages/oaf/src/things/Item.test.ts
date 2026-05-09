import { Item as DolItem } from "data-of-loathing";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
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

async function loadItem(id: number): Promise<Item> {
  const client = await testDb;
  const dolItem = await client.query.findOne(
    DolItem,
    { id },
    {
      populate: [
        "consumable",
        "equipment",
        "modifiers",
        "foldGroups.items",
        "zapGroups.items",
      ],
    },
  );
  return new Item(dolItem!);
}

let tofurkeyLeg: Item;
let alienMeat: Item;
let lovElephant: Item;
let mysteryJuice: Item;
let turtleWaxShield: Item;

beforeAll(async () => {
  [tofurkeyLeg, alienMeat, lovElephant, mysteryJuice, turtleWaxShield] =
    await Promise.all([
      loadItem(1365),
      loadItem(9423),
      loadItem(9327),
      loadItem(518),
      loadItem(3915),
    ]);
});

describe("Food", () => {
  test("Can describe a food with a range of adventures", async () => {
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "502",
      mallPrice: 502,
    });
    expect(await tofurkeyLeg.getDescription()).toBe(
      [
        "(Item 1365)",
        "**Awesome food** (Size 3, requires level 5)",
        "7-14 adventures (Average 10.5 adventures, 3.5 per fullness)",
        "",
        "Autosell value: 50 Meat.",
        "Mall Price: [502 Meat](https://pricegun.loathers.net/item/1365)",
      ].join("\n"),
    );
  });

  test("Can describe a food with a set number of adventures", async () => {
    blueText.mockReturnValueOnce({
      blueText: "Gives 5 Adventures of a random positive effect",
    });
    mallPrice.mockResolvedValueOnce({
      formattedMallPrice: "1,995",
      mallPrice: 1995,
    });
    expect(await alienMeat.getDescription()).toBe(
      [
        "(Item 9423)",
        "**Good food** (Size 1)",
        "3 adventures",
        "",
        "Gives 5 Adventures of a random positive effect",
        "Autosell value: 8 Meat.",
        "Mall Price: [1,995 Meat](https://pricegun.loathers.net/item/9423)",
      ].join("\n"),
    );
  });
});

describe("Equipment", () => {
  test("Can describe a shield", async () => {
    blueText.mockReturnValueOnce({ blueText: "Damage Reduction: 10" });
    expect(await lovElephant.getDescription()).toBe(
      [
        "(Item 9327)",
        "**Offhand Shield**",
        "100 power, requires 25 Muscle, Damage Reduction: 5.67",
        "Gift Item",
        "Cannot be traded.",
        "",
        "Damage Reduction: 10",
        "Autosell value: 5 Meat.",
      ].join("\n"),
    );
  });
});

describe("Other", () => {
  test("Can describe a potion that is multiple use and combat usable", async () => {
    blueText.mockReturnValueOnce({
      blueText: "Restores an amount of MP that increases as you level up",
    });
    expect(await mysteryJuice.getDescription()).toBe(
      [
        "(Item 518)",
        "**Usable item** (also usable in combat)",
        "Cannot be traded.",
        "",
        "Restores an amount of MP that increases as you level up",
        "Autosell value: 50 Meat.",
      ].join("\n"),
    );
  });
});

describe("Foldable", () => {
  test("Can describe a foldable", async () => {
    blueText.mockReturnValueOnce({ blueText: "Maximum HP +10" });
    mallPrice.mockImplementation((itemId: number) => {
      const prices: Record<number, number> = {
        3915: 500,
        3916: 100,
        3917: 1000,
      };
      const price = prices[itemId] ?? 1;
      return Promise.resolve({
        formattedMallPrice: String(price),
        mallPrice: price,
        minPrice: price,
        formattedMinPrice: String(price),
      });
    });
    expect(await turtleWaxShield.getDescription()).toBe(
      [
        "(Item 3915)",
        "**Offhand Shield**",
        "40 power, requires 5 Muscle, Damage Reduction: 1.67",
        "",
        "Maximum HP +10",
        "Autosell value: 7 Meat.",
        "Mall Price: [500 Meat](https://pricegun.loathers.net/item/3915)",
        "Folds into: [turtle wax helmet](https://wiki.kingdomofloathing.com/turtle_wax_helmet), [turtle wax greaves](https://wiki.kingdomofloathing.com/turtle_wax_greaves)",
        "(Cheapest: [turtle wax helmet](https://wiki.kingdomofloathing.com/turtle_wax_helmet) @ [100 Meat](https://pricegun.loathers.net/item/3916))",
      ].join("\n"),
    );
  });
});
