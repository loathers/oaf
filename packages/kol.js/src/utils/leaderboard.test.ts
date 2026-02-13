import { describe, expect, it } from "vitest";
import { loadFixture } from "../testUtils.js";
import { parseLeaderboard } from "./leaderboard.js";

describe("Leaderboards", () => {
  it("can parse a regular path leaderboard", async () => {
    const page = await loadFixture(__dirname, "leaderboard_wotsf.html");
    const leaderboard = parseLeaderboard(page);

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
