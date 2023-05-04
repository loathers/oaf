import axios from "axios";
import dedent from "ts-dedent";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { kolClient } from "../clients/kol";
import { respondWithFixture } from "../testUtils";
import { Skill } from "./Skill";

vi.mock("axios");

beforeAll(() => {
  kolClient.mockLoggedIn = true;
});

afterAll(() => {
  kolClient.mockLoggedIn = false;
});

afterEach(() => {
  vi.mocked(axios).mockReset();
});

test("Can describe a Skill with no bluetext", async () => {
  vi.mocked(axios).mockResolvedValueOnce(
    await respondWithFixture(__dirname, "desc_skill_overload_discarded_refridgerator.html")
  );

  const skill = Skill.from("7017	Overload Discarded Refrigerator	littlefridge.gif	5	100	0");

  const description = await skill.getDescription();

  expect(description).toBe(
    dedent`
      **Combat Skill**
      (Skill 7017)
      Cost: 100mp
    `
  );
});

test("Can describe a Skill with bluetext", async () => {
  vi.mocked(axios).mockResolvedValueOnce(
    await respondWithFixture(__dirname, "desc_skill_impetuous_sauciness.html")
  );

  const skill = Skill.from("4015	Impetuous Sauciness	5alarm.gif	0	0	0	12");

  const description = await skill.getDescription();

  expect(description).toBe(
    dedent`
      **Passive Skill**
      (Skill 4015)

      Makes Sauce Potions last longer
    `
  );
});
