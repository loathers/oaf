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
  const skill = Skill.from(
    "7017	Overload Discarded Refrigerator	littlefridge.gif	5	100	0",
  );

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
  const skill = Skill.from("4015	Impetuous Sauciness	5alarm.gif	0	0	0	12");

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
