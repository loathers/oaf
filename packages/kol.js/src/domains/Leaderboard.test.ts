import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFixture } from "../testUtils.js";
import { Leaderboard } from "./Leaderboard.js";

describe("Leaderboards", () => {
  it("can parse a regular path leaderboard", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "leaderboard_wotsf.html",
    );
    const leaderboard = Leaderboard.parse(page);

    // Group name
    expect(leaderboard.name).toBe(
      "Way of the Surprising Fist (Frozen) Leaderboards",
    );

    // Hardcore and normal should both be detected, and no more.
    expect(leaderboard.boards).toHaveLength(2);

    // Hardcore
    const hardcore = leaderboard.boards[0];
    expect(hardcore.name).toBe(
      "Fastest Hardcore Way of the Surprising Fist Ascensions",
    );

    expect(hardcore.runs).toHaveLength(35);
    expect(hardcore.runs[0].playerName).toBe("Iron Bob (AT)");
    expect(hardcore.runs[0].playerId).toBe(592920);
    expect(hardcore.runs[0].days).toBe("3");
    expect(hardcore.runs[0].turns).toBe("712");
    expect(hardcore.updated).toStrictEqual(
      new Date("2024-11-21T02:34:30-07:00"),
    );

    // Softcore
    const softcore = leaderboard.boards[1];
    expect(softcore.name).toBe(
      "Fastest Normal Way of the Surprising Fist Ascensions",
    );
    expect(softcore.runs).toHaveLength(35);
    expect(softcore.runs[34].playerName).toBe("Jesusisagurl (SC)");
    expect(softcore.runs[34].playerId).toBe(1992917);
    expect(softcore.runs[34].days).toBe("3");
    expect(softcore.runs[34].turns).toBe("583");
    expect(softcore.updated).toStrictEqual(
      new Date("2024-11-21T02:34:31-07:00"),
    );
  });
});

describe("Leaderboard.parseRecent", () => {
  it("parses unique recent ascenders", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "museum_recent_ascensions.html",
    );
    // 500 ascensions but only 405 unique players
    expect(Leaderboard.parseRecent(page)).toHaveLength(405);
  });

  it("handles early-month date format", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "museum_recent_ascensions_broken.html",
    );
    const recent = Leaderboard.parseRecent(page);
    expect(recent).toContainEqual({ id: 892618, name: "ReveRKiller" });
    expect(recent).toHaveLength(412);
  });
});

describe("boardIdForStandardYear", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 999 for the current year", () => {
    vi.useFakeTimers({ now: new Date("2026-06-15") });
    expect(Leaderboard.boardIdForStandardYear(2026)).toBe(999);
  });

  it("returns the correct id for a past year", () => {
    expect(Leaderboard.boardIdForStandardYear(2015)).toBe(998);
    expect(Leaderboard.boardIdForStandardYear(2016)).toBe(997);
    expect(Leaderboard.boardIdForStandardYear(2020)).toBe(993);
  });
});
