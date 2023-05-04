import mockAxios from "jest-mock-axios";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import dedent from "ts-dedent";

import { kolClient } from "../clients/kol";
import { Effect } from "./Effect";

beforeAll(() => {
  kolClient.mockLoggedIn = true;
});

afterAll(() => {
  kolClient.mockLoggedIn = false;
});

afterEach(() => {
  mockAxios.reset();
});

test("Can describe an Effect", async () => {
  const file = path.join(__dirname, "__fixtures__/desc_effect_pasta_oneness.html");
  const html = await fs.readFile(file, { encoding: "utf-8" });
  mockAxios.post.mockResolvedValue({ data: html });

  const effect = Effect.from(
    "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation"
  );
  effect.pizza = { letters: "PAST", options: 2 };

  const descriptionPromise = effect.getDescription();
  const description = await descriptionPromise;

  expect(description).toBe(
    dedent`
      **Effect**
      (Effect 23)
      Mysticality +2

      Pizza: PAST (1 in 2)
    `
  );
});
