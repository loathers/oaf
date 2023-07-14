import { expect, test } from "vitest";

import { loadFixture } from "../../testUtils.js";
import { parseBookMobile } from "./bookmobile.js";

test("Can read relevant information", async () => {
  const page = await loadFixture(__dirname, "bookmobile_spooky.html");

  const info = parseBookMobile(page);

  expect(info).toHaveProperty("copies", "quite a few");
  expect(info).toHaveProperty("title", "Pocket Guide to Mild Evil");
  expect(info).toHaveProperty("price", 9932000);
});

test("Returns null if data cannot be read", () => {
  const info = parseBookMobile("");

  expect(info).toBe(null);
});
