import { expect, test } from "vitest";

import { loadFixture } from "../testUtils.js";
import { MrStore } from "./MrStore.js";

test("Can parse Mr. Store items", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore.html");

  const items = MrStore.parse(page);

  expect(items.length).toBeGreaterThan(0);

  const iotm = items.find((i) => i.category === "April's Item-of-the-Month");
  expect(iotm).toBeDefined();
  expect(iotm).toMatchObject({
    name: "wrapped Baseball Diamond",
    descid: 844091703,
    image: "bdiamond_box.gif",
    cost: 1,
    currency: "mr_accessory",
    category: "April's Item-of-the-Month",
  });
});

test("Parses item-of-the-year", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore.html");

  const items = MrStore.parse(page);

  const ioty = items.find((i) => i.category === "2026's Item-of-the-Year");
  expect(ioty).toMatchObject({
    name: "discreetly-wrapped Eternity Codpiece",
    descid: 323763723,
    cost: 1,
    currency: "mr_accessory",
  });
});

test("Parses uncle buck items", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore.html");

  const items = MrStore.parse(page);

  const ubItem = items.find((i) => i.currency === "uncle_buck");
  expect(ubItem).toBeDefined();
});

test("Returns empty array for unparseable input", () => {
  const items = MrStore.parse("");
  expect(items).toEqual([]);
});
