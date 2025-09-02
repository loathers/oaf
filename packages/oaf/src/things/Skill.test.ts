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
    __typename: "Skill",
    id: 7017,
    ambiguous: false,
    guildLevel: null,
    duration: 0,
    image: "littlefridge.gif",
    mpCost: 100,
    maxLevel: null,
    name: "Overload Discarded Refrigerator",
    nodeId: "WyJza2lsbHMiLDcwMTdd",
    permable: false,
    tags: ["COMBAT"],
    skillModifierBySkill: null,
  });

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
    __typename: "Skill",
    id: 4015,
    ambiguous: false,
    guildLevel: 12,
    duration: 0,
    image: "5alarm.gif",
    mpCost: 0,
    maxLevel: null,
    name: "Impetuous Sauciness",
    nodeId: "WyJza2lsbHMiLDQwMTVd",
    permable: true,
    tags: ["PASSIVE"],
    skillModifierBySkill: null,
  });

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
