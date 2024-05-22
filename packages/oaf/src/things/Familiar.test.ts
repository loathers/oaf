import { dedent } from "ts-dedent";
import { expect, test, vi } from "vitest";

import { Familiar } from "./Familiar.js";
import { Item } from "./Item.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getItemDescription = blueText;
  return koljs;
});

test("Can describe a Familiar", async () => {
  const familiar = Familiar.from(
    "1	Mosquito	familiar1.gif	combat0,hp0	mosquito larva	hypodermic needle	2	1	3	0	animal,bug,eyes,wings,quick,biting,flying",
  );
  familiar.hatchling = Item.from(
    "275	mosquito larva	187601582	larva.gif	grow	q	0	mosquito larvae",
  );
  familiar.equipment = Item.from(
    "848	hypodermic needle	10000001	syringe.gif	familiar	t,d	75",
  );

  // For the hatchling
  blueText.mockResolvedValueOnce({ blueText: "" });
  // For the equipment
  blueText.mockResolvedValueOnce({ blueText: "+5 to Familiar Weight" });

  const description = await familiar.getDescription();

  expect(description).toBe(
    dedent`
      **Familiar**
      Deals physical damage to heal you in combat.

      Attributes: animal, bug, eyes, wings, quick, biting, flying

      Hatchling: [mosquito larva](https://kol.coldfront.net/thekolwiki/index.php/mosquito_larva)
      Quest Item
      Cannot be traded or discarded.

      Equipment: [hypodermic needle](https://kol.coldfront.net/thekolwiki/index.php/hypodermic_needle)
      \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0+5 to Familiar Weight
    `,
  );
});
