import { expect, test } from "vitest";

import { loadFixture } from "../../testUtils.js";
import { parsePrices } from "./flowers.js";

test("Can read prices", async () => {
  const page = await loadFixture(__dirname, "flowers.html");

  const prices = parsePrices(page);

  expect(prices).toHaveProperty("red", 11);
  expect(prices).toHaveProperty("white", 11);
  expect(prices).toHaveProperty("blue", 12);
});

test("Returns null if prices cannot be read", () => {
  const prices = parsePrices("");

  expect(prices).toBe(null);
});
