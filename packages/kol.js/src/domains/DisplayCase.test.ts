import { describe, expect, test, vi } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { DisplayCase } from "./DisplayCase.js";

describe("parseOwn", () => {
  test("empty display case returns empty lists", async () => {
    const html = await loadFixture(__dirname, "displaycase_own_empty.html");
    expect(DisplayCase.parseOwn(html)).toStrictEqual({ shelves: [], items: [] });
  });

  test("parses single shelf with all items on -none-", async () => {
    const html = await loadFixture(__dirname, "displaycase_own_no_shelves.html");
    const { shelves, items } = DisplayCase.parseOwn(html);
    expect(shelves).toStrictEqual([{ id: 0, name: "-none-" }]);
    expect(items).toHaveLength(37);
    expect(items.every((i) => i.shelfId === 0)).toBe(true);
  });

  test("parses multiple shelves and assigns items correctly", async () => {
    const html = await loadFixture(__dirname, "displaycase_own_shelves.html");
    const { shelves, items } = DisplayCase.parseOwn(html);
    expect(shelves).toStrictEqual([
      { id: 0, name: "-none-" },
      { id: 1, name: "Being punctual" },
    ]);
    expect(items.filter((i) => i.shelfId === 1)).toStrictEqual([
      { id: 4557, name: "dollar sign", quantity: 1, shelfId: 1 },
      { id: 4558, name: "equal sign", quantity: 1, shelfId: 1 },
      { id: 4555, name: "left bracket", quantity: 1, shelfId: 1 },
      { id: 4552, name: "left parenthesis", quantity: 1, shelfId: 1 },
      { id: 4554, name: "percent sign", quantity: 1, shelfId: 1 },
      { id: 4556, name: "right parenthesis", quantity: 1, shelfId: 1 },
    ]);
  });

  test("decodes HTML entities in item names", async () => {
    const html = await loadFixture(__dirname, "displaycase_own_no_shelves.html");
    const { items } = DisplayCase.parseOwn(html);
    expect(items.find((i) => i.id === 5867)?.name).toBe("papier-mâché toothpicks");
  });

  test("parses quantity from item name", async () => {
    const html = await loadFixture(__dirname, "displaycase_own_no_shelves.html");
    const { items } = DisplayCase.parseOwn(html);
    expect(items.find((i) => i.id === 4448)).toMatchObject({ name: "Instant Karma", quantity: 10 });
    expect(items.find((i) => i.id === 10601)).toMatchObject({ name: "Thwaitgold slug statuette", quantity: 78 });
  });
});

describe("parsePlayer", () => {
  test("returns null when page has no display case header", () => {
    expect(DisplayCase.parsePlayer("<html>not a display case</html>", 99)).toBeNull();
  });

  test("returns null when player has no display case", async () => {
    const html = await loadFixture(__dirname, "displaycase_player_no_case.html");
    expect(DisplayCase.parsePlayer(html, 1199739)).toBeNull();
  });

  test("parses player name and named shelves (no -none- shelf)", async () => {
    const html = await loadFixture(__dirname, "displaycase_player6.html");
    const result = DisplayCase.parsePlayer(html, 6);
    expect(result?.playerName).toBe("Multi Czar");
    expect(result?.description).toBeNull();
    expect(result?.shelves.map((s) => s.name)).toStrictEqual([
      "Three rings for the Pork-Elves under their sky",
      "Seven for the dork-lords in their halls of stone",
      "Nine for Crimbo wreaths doomed to die",
    ]);
  });

  test("de-duplicates repeated items into quantity", async () => {
    const html = await loadFixture(__dirname, "displaycase_player6.html");
    const result = DisplayCase.parsePlayer(html, 6);
    const wreathShelf = result?.shelves.find((s) => s.name.includes("Nine"));
    expect(wreathShelf?.items).toStrictEqual([
      {
        name: "tiny plastic Crimbo wreath",
        descId: 690354273,
        image: "https://d2uyhvukfffg5a.cloudfront.net/itemimages/figwreath.gif",
        quantity: 9,
      },
    ]);
  });

  test("parses description when present", async () => {
    const html = await loadFixture(__dirname, "displaycase_player1.html");
    const result = DisplayCase.parsePlayer(html, 1);
    expect(result?.playerName).toBe("Jick");
    expect(result?.description).toBe("This is my collection of flyswatter.I'm so proud.");
  });

  test("strips HTML tags from description", async () => {
    const html = await loadFixture(__dirname, "displaycase_holderofsecrets.html");
    const result = DisplayCase.parsePlayer(html, 216194);
    expect(result?.description).not.toMatch(/<[^>]+>/);
    expect(result?.description).toContain("This DC is dedicated to the admins");
  });

  test("parses large display case correctly", async () => {
    const html = await loadFixture(__dirname, "displaycase_holderofsecrets.html");
    const result = DisplayCase.parsePlayer(html, 216194);
    expect(result?.playerName).toBe("HOldeRofSecrEts");
    expect(result?.shelves).toHaveLength(2);
    const mainShelf = result?.shelves.find((s) => s.name === "Display Case");
    expect(mainShelf?.items.length).toBeGreaterThan(10000);
  });
});

describe("hasDisplayCase", () => {
  const client = new Client("", "");
  const displayCase = new DisplayCase(client);

  test("returns false when player has no display case", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "displaycase_no_case.html"),
    );
    expect(await displayCase.hasDisplayCase()).toBe(false);
  });
});

describe("deposit", () => {
  const client = new Client("", "");
  const displayCase = new DisplayCase(client);

  test("returns success when response contains moved message", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      "<b>Instant Karma</b> moved from inventory to case",
    );
    expect(await displayCase.deposit(4448, 1)).toStrictEqual({ success: true });
  });

  test("returns no display case failure", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "displaycase_withdraw_no_case.html"),
    );
    expect(await displayCase.deposit(4448, 1)).toStrictEqual({
      success: false,
      reason: "No display case",
    });
  });

  test("returns unknown failure on unexpected response", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce("<html>something went wrong</html>");
    expect(await displayCase.deposit(4448, 1)).toStrictEqual({
      success: false,
      reason: "Unknown",
    });
  });
});

describe("withdraw", () => {
  const client = new Client("", "");
  const displayCase = new DisplayCase(client);

  test("returns success when response contains moved message", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      "<b>Instant Karma</b> moved from case to inventory",
    );
    expect(await displayCase.withdraw(4448, 1)).toStrictEqual({ success: true });
  });

  test("returns no display case failure", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "displaycase_withdraw_no_case.html"),
    );
    expect(await displayCase.withdraw(4448, 1)).toStrictEqual({
      success: false,
      reason: "No display case",
    });
  });
});
