import { expect, test } from "vitest";

import { loadFixture } from "../testUtils.js";
import { MrStore, MrStoreUrgency } from "./MrStore.js";

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

test("Parses urgency=Soon for items with ACT NOW warning", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore_act_now_soon.html");

  const items = MrStore.parse(page);

  const soonItem = items.find((i) => i.urgency === MrStoreUrgency.Soon);
  expect(soonItem).toBeDefined();
  expect(soonItem?.name).toBe("wrapped Baseball Diamond");
});

test("Parses urgency=None for items without warning", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore_act_now_soon.html");

  const items = MrStore.parse(page);

  const noUrgencyItem = items.find((i) => i.category === "May's Item-of-the-Month");
  expect(noUrgencyItem?.urgency).toBe(MrStoreUrgency.None);
});

test("Parses urgency=Today for items leaving today", async () => {
  const page = await loadFixture(import.meta.dirname, "mrstore_act_now_today.html");

  const items = MrStore.parse(page);

  const todayItem = items.find((i) => i.urgency === MrStoreUrgency.Today);
  expect(todayItem).toBeDefined();
  expect(todayItem?.name).toBe("wrapped Baseball Diamond");
});
