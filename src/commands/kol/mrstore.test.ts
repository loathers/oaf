import type { MrStoreItem } from "kol.js/domains/MrStore";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  upsertIotmByName,
  clearIotmRemovedFromStore,
  setIotmRemovedFromStore,
  getIotmsInStore,
} = vi.hoisted(() => ({
  upsertIotmByName: vi.fn(),
  clearIotmRemovedFromStore: vi.fn(),
  setIotmRemovedFromStore: vi.fn(),
  getIotmsInStore: vi.fn(),
}));

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

const { getCurrentItems } = vi.hoisted(() => ({ getCurrentItems: vi.fn() }));

vi.mock("../../clients/database.js", () => ({
  upsertIotmByName,
  clearIotmRemovedFromStore,
  setIotmRemovedFromStore,
  getIotmsInStore,
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
  getIotmsInStore.mockResolvedValue([]);
});

describe("checkStore", () => {
  // Regression: a single item that fails to upsert must NOT abort the whole run.
  // Previously checkStore had no per-item try/catch, so one throw skipped the
  // removal-detection loop entirely - which is why a departed item (e.g. the May
  // IotM "pasta wand loot box") was never marked as removed.
  test("a failing item does not skip removal detection for other items", async () => {
    getCurrentItems.mockResolvedValue([item("first"), item("second")]);
    upsertIotmByName.mockImplementation(async ({ itemName }) => {
      if (itemName === "first") throw new Error("boom");
    });
    // "departed" was tracked previously but is no longer in the store.
    getIotmsInStore.mockResolvedValue([{ itemName: "departed" }]);

    await checkStore();

    // The bad item was reported but did not abort the run.
    expect(alert).toHaveBeenCalledWith(
      'checkStore: failed to process "first"',
      undefined,
      expect.any(Error),
    );
    // The loop continued to the next item.
    expect(upsertIotmByName).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: "second" }),
    );
    // Crucially, the removal-detection loop still ran.
    expect(setIotmRemovedFromStore).toHaveBeenCalledWith(
      "departed",
      new Date("2026-06-10T03:30:00Z"),
    );
  });

  test("predicts removal for items leaving today", async () => {
    getCurrentItems.mockResolvedValue([item("leaving", 2)]);
    upsertIotmByName.mockResolvedValue(undefined);

    await checkStore();

    expect(setIotmRemovedFromStore).toHaveBeenCalledWith(
      "leaving",
      new Date("2026-06-11T03:30:00Z"),
    );
  });

  // An empty fetch is untrustworthy (the API returns {} during rollover); it must
  // not be interpreted as "every tracked item left the store".
  test("an empty fetch is skipped without touching the database", async () => {
    getCurrentItems.mockResolvedValue([]);

    await checkStore();

    expect(getIotmsInStore).not.toHaveBeenCalled();
    expect(setIotmRemovedFromStore).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "checkStore: store fetch was empty - skipping (possible rollover quirk)",
    );
  });
});
