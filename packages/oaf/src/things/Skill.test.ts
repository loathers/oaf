import { Skill as DolSkill } from "data-of-loathing";
import { beforeAll, expect, test, vi } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Skill } from "./Skill.js";

const blueText = vi.hoisted(() => vi.fn().mockResolvedValue({ blueText: "" }));

vi.mock("kol.js", async (importOriginal) => {
  const koljs = await importOriginal<typeof import("kol.js")>();
  koljs.Client.prototype.getSkillDescription = blueText;
  return koljs;
});

let overloadSkill: Skill;
let impetuousSkill: Skill;

beforeAll(async () => {
  const client = await testDb;
  const em = client.query;
  overloadSkill = new Skill(
    (await em.findOne(DolSkill, { id: 7017 }, { populate: ["modifiers"] }))!,
  );
  impetuousSkill = new Skill(
    (await em.findOne(DolSkill, { id: 4015 }, { populate: ["modifiers"] }))!,
  );
});

test("Can describe a Skill with no bluetext", async () => {
  blueText.mockReturnValueOnce({ blueText: "" });
  const description = await overloadSkill.getDescription();
  expect(description).toBe(
    ["**Combat Skill**", "(Skill 7017)", "Cost: 100mp"].join("\n"),
  );
});

test("Can describe a Skill with bluetext", async () => {
  blueText.mockReturnValueOnce({ blueText: "Makes Sauce Potions last longer" });
  const description = await impetuousSkill.getDescription();
  expect(description).toBe(
    [
      "**Passive Skill**",
      "(Skill 4015)",
      "",
      "Makes Sauce Potions last longer",
    ].join("\n"),
  );
});
