/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, no-irregular-whitespace */
import { FamiliarCategory } from "data-of-loathing";
import { dedent } from "ts-dedent";
import { expect, test, vi } from "vitest";

import { Familiar } from "./Familiar.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getItemDescription = blueText;
  return koljs;
});

function makeItem(overrides: Record<string, unknown>) {
  return {
    quest: false,
    tradeable: false,
    discardable: false,
    gift: false,
    autosell: 0,
    ambiguous: false,
    uses: [],
    foldGroups: { getItems: () => [] },
    zapGroups: { getItems: () => [] },
    ...overrides,
  } as any;
}

test("Can describe a Familiar", async () => {
  const familiar = new Familiar({
    id: 1,
    name: "Mosquito",
    image: "familiar1.gif",
    larva: makeItem({
      id: 275,
      name: "mosquito larva",
      image: "larva.gif",
      tradeable: false,
      quest: true,
      discardable: false,
      gift: false,
      descid: 187601582,
    }),
    equipment: makeItem({
      id: 848,
      name: "hypodermic needle",
      image: "syringe.gif",
      modifiers: { modifiers: { "Familiar Weight": "+5" } },
      tradeable: true,
      quest: false,
      discardable: true,
      gift: false,
      descid: 10000001,
    }),
    categories: [FamiliarCategory.Combat0, FamiliarCategory.Hp0],
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
    cageMatch: 0,
    scavengerHunt: 0,
    obstacleCourse: 0,
    hideAndSeek: 0,
    ambiguous: false,
  } as any);

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
              +5 to Familiar Weight
    `,
  );
});
