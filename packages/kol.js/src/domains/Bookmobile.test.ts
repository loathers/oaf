import { expect, test } from "vitest";

import { loadFixture } from "../testUtils.js";
import { Bookmobile } from "./Bookmobile.js";

test("Can read relevant information", async () => {
  const page = await loadFixture(import.meta.dirname, "bookmobile_spooky.html");

  const info = Bookmobile.parse(page);

  expect(info).toHaveProperty("copies", "quite a few");
  expect(info).toHaveProperty("title", "Pocket Guide to Mild Evil");
  expect(info).toHaveProperty("price", 9932000);
});

test("Returns null if data cannot be read", () => {
  const info = Bookmobile.parse("");

  expect(info).toBe(null);
});
