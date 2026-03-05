import { expect, test } from "vitest";

import { loadFixture } from "../testUtils.js";
import { FloralMercantileExchange } from "./FloralMercantileExchange.js";

test("Can read prices", async () => {
  const page = await loadFixture(import.meta.dirname, "flowers.html");

  const prices = FloralMercantileExchange.parse(page);

  expect(prices).toHaveProperty("red", 11);
  expect(prices).toHaveProperty("white", 11);
  expect(prices).toHaveProperty("blue", 12);
});

test("Returns null if prices cannot be read", () => {
  const prices = FloralMercantileExchange.parse("");

  expect(prices).toBe(null);
});
