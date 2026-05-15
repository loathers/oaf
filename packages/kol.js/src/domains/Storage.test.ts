import { beforeEach, describe, expect, test, vi } from "vitest";
import { Client } from "../Client.js";
import { gameData } from "../GameData.js";
import { loadFixture } from "../testUtils.js";
import { Storage } from "./Storage.js";

const client = new Client("", "");
const storage = new Storage(client);

beforeEach(() => { storage.get.invalidate(); });

const ajaxPrefix = '<script type="text/javascript">if (window.updateInv) updateInv([])</script>';

function ajaxResponse(resultsContent: string) {
  return `${ajaxPrefix}<center><table><tr><td style="background-color: blue"><b style="color: white">Results:</b></td></tr><tr><td><center><table><tr><td>${resultsContent}</td></tr></table></center></td></tr></table></center>`;
}

describe("get", () => {
  test("returns empty map when storage is empty", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce([]);
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([]);
    expect(await storage.get()).toStrictEqual(new Map());
  });

  test("parses item map from api response", async () => {
    const item142 = { id: 142 } as never;
    const item1302 = { id: 1302 } as never;
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({ "142": "5", "1302": "91" });
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([item142, item1302]);
    expect(await storage.get()).toStrictEqual(new Map([[item142, 5], [item1302, 91]]));
  });
});

describe("pull", () => {
  test("returns success when item moved from storage to inventory", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    expect(await storage.pull(1, 1)).toStrictEqual({ success: true });
  });

  test("accepts an Item object", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    expect(await storage.pull({ id: 1 } as never, 1)).toStrictEqual({ success: true });
  });

  test("returns item not in storage", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("You haven't got any of that item in your storage"),
    );
    expect(await storage.pull(1, 1)).toStrictEqual({ success: false, reason: "Item not in storage" });
  });

  test("returns daily pull limit reached", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("You already pulled one of those today"),
    );
    expect(await storage.pull(1, 1)).toStrictEqual({ success: false, reason: "Daily pull limit reached" });
  });

  test("returns unknown failure when full page is returned", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce("<html><body></body></html>");
    expect(await storage.pull(1, 1)).toStrictEqual({ success: false, reason: "Unknown" });
  });

  test("adds item id to storage.pulls flag on success", async () => {
    client.flags.daily.delete("storage.pulls");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    await storage.pull(1, 1);
    expect(client.flags.daily.get("storage.pulls")).toStrictEqual([1]);
  });

  test("adds item id to storage.pulls flag on daily limit", async () => {
    client.flags.daily.delete("storage.pulls");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("You already pulled one of those today"),
    );
    await storage.pull(1, 1);
    expect(client.flags.daily.get("storage.pulls")).toStrictEqual([1]);
  });

  test("does not duplicate item id in storage.pulls", async () => {
    client.flags.daily.set("storage.pulls", [1]);
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    await storage.pull(1, 1);
    expect(client.flags.daily.get("storage.pulls")).toStrictEqual([1]);
  });
});

describe("pulledToday", () => {
  test("returns empty array when no pulls recorded", async () => {
    client.flags.daily.delete("storage.pulls");
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([]);
    expect(await storage.pulledToday()).toStrictEqual([]);
  });

  test("returns Item instances for recorded pull ids", async () => {
    const item1 = { id: 1 } as never;
    client.flags.daily.set("storage.pulls", [1]);
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([item1]);
    expect(await storage.pulledToday()).toStrictEqual([item1]);
  });
});

describe("pullMeat", () => {
  test("returns success when meat moved from storage to inventory", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>1000 Meat</b> moved from storage to inventory"),
    );
    expect(await storage.pullMeat(1000)).toStrictEqual({ success: true });
  });

  test("returns insufficient meat when not enough in storage", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("You haven't got any of that item in your storage"),
    );
    expect(await storage.pullMeat(1000)).toStrictEqual({ success: false, reason: "Insufficient meat in storage" });
  });
});

describe("pullAll", () => {
  test("returns success when items moved from storage to inventory", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    expect(await storage.pullAll()).toStrictEqual({ success: true });
  });

  test("passes a 45 second timeout signal", async () => {
    const spy = vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      ajaxResponse("<b>seal-clubbing club (1)</b> moved from storage to inventory"),
    );
    await storage.pullAll();
    const signal = spy.mock.calls[0][1]?.signal as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });
});
