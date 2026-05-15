import { beforeEach, describe, expect, test, vi } from "vitest";
import { Client } from "../Client.js";
import { gameData } from "../GameData.js";
import { loadFixture } from "../testUtils.js";
import { Closet } from "./Closet.js";

const client = new Client("", "");
const closet = new Closet(client);

beforeEach(() => { closet.get.invalidate(); });

describe("get", () => {
  test("returns empty map when closet is empty", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce([]);
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([]);
    expect(await closet.get()).toStrictEqual(new Map());
  });

  test("parses item map from api response", async () => {
    const item142 = { id: 142 } as never;
    const item346 = { id: 346 } as never;
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({ "142": "19", "346": "56" });
    vi.spyOn(gameData, "findItemsByIds").mockResolvedValueOnce([item142, item346]);
    expect(await closet.get()).toStrictEqual(new Map([[item142, 19], [item346, 56]]));
  });
});

describe("deposit", () => {
  test("returns success on ajax response", async () => {
    const html = await loadFixture(__dirname, "closet_deposit.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await closet.deposit(142, 1)).toStrictEqual({ success: true });
  });

  test("accepts an Item object", async () => {
    const html = await loadFixture(__dirname, "closet_deposit.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await closet.deposit({ id: 142 } as never, 1)).toStrictEqual({ success: true });
  });

  test("returns item not in inventory when full page is returned", async () => {
    const html = await loadFixture(__dirname, "closet_deposit_not_in_inventory.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await closet.deposit(2, 1)).toStrictEqual({ success: false, reason: "Item not in inventory" });
  });
});

describe("withdraw", () => {
  test("returns success on ajax response", async () => {
    const html = await loadFixture(__dirname, "closet_withdraw.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await closet.withdraw(142, 1)).toStrictEqual({ success: true });
  });

  test("returns item not in closet when full page is returned", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce("<html><body></body></html>");
    expect(await closet.withdraw(2, 1)).toStrictEqual({ success: false, reason: "Item not in closet" });
  });
});

describe("depositMeat", () => {
  test("returns success on ajax response", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      '<script type="text/javascript">if (window.updateInv) updateInv([])</script>',
    );
    expect(await closet.depositMeat(1000)).toStrictEqual({ success: true });
  });
});

describe("withdrawMeat", () => {
  test("returns success on ajax response", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      '<script type="text/javascript">if (window.updateInv) updateInv([])</script>',
    );
    expect(await closet.withdrawMeat(1000)).toStrictEqual({ success: true });
  });
});
