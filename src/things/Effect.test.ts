import axios from "axios";
import { dedent } from "ts-dedent";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { kolClient } from "../clients/kol.js";
import { respondWithFixture } from "../testUtils.js";
import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

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

describe("Effect descriptions", () => {
  test("Can describe an Effect", async () => {
    vi.mocked(axios).mockResolvedValueOnce(
      await respondWithFixture(__dirname, "desc_effect_pasta_oneness.html"),
    );

    const effect = Effect.from(
      "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation",
    );
    effect.pizza = { letters: "PAST", options: 2 };

    const description = await effect.getDescription();

    expect(description).toBe(
      dedent`
        **Effect**
        (Effect 23)
        Mysticality +2

        Pizza: PAST (1 in 2)
      `,
    );
  });

  test("Can describe an avatar effect", async () => {
    vi.mocked(axios).mockResolvedValueOnce(
      await respondWithFixture(
        __dirname,
        "desc_effect_the_visible_adventurer.html",
      ),
    );

    const effect = Effect.from(
      "1888	The Visible Adventurer	handmirror.gif	a38d91d52ace7992b899402e9704d86d	neutral	none	use 1 x-ray mirror",
      new Set(["x-ray mirror"]),
    );

    const description = await effect.getDescription();

    expect(description).toBe(
      dedent`
        **Effect**
        (Effect 1888)
        Makes you look like a skeleton

        Ineligible for pizza, wishes, or hookahs.
      `,
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Effect", () => {
    const line =
      "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation";
    const a = Effect.from(line);
    const b = Effect.from(line);

    expect(a.hashcode()).toBe("Effect:23");
    expect(a.hashcode()).toEqual(b.hashcode());
  });

  test("Compares by thing type", () => {
    const a = Effect.from(
      "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation",
    );
    const b = Monster.from(
      "bar	23	bar.gif	Atk: 3 Def: 2 HP: 5 Init: 50 Meat: 15 P: beast Article: a	bar skin (35)	baritone accordion (a0)",
    );

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});
