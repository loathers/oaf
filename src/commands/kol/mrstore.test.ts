import type { MrStoreItem } from "kol.js/domains/MrStore";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  upsertMrStoreItemByName,
  clearMrStoreItemRemovedFromStore,
  setMrStoreItemRemovedFromStore,
  getMrStoreItemsInStore,
} = vi.hoisted(() => ({
  upsertMrStoreItemByName: vi.fn(),
  clearMrStoreItemRemovedFromStore: vi.fn(),
  setMrStoreItemRemovedFromStore: vi.fn(),
  getMrStoreItemsInStore: vi.fn(),
}));

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

const { getCurrentItems } = vi.hoisted(() => ({ getCurrentItems: vi.fn() }));

vi.mock("../../clients/database.js", () => ({
  upsertMrStoreItemByName,
  clearMrStoreItemRemovedFromStore,
  setMrStoreItemRemovedFromStore,
  getMrStoreItemsInStore,
}));

vi.mock("../../clients/discord.js", () => ({
  discordClient: { alert, on: vi.fn() },
}));

vi.mock("../../clients/kol.js", () => ({
  kolClient: { on: vi.fn() },
}));

vi.mock("../../server/apps/oaf/routes/subs.js", () => ({
  determineIotmMonth: () => new Date("2026-06-01T00:00:00Z"),
}));

vi.mock("kol.js", () => ({
  LoathingDate: {
    getRollover: () => new Date("2026-06-10T03:30:00Z"),
    getNextRollover: () => new Date("2026-06-11T03:30:00Z"),
  },
}));

vi.mock("kol.js/domains/MrStore", () => ({
  MrStore: class {
    getCurrentItems = getCurrentItems;
  },
  MrStoreUrgency: { None: 0, Soon: 1, Today: 2 } as const,
}));

const { checkStore } = await import("./mrstore.js");

function item(name: string, urgency = 0): MrStoreItem {
  return {
    name,
    descid: 1,
    image: `${name}.gif`,
    cost: 1,
    currency: "mr_accessory",
    category: "Stuff",
    urgency: urgency as MrStoreItem["urgency"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMrStoreItemsInStore.mockResolvedValue([]);
});

describe("checkStore", () => {
  // Regression: a single item that fails to upsert must NOT abort the whole run.
  // Previously checkStore had no per-item try/catch, so one throw skipped the
  // removal-detection loop entirely - which is why a departed item (e.g. the May
  // IotM "pasta wand loot box") was never marked as removed.
  test("a failing item does not skip removal detection for other items", async () => {
    getCurrentItems.mockResolvedValue([item("first"), item("second")]);
    upsertMrStoreItemByName.mockImplementation(({ itemName }) => {
      if (itemName === "first") throw new Error("boom");
      return Promise.resolve();
    });
    // "departed" was tracked previously but is no longer in the store.
    getMrStoreItemsInStore.mockResolvedValue([{ itemName: "departed" }]);

    await checkStore();

    // The bad item was reported but did not abort the run.
    expect(alert).toHaveBeenCalledWith(
      'checkStore: failed to process "first"',
      undefined,
      expect.any(Error),
    );
    // The loop continued to the next item.
    expect(upsertMrStoreItemByName).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: "second" }),
    );
    // Crucially, the removal-detection loop still ran.
    expect(setMrStoreItemRemovedFromStore).toHaveBeenCalledWith(
      "departed",
      new Date("2026-06-10T03:30:00Z"),
    );
  });

  test("predicts removal for items leaving today", async () => {
    getCurrentItems.mockResolvedValue([item("leaving", 2)]);
    upsertMrStoreItemByName.mockResolvedValue(undefined);

    await checkStore();

    expect(setMrStoreItemRemovedFromStore).toHaveBeenCalledWith(
      "leaving",
      new Date("2026-06-11T03:30:00Z"),
    );
  });

  // An empty fetch is untrustworthy (the API returns {} during rollover); it must
  // not be interpreted as "every tracked item left the store".
  test("an empty fetch is skipped without touching the database", async () => {
    getCurrentItems.mockResolvedValue([]);

    await checkStore();

    expect(getMrStoreItemsInStore).not.toHaveBeenCalled();
    expect(setMrStoreItemRemovedFromStore).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "checkStore: store fetch was empty - skipping (possible rollover quirk)",
    );
  });

  test("passes the item currency through to the database", async () => {
    getCurrentItems.mockResolvedValue([
      { ...item("uncle buck thing"), currency: "uncle_buck" },
    ]);
    upsertMrStoreItemByName.mockResolvedValue(undefined);

    await checkStore();

    expect(upsertMrStoreItemByName).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: "uncle buck thing",
        currency: "uncle_buck",
      }),
    );
  });

  test("derives category from the store category, defaulting to a monthless 'other'", async () => {
    getCurrentItems.mockResolvedValue([item("a permanent")]);
    upsertMrStoreItemByName.mockResolvedValue(undefined);

    await checkStore();

    expect(upsertMrStoreItemByName).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: "a permanent",
        category: "other",
        month: null,
        subscriberItem: false,
      }),
    );
  });

  test("an item-of-the-month is a subscriber iotm with the current month", async () => {
    getCurrentItems.mockResolvedValue([
      {
        ...item("monthly thing"),
        category: "Mr. Accessory's Item-of-the-Month",
      },
    ]);
    upsertMrStoreItemByName.mockResolvedValue(undefined);

    await checkStore();

    expect(upsertMrStoreItemByName).toHaveBeenCalledWith(
      expect.objectContaining({
        itemName: "monthly thing",
        category: "iotm",
        subscriberItem: true,
        month: new Date("2026-06-01T00:00:00Z"),
      }),
    );
  });

  test("an item-of-the-year is a non-subscriber ioty dated to January", async () => {
    getCurrentItems.mockResolvedValue([
      {
        ...item("yearly thing"),
        category: "Mr. Accessory's Item-of-the-Year",
      },
    ]);
    upsertMrStoreItemByName.mockResolvedValue(undefined);

    await checkStore();

    const arg = upsertMrStoreItemByName.mock.calls[0][0] as {
      category: string;
      subscriberItem: boolean;
      month: Date;
    };
    expect(arg.category).toBe("ioty");
    expect(arg.subscriberItem).toBe(false);
    expect(arg.month.getUTCMonth()).toBe(0);
  });
});
