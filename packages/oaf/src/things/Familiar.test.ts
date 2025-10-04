import { dedent } from "ts-dedent";
import { expect, test, vi } from "vitest";

import { Familiar } from "./Familiar.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getItemDescription = blueText;
  return koljs;
});

test("Can describe a Familiar", async () => {
  const familiar = new Familiar({
    id: 1,
    name: "Mosquito",
    image: "familiar1.gif",
    itemByLarva: {
      id: 275,
      name: "mosquito larva",
      image: "larva.gif",
      itemModifierByItem: null,
      tradeable: false,
      quest: true,
      discardable: false,
      gift: false,
      descid: 187601582,
    },
    itemByEquipment: {
      id: 848,
      name: "hypodermic needle",
      image: "syringe.gif",
      itemModifierByItem: {
        modifiers: {
          "Familiar Weight": "+5",
        },
      },
      tradeable: true,
      quest: false,
      discardable: true,
      gift: false,
      descid: 10000001,
    },
    categories: ["COMBAT0", "HP0"],
    attributes: [
      "sentient",
      "organic",
      "insect",
      "animal",
      "haseyes",
      "bite",
      "haswings",
      "flies",
      "fast",
    ],
    familiarModifierByFamiliar: null,
  });

  // For the hatchling
  blueText.mockResolvedValueOnce({ blueText: "" });
  // For the equipment
  blueText.mockResolvedValueOnce({ blueText: "+5 to Familiar Weight" });

  const description = await familiar.getDescription();

  expect(description).toBe(
    dedent`
      **Familiar**
      Deals physical damage to heal you in combat.

      Attributes: animal, bite, fast, flies, haseyes, haswings, insect, organic, sentient

      Hatchling: [mosquito larva](https://wiki.kingdomofloathing.com/mosquito_larva)
      Quest Item
      Cannot be traded or discarded.

      Equipment: [hypodermic needle](https://wiki.kingdomofloathing.com/hypodermic_needle)
      \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0+5 to Familiar Weight
    `,
  );
});
