import axios from "axios";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { respondWithFixture } from "../testUtils.js";
import { kolClient } from "./kol.js";

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

function expectNotNull<T>(value: T | null): asserts value is T {
  expect(value).not.toBeNull();
}

test("Can search for a player by name", async () => {
  vi.mocked(axios).mockResolvedValueOnce(
    await respondWithFixture(__dirname, "searchplayer_mad_carew.html")
  );

  const player = await kolClient.getPartialPlayerFromName("mad carew");

  expectNotNull(player);

  expect(player.id).toBe(263717);
  expect(player.level).toBe(16);
  expect(player.class).toBe("Sauceror");
  // Learns correct capitalisation
  expect(player.name).toBe("Mad Carew");
});
