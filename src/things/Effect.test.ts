import axios from "axios";
import dedent from "ts-dedent";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { kolClient } from "../clients/kol";
import { loadFixture } from "../testUtils";
import { Effect } from "./Effect";

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

test("Can describe an Effect", async () => {
  vi.mocked(axios.post).mockResolvedValueOnce({
    data: await loadFixture(__dirname, "desc_effect_pasta_oneness.html"),
  });

  const effect = Effect.from(
    "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation"
  );
  effect.pizza = { letters: "PAST", options: 2 };

  const description = await effect.getDescription();

  expect(description).toBe(
    dedent`
      **Effect**
      (Effect 23)
      Mysticality +2

      Pizza: PAST (1 in 2)
    `
  );
});

test("Can describe an avatar effect", async () => {
  vi.mocked(axios.post).mockResolvedValueOnce({
    data: await loadFixture(__dirname, "desc_effect_the_visible_adventurer.html"),
  });

  const effect = Effect.from(
    "1888	The Visible Adventurer	handmirror.gif	a38d91d52ace7992b899402e9704d86d	neutral	none	use 1 x-ray mirror",
    new Set(["x-ray mirror"])
  );

  const description = await effect.getDescription();

  expect(description).toBe(
    dedent`
      **Effect**
      (Effect 1888)
      Makes you look like a skeleton

      Ineligible for pizza, wishes, or hookahs.
    `
  );
});
