/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { SkillTag } from "data-of-loathing";
import { dedent } from "ts-dedent";
import { expect, test, vi } from "vitest";

import { Skill } from "./Skill.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getSkillDescription = blueText;
  return koljs;
});

test("Can describe a Skill with no bluetext", async () => {
  const skill = new Skill({
    id: 7017,
    image: "littlefridge.gif",
    mpCost: 100,
    duration: 0,
    permable: false,
    ambiguous: false,
    name: "Overload Discarded Refrigerator",
    tags: [SkillTag.Combat],
  } as any);

  blueText.mockReturnValueOnce({ blueText: "" });

  const description = await skill.getDescription();

  expect(description).toBe(
    dedent`
      **Combat Skill**
      (Skill 7017)
      Cost: 100mp
    `,
  );
});

test("Can describe a Skill with bluetext", async () => {
  const skill = new Skill({
    id: 4015,
    image: "5alarm.gif",
    mpCost: 0,
    duration: 0,
    permable: true,
    ambiguous: false,
    name: "Impetuous Sauciness",
    tags: [SkillTag.Passive],
  } as any);

  blueText.mockReturnValueOnce({ blueText: "Makes Sauce Potions last longer" });

  const description = await skill.getDescription();

  expect(description).toBe(
    dedent`
      **Passive Skill**
      (Skill 4015)

      Makes Sauce Potions last longer
    `,
  );
});
