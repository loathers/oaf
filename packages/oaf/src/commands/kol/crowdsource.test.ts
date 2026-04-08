/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SubmissionSummary } from "../../clients/database.js";

const {
  upsertPlayerInfo,
  upsertDailySubmission,
  clearDailySubmissions,
  getSubmissionSummaryForKey,
  getDaily,
  upsertDaily,
  deleteDaily,
  getDissentersForKey,
  isPlayerIgnoredForCrowdsourcing,
} = vi.hoisted(() => ({
  upsertPlayerInfo: vi.fn(),
  upsertDailySubmission: vi.fn(),
  clearDailySubmissions: vi.fn(),
  getSubmissionSummaryForKey: vi.fn(),
  getDaily: vi.fn(),
  upsertDaily: vi.fn(),
  deleteDaily: vi.fn(),
  getDissentersForKey: vi.fn().mockResolvedValue([]),
  isPlayerIgnoredForCrowdsourcing: vi.fn().mockResolvedValue(false),
}));

const { alert } = vi.hoisted(() => ({
  alert: vi.fn(),
}));

const { updateGlobalsMessage } = vi.hoisted(() => ({
  updateGlobalsMessage: vi.fn(),
}));

const { playersResolve } = vi.hoisted(() => ({
  playersResolve: vi.fn(),
}));

vi.mock("../../clients/database.js", () => ({
  upsertPlayerInfo,
  upsertDailySubmission,
  clearDailySubmissions,
  getSubmissionSummaryForKey,
  getDaily,
  upsertDaily,
  deleteDaily,
  getDissentersForKey,
  isPlayerIgnoredForCrowdsourcing,
}));

vi.mock("../../clients/discord.js", () => ({
  discordClient: { alert, on: vi.fn() },
}));

vi.mock("../../clients/kol.js", () => ({
  kolClient: {
    on: vi.fn(),
    players: { resolve: playersResolve },
  },
}));

vi.mock("../misc/_globals.js", () => ({
  CONSENSUS_THRESHOLD: 5,
  DAILY_GLOBALS: [
    { key: "snootee", displayName: "Chez Snootée", crowdsourced: true },
    {
      key: "microbrewery",
      displayName: "Gnomish Microbrewery",
      crowdsourced: true,
    },
    { key: "jickjar", displayName: "Jick Jar", crowdsourced: true },
    {
      key: "votemonster",
      displayName: "Voting Booth Monster",
      crowdsourced: true,
    },
    {
      key: "socp",
      displayName: "Skeleton of Crimbo Past",
      crowdsourced: false,
    },
  ],
  updateGlobalsMessage,
}));

const { gameDayFromRealDate } = vi.hoisted(() => ({
  gameDayFromRealDate: vi.fn().mockReturnValue(100),
}));

vi.mock("kol.js", async (importOriginal) => ({
  ...(await importOriginal()),
  LoathingDate: { gameDayFromRealDate },
}));

vi.mock("../../config.js", () => ({
  config: { KOL_USER: "oaf", KOL_PASS: "pass" },
}));

const { handleSubmission, parseSubmission } = await import("./crowdsource.js");

function summary(
  topCount: number,
  totalCount: number,
  value = "testvalue",
): SubmissionSummary {
  return { key: "snootee", value, topCount, totalCount };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseSubmission", () => {
  test("parses a simple key:value pair", () => {
    expect(parseSubmission("snootee:12412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("lowercases the key", () => {
    expect(parseSubmission("Snootee:12412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("trims whitespace from key and value", () => {
    expect(parseSubmission("  snootee : 12412 ")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("splits on the first colon only", () => {
    expect(parseSubmission("jickjar:bar:baz")).toEqual({
      key: "jickjar",
      value: "bar:baz",
    });
  });

  test("returns null for unknown keys", () => {
    expect(parseSubmission("unknown:12345")).toBeNull();
    expect(parseSubmission("foo:bar")).toBeNull();
  });

  test("accepts all known keys", () => {
    expect(parseSubmission("snootee:1")).toEqual({
      key: "snootee",
      value: "1",
    });
    expect(parseSubmission("microbrewery:2")).toEqual({
      key: "microbrewery",
      value: "2",
    });
    expect(parseSubmission("jickjar:3")).toEqual({
      key: "jickjar",
      value: "3",
    });
    expect(parseSubmission("votemonster:4")).toEqual({
      key: "votemonster",
      value: "4",
    });
  });

  test("returns null for messages without a colon", () => {
    expect(parseSubmission("claim")).toBeNull();
  });

  test("returns null for messages starting with a colon", () => {
    expect(parseSubmission(":value")).toBeNull();
  });

  test("returns null for empty value after colon", () => {
    expect(parseSubmission("snootee:")).toBeNull();
    expect(parseSubmission("snootee:   ")).toBeNull();
  });

  test("returns null for empty key before colon", () => {
    expect(parseSubmission(" :value")).toBeNull();
  });

  test("strips zero-width spaces", () => {
    expect(parseSubmission("sno\u200Botee:12\u200B412")).toEqual({
      key: "snootee",
      value: "12412",
    });
    expect(parseSubmission("sno&#8203;otee:12&#8203;412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("handles values with spaces", () => {
    expect(parseSubmission("microbrewery:some thing")).toEqual({
      key: "microbrewery",
      value: "some thing",
    });
  });
});

describe("handleSubmission", () => {
  test("ignores unparseable messages", async () => {
    await handleSubmission(1, "player", "gibberish");
    expect(upsertDailySubmission).not.toHaveBeenCalled();
  });

  test("ignores messages for unknown keys", async () => {
    await handleSubmission(1, "player", "unknown:value");
    expect(upsertDailySubmission).not.toHaveBeenCalled();
  });

  test("upserts player info and submission for valid messages", async () => {
    getSubmissionSummaryForKey.mockResolvedValueOnce(null);

    await handleSubmission(1, "player", "snootee:testvalue");

    expect(upsertPlayerInfo).toHaveBeenCalledWith(1, "player");
    expect(upsertDailySubmission).toHaveBeenCalledWith(
      "snootee",
      "testvalue",
      1,
      100,
    );
    expect(clearDailySubmissions).toHaveBeenCalledWith(100);
  });

  test("uses provided time for gameday, not current time", async () => {
    // Before rollover — should resolve to the previous gameday
    const whisperTime = new Date("2026-03-22T03:00:00Z");
    gameDayFromRealDate.mockImplementation((d: Date) =>
      d.getTime() === whisperTime.getTime() ? 99 : 100,
    );
    getSubmissionSummaryForKey.mockResolvedValueOnce(null);

    await handleSubmission(1, "player", "snootee:testvalue", whisperTime);

    expect(gameDayFromRealDate).toHaveBeenCalledWith(whisperTime);
    expect(upsertDailySubmission).toHaveBeenCalledWith(
      "snootee",
      "testvalue",
      1,
      99,
    );
    expect(clearDailySubmissions).toHaveBeenCalledWith(99);
  });

  describe("consensus reached (topCount >= threshold)", () => {
    test("creates daily with thresholdReached=true on new consensus", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 5));
      getDaily.mockResolvedValueOnce(undefined);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalledWith(
        "snootee",
        100,
        "testvalue",
        true,
      );
      expect(alert).not.toHaveBeenCalled();
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("updates daily when value changes at consensus without dissent", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 5, "new"));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "old",
        thresholdReached: true,
      });

      await handleSubmission(1, "player", "snootee:new");

      expect(upsertDaily).toHaveBeenCalledWith("snootee", 100, "new", true);
      expect(alert).not.toHaveBeenCalled();
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("updates daily when preliminary value reaches consensus without dissent", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 5));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "testvalue",
        thresholdReached: false,
      });

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalledWith(
        "snootee",
        100,
        "testvalue",
        true,
      );
      expect(alert).not.toHaveBeenCalled();
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("does not alert for duplicate consensus submission", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(6, 6));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "testvalue",
        thresholdReached: true,
      });

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
      expect(updateGlobalsMessage).not.toHaveBeenCalled();
    });

    test("alerts disagreeing submission against existing consensus", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(6, 7));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "testvalue",
        thresholdReached: true,
      });
      playersResolve.mockResolvedValueOnce({ name: "Player One" });

      await handleSubmission(1, "Player One", "snootee:wrongvalue");

      expect(alert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Disagreeing submission"),
        }),
      );
      expect(updateGlobalsMessage).not.toHaveBeenCalled();
    });

    test("includes dissenters in consensus alert", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 6));
      getDaily.mockResolvedValueOnce(undefined);
      getDissentersForKey.mockResolvedValueOnce([
        {
          playerId: 2,
          playerName: "Rebel",
          discordId: "123",
          value: "other",
          crowdsourcingIgnored: false,
        },
      ]);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(alert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Dissenters"),
        }),
      );
    });

    test("does not alert when all dissenters are ignored", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 6));
      getDaily.mockResolvedValueOnce(undefined);
      getDissentersForKey.mockResolvedValueOnce([
        {
          playerId: 2,
          playerName: "Rebel",
          discordId: "123",
          value: "other",
          crowdsourcingIgnored: true,
        },
      ]);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(alert).not.toHaveBeenCalled();
    });

    test("does not alert for disagreeing submission from ignored player", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(6, 7));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "testvalue",
        thresholdReached: true,
      });
      isPlayerIgnoredForCrowdsourcing.mockResolvedValueOnce(true);

      await handleSubmission(1, "player", "snootee:wrongvalue");

      expect(alert).not.toHaveBeenCalled();
    });
  });

  describe("sub-threshold unanimous", () => {
    test("stores preliminary value with thresholdReached=false", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(2, 2));
      getDaily.mockResolvedValueOnce(undefined);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalledWith(
        "snootee",
        100,
        "testvalue",
        false,
      );
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("updates globals when preliminary value changes", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(2, 2, "new"));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "old",
        thresholdReached: false,
      });

      await handleSubmission(1, "player", "snootee:new");

      expect(upsertDaily).toHaveBeenCalledWith("snootee", 100, "new", false);
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("does not update globals when preliminary value is unchanged", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(3, 3));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "testvalue",
        thresholdReached: false,
      });

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalledWith(
        "snootee",
        100,
        "testvalue",
        false,
      );
      expect(updateGlobalsMessage).not.toHaveBeenCalled();
    });

    test("does not alert discord for sub-threshold values", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(2, 2));
      getDaily.mockResolvedValueOnce(undefined);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(alert).not.toHaveBeenCalled();
    });
  });

  describe("sub-threshold with dissent", () => {
    test("deletes daily row and updates globals", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(2, 3));

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(deleteDaily).toHaveBeenCalledWith("snootee", 100);
      expect(updateGlobalsMessage).toHaveBeenCalled();
      expect(upsertDaily).not.toHaveBeenCalled();
    });

    test("does not alert discord", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(2, 3));

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(alert).not.toHaveBeenCalled();
    });
  });
});
