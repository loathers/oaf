import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { getLatestPvpSeason, upsertPvpSeason } = vi.hoisted(() => ({
  getLatestPvpSeason: vi.fn(),
  upsertPvpSeason: vi.fn(),
}));

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

const { getCurrentSeason } = vi.hoisted(() => ({ getCurrentSeason: vi.fn() }));

const { on } = vi.hoisted(() => ({ on: vi.fn() }));

vi.mock("../../clients/database.js", () => ({
  getLatestPvpSeason,
  upsertPvpSeason,
}));

vi.mock("../../clients/discord.js", () => ({
  discordClient: { alert, on: vi.fn() },
}));

vi.mock("../../clients/kol.js", () => ({ kolClient: { on } }));

vi.mock("kol.js/domains/Pvp", () => ({
  Pvp: class {
    getCurrentSeason = getCurrentSeason;
  },
}));

const { init } = await import("./pvp.js");

init();
const rolloverHandler = on.mock.calls.find(
  ([event]) => event === "rollover",
)![1] as () => void;

const DAY = 24 * 60 * 60 * 1000;

const JITTER = 2 * 60 * 1000;

type Season = {
  number: number;
  name: string;
  start: string;
  nextStart: string;
};

const SEASONS: Season[] = [
  {
    number: 83,
    name: "Numeric Season",
    start: "2026-01-01T03:30:00Z",
    nextStart: "2026-03-01T03:30:00Z",
  },
  {
    number: 84,
    name: "Ironic Season",
    start: "2026-03-01T03:30:00Z",
    nextStart: "2026-05-01T03:30:00Z",
  },
  {
    number: 85,
    name: "Seasoning Season",
    start: "2026-05-01T03:30:00Z",
    nextStart: "2026-07-01T03:30:00Z",
  },
  {
    number: 86,
    name: "Optimal Season",
    start: "2026-07-01T03:30:00Z",
    nextStart: "2026-09-01T03:30:00Z",
  },
  {
    number: 87,
    name: "Bear Season",
    start: "2026-09-01T03:30:00Z",
    nextStart: "2026-11-01T03:30:00Z",
  },
];

function stored(season: Season) {
  return {
    seasonNumber: season.number,
    seasonName: season.name,
    startDate: new Date(season.start),
  };
}

function* rolloversDuring(season: Season) {
  const end = new Date(season.nextStart).getTime();
  for (let t = new Date(season.start).getTime() + DAY; t < end; t += DAY) {
    yield new Date(t + JITTER);
  }
}

async function rollover(at: Date) {
  vi.setSystemTime(at);
  rolloverHandler();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Date only, so the real setTimeout that drains the handler still fires.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PvP season sync", () => {
  test.each(SEASONS)(
    "leaves season $number alone on every day it is already the current season",
    async (season) => {
      getCurrentSeason.mockResolvedValue({
        seasonNumber: season.number,
        seasonName: season.name,
      });

      const rewritten: string[] = [];
      for (const at of rolloversDuring(season)) {
        getLatestPvpSeason.mockResolvedValue(stored(season));
        upsertPvpSeason.mockClear();
        await rollover(at);
        if (upsertPvpSeason.mock.calls.length > 0) {
          rewritten.push(at.toISOString().slice(0, 10));
        }
      }

      expect(rewritten).toEqual([]);
    },
  );

  test("records the incident that corrupted season 86", async () => {
    getLatestPvpSeason.mockResolvedValue(stored(SEASONS[3]));
    getCurrentSeason.mockResolvedValue({
      seasonNumber: 86,
      seasonName: "Optimal Season",
    });

    await rollover(new Date("2026-08-30T03:32:17Z"));

    expect(upsertPvpSeason).not.toHaveBeenCalled();
  });

  test("records a new season on the day it starts", async () => {
    getLatestPvpSeason.mockResolvedValue(stored(SEASONS[3]));
    getCurrentSeason.mockResolvedValue({
      seasonNumber: 87,
      seasonName: "Bear Season",
    });

    await rollover(new Date("2026-09-01T03:32:00Z"));

    expect(upsertPvpSeason).toHaveBeenCalledWith({
      seasonNumber: 87,
      seasonName: "Bear Season",
      startDate: new Date("2026-09-01T03:32:00Z"),
    });
  });

  test("retries the next day when the season start was missed", async () => {
    getLatestPvpSeason.mockResolvedValue(stored(SEASONS[3]));
    getCurrentSeason.mockResolvedValue({
      seasonNumber: 87,
      seasonName: "Bear Season",
    });

    await rollover(new Date("2026-09-02T03:32:00Z"));

    expect(upsertPvpSeason).toHaveBeenCalledWith(
      expect.objectContaining({ seasonNumber: 87, seasonName: "Bear Season" }),
    );
  });

  test("keeps retrying while a season is still unrecorded", async () => {
    getLatestPvpSeason.mockResolvedValue({
      seasonNumber: 86,
      seasonName: "Optimal Season",
      startDate: new Date("2026-08-30T03:32:17Z"),
    });
    getCurrentSeason.mockResolvedValue({
      seasonNumber: 87,
      seasonName: "Bear Season",
    });

    await rollover(new Date("2026-09-05T03:32:00Z"));

    expect(upsertPvpSeason).toHaveBeenCalledWith(
      expect.objectContaining({ seasonNumber: 87, seasonName: "Bear Season" }),
    );
  });

  test("alerts and writes nothing when the season cannot be parsed", async () => {
    getLatestPvpSeason.mockResolvedValue(stored(SEASONS[3]));
    getCurrentSeason.mockRejectedValue(
      new Error("Could not parse PvP season name from peevpee.php"),
    );

    await rollover(new Date("2026-09-01T03:32:00Z"));

    expect(upsertPvpSeason).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Failed to sync PvP season",
      undefined,
      expect.any(Error),
    );
  });
});
