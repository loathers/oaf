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
} = vi.hoisted(() => ({
  upsertPlayerInfo: vi.fn(),
  upsertDailySubmission: vi.fn(),
  clearDailySubmissions: vi.fn(),
  getSubmissionSummaryForKey: vi.fn(),
  getDaily: vi.fn(),
  upsertDaily: vi.fn(),
  deleteDaily: vi.fn(),
  getDissentersForKey: vi.fn().mockResolvedValue([]),
}));

const { alert } = vi.hoisted(() => ({
  alert: vi.fn(),
}));

const { updateGlobalsMessage } = vi.hoisted(() => ({
  updateGlobalsMessage: vi.fn(),
}));

const { playersFetch } = vi.hoisted(() => ({
  playersFetch: vi.fn(),
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
}));

vi.mock("../../clients/discord.js", () => ({
  discordClient: { alert },
}));

vi.mock("../../clients/kol.js", () => ({
  kolClient: {
    on: vi.fn(),
    players: { fetch: playersFetch },
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

vi.mock("../../clients/LoathingDate.js", () => ({
  LoathingDate: { gameDayFromRealDate },
}));

vi.mock("../../config.js", () => ({
  config: { KOL_USER: "oaf", KOL_PASS: "pass" },
}));

const { handleSubmission } = await import("./crowdsource.js");

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
  });

  describe("consensus reached (topCount >= threshold)", () => {
    test("creates daily with thresholdReached=true and alerts on new consensus", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 5));
      getDaily.mockResolvedValueOnce(undefined);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(upsertDaily).toHaveBeenCalledWith(
        "snootee",
        100,
        "testvalue",
        true,
      );
      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("Consensus reached"),
      );
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("alerts when value changes at consensus", async () => {
      getSubmissionSummaryForKey.mockResolvedValueOnce(summary(5, 6, "new"));
      getDaily.mockResolvedValueOnce({
        key: "snootee",
        gameday: 100,
        value: "old",
        thresholdReached: true,
      });

      await handleSubmission(1, "player", "snootee:new");

      expect(upsertDaily).toHaveBeenCalledWith("snootee", 100, "new", true);
      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("Consensus reached"),
      );
      expect(updateGlobalsMessage).toHaveBeenCalled();
    });

    test("alerts when preliminary value reaches consensus", async () => {
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
      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("Consensus reached"),
      );
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
      playersFetch.mockResolvedValueOnce({ name: "Player One" });

      await handleSubmission(1, "Player One", "snootee:wrongvalue");

      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("Disagreeing submission"),
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
        },
      ]);

      await handleSubmission(1, "player", "snootee:testvalue");

      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining("Dissenters"),
      );
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
