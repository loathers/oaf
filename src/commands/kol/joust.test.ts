import type {
  BettingCounter,
  JoustOdds,
} from "kol.js/domains/RenaissanceTimes";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { getMrStoreItemByName, getJoustState, setJoustState } = vi.hoisted(
  () => ({
    getMrStoreItemByName: vi.fn(),
    getJoustState: vi.fn(),
    setJoustState: vi.fn(),
  }),
);

const { alert, send, guildsFetch } = vi.hoisted(() => ({
  alert: vi.fn(),
  send: vi.fn(),
  guildsFetch: vi.fn(),
}));

const { isRollover } = vi.hoisted(() => ({ isRollover: vi.fn() }));

const { getBettingCounter } = vi.hoisted(() => ({
  getBettingCounter: vi.fn(),
}));

const { config } = vi.hoisted(() => {
  const config: { GUILD_ID: string; JOUST_CHANNEL_ID?: string } = {
    GUILD_ID: "guild",
    JOUST_CHANNEL_ID: "joustchan",
  };
  return { config };
});

vi.mock("../../clients/database.js", () => ({
  getMrStoreItemByName,
  getJoustState,
  setJoustState,
}));

vi.mock("../../clients/discord.js", () => ({
  discordClient: {
    alert,
    once: vi.fn(),
    guilds: { fetch: guildsFetch },
  },
  createEmbed: vi.fn(() => {
    const embed = { setTitle: vi.fn(), addFields: vi.fn() };
    embed.setTitle.mockReturnValue(embed);
    embed.addFields.mockReturnValue(embed);
    return embed;
  }),
}));

vi.mock("../../clients/kol.js", () => ({
  kolClient: { isRollover },
}));

vi.mock("../../config.js", () => ({ config }));

vi.mock("kol.js", () => ({
  LoathingDate: {
    getRollover: () => new Date("2026-07-25T03:30:00Z"),
  },
}));

vi.mock("kol.js/domains/RenaissanceTimes", () => ({
  RenaissanceTimes: class {
    getBettingCounter = getBettingCounter;
  },
  KNIGHTS: ["Open Mic Knight", "Poker Knight", "Wedding Knight"],
}));

const { checkJoust, nextCheck } = await import("./joust.js");

// System time for checkJoust runs: Jul 25 2026 07:43 UTC
const NOW = new Date("2026-07-25T07:43:00Z");
const NEWEST_JOUST = "2026-07-25T07:00:00.000Z";

const OPEN_TOOLBELT = {
  addedToStore: new Date("2026-07-20T03:30:00Z"),
  removedFromStore: null,
};

const ODDS: JoustOdds = {
  "Open Mic Knight": 1,
  "Poker Knight": 57,
  "Wedding Knight": 41,
};

function counter(overrides: Partial<BettingCounter> = {}): BettingCounter {
  return {
    odds: null,
    lastWinner: "Poker Knight",
    history: [{ time: new Date(NEWEST_JOUST), winner: "Poker Knight" }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  config.JOUST_CHANNEL_ID = "joustchan";
  isRollover.mockReturnValue(false);
  getMrStoreItemByName.mockResolvedValue(OPEN_TOOLBELT);
  getBettingCounter.mockResolvedValue(counter());
  guildsFetch.mockResolvedValue({
    channels: {
      cache: new Map([["joustchan", { isTextBased: () => true, send }]]),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkJoust", () => {
  test("does nothing if no announcement channel is configured", async () => {
    config.JOUST_CHANNEL_ID = undefined;

    expect(await checkJoust()).toBe("skip");

    expect(getBettingCounter).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  test("does nothing during rollover", async () => {
    isRollover.mockReturnValue(true);

    expect(await checkJoust()).toBe("skip");

    expect(getBettingCounter).not.toHaveBeenCalled();
  });

  test("does nothing while the tower is closed", async () => {
    getMrStoreItemByName.mockResolvedValue(undefined);

    expect(await checkJoust()).toBe("skip");

    expect(getBettingCounter).not.toHaveBeenCalled();
  });

  test("skips quietly when the tower has faded (counter is null)", async () => {
    getBettingCounter.mockResolvedValue(null);

    expect(await checkJoust()).toBe("skip");

    expect(send).not.toHaveBeenCalled();
    expect(setJoustState).not.toHaveBeenCalled();
  });

  test("alerts and skips when the betting counter cannot be read", async () => {
    getBettingCounter.mockRejectedValue(new Error("boom"));

    expect(await checkJoust()).toBe("skip");

    expect(alert).toHaveBeenCalledWith(
      "checkJoust: could not read the betting counter",
      undefined,
      expect.any(Error),
    );
    expect(send).not.toHaveBeenCalled();
  });

  test("first ever check syncs state without posting", async () => {
    getBettingCounter.mockResolvedValue(counter({ odds: ODDS }));
    getJoustState.mockResolvedValue(null);

    expect(await checkJoust()).toBe("news");

    expect(send).not.toHaveBeenCalled();
    expect(setJoustState).toHaveBeenCalledWith({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: NEWEST_JOUST,
    });
  });

  test("announces a recent joust winner once, syncing older ones silently", async () => {
    getBettingCounter.mockResolvedValue(
      counter({
        history: [
          { time: new Date(NEWEST_JOUST), winner: "Poker Knight" },
          // Older than the 2h announce window: synced but not posted
          { time: new Date("2026-07-25T01:00:00Z"), winner: "Wedding Knight" },
        ],
      }),
    );
    getJoustState.mockResolvedValue({
      lastSeenJoustTime: "2026-07-24T23:00:00.000Z",
      oddsAnnouncedFor: null,
    });

    expect(await checkJoust()).toBe("news");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("🏆 Poker Knight won the joust!");
    expect(setJoustState).toHaveBeenCalledWith({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: null,
    });
  });

  test("does not re-announce a winner it has already seen", async () => {
    getJoustState.mockResolvedValue({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: null,
    });

    expect(await checkJoust()).toBe("quiet");

    expect(send).not.toHaveBeenCalled();
    expect(setJoustState).not.toHaveBeenCalled();
  });

  test("announces newly posted odds once", async () => {
    getBettingCounter.mockResolvedValue(counter({ odds: ODDS }));
    getJoustState.mockResolvedValue({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: null,
    });

    expect(await checkJoust()).toBe("news");

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as { content: string };
    expect(message.content).toContain("Odds are up");
    expect(setJoustState).toHaveBeenCalledWith({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: NEWEST_JOUST,
    });
  });

  test("does not re-announce odds for the same round", async () => {
    getBettingCounter.mockResolvedValue(counter({ odds: ODDS }));
    getJoustState.mockResolvedValue({
      lastSeenJoustTime: NEWEST_JOUST,
      oddsAnnouncedFor: NEWEST_JOUST,
    });

    expect(await checkJoust()).toBe("quiet");

    expect(send).not.toHaveBeenCalled();
    expect(setJoustState).not.toHaveBeenCalled();
  });
});

describe("nextCheck", () => {
  const midHour = new Date("2026-07-25T07:43:00Z");

  test("after news, waits until a minute past the next hour", () => {
    expect(nextCheck(midHour, "news", 3)).toEqual({
      delay: 18 * 60 * 1000,
      retries: 0,
    });
  });

  test("after a skipped check, waits until a minute past the next hour", () => {
    expect(nextCheck(midHour, "skip", 3)).toEqual({
      delay: 18 * 60 * 1000,
      retries: 0,
    });
  });

  test("with no news yet, retries in a minute", () => {
    expect(nextCheck(midHour, "quiet", 3)).toEqual({
      delay: 60 * 1000,
      retries: 4,
    });
  });

  test("gives up retrying after the cap and waits for the next hour", () => {
    expect(nextCheck(midHour, "quiet", 15)).toEqual({
      delay: 18 * 60 * 1000,
      retries: 0,
    });
  });
});
