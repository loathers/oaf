import { Familiar as DolFamiliar } from "data-of-loathing";
import { beforeAll, expect, test, vi } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Familiar } from "./Familiar.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getItemDescription = blueText;
  return koljs;
});

let mosquito: Familiar;

beforeAll(async () => {
  const client = await testDb;
  const em = client.query;

  const dolFamiliar = await em.findOne(
    DolFamiliar,
    { id: 1 },
    { populate: ["larva", "equipment", "modifiers"] },
  );

  if (dolFamiliar?.larva) {
    await em.populate(dolFamiliar.larva, [
      "modifiers",
      "consumable",
      "equipment",
    ]);
  }
  if (dolFamiliar?.equipment) {
    await em.populate(dolFamiliar.equipment, [
      "modifiers",
      "consumable",
      "equipment",
    ]);
  }

  mosquito = new Familiar(dolFamiliar!);
});

test("Can describe a Familiar", async () => {
  blueText.mockResolvedValueOnce({ blueText: "" });
  blueText.mockResolvedValueOnce({ blueText: "+5 to Familiar Weight" });

  const description = await mosquito.getDescription();
  const nbspx8 = " ".repeat(8);

  expect(description).toBe(
    [
      "**Familiar**",
      "Deals physical damage to heal you in combat.",
      "",
      "Attributes: animal, bite, fast, flies, haseyes, haswings, insect, organic, sentient",
      "",
      "Hatchling: [mosquito larva](https://wiki.kingdomofloathing.com/mosquito_larva)",
      "Quest Item",
      "Cannot be traded or discarded.",
      "",
      "Equipment: [hypodermic needle](https://wiki.kingdomofloathing.com/hypodermic_needle)",
      `${nbspx8}+5 to Familiar Weight`,
    ].join("\n"),
  );
});
