import type { ChatInputCommandInteraction } from "discord.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { findPlayerWithRaffleWins } = vi.hoisted(() => ({
  findPlayerWithRaffleWins: vi.fn(),
}));

const { resolve } = vi.hoisted(() => ({ resolve: vi.fn() }));

vi.mock("../clients/database.js", () => ({ findPlayerWithRaffleWins }));

vi.mock("../clients/kol.js", () => ({
  kolClient: { players: { resolve } },
}));

const { identifyPlayer, identifyPlayerOrSelf, validPlayerIdentifier } =
  await import("./_player.js");

const GAUSIE = { id: 1197090, name: "gausie" };

const DISCORD_ID = "141813190901137408";

function mockInteraction(player: string | null) {
  return {
    options: { getString: vi.fn(() => player) },
    user: { id: DISCORD_ID },
  } as unknown as ChatInputCommandInteraction;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Player validation", () => {
  test("real queries pass validation", () => {
    const validQueries = [
      "beldur",
      "Butts McGruff",
      "greenfrog74",
      "Manendra",
      "monkeyman200",
      "phreddrickkv2",
      "gausie",
      "SSBBHax",
      "captain scotch",
      "Shiverwarp",
      "zarefore",
      "1197090",
    ];

    for (const query of validQueries) {
      expect(validPlayerIdentifier(query), query).toBe(true);
    }
  });

  test("fake queries fail validation", () => {
    const invalidQueries = ["1gausie", "f@rt"];

    for (const query of invalidQueries) {
      expect(validPlayerIdentifier(query), query).toBe(false);
    }
  });
});

describe("identifyPlayer", () => {
  test("points an unverified mention at /claim", async () => {
    findPlayerWithRaffleWins.mockResolvedValue(null);

    expect(await identifyPlayer(`<@${DISCORD_ID}>`)).toBe(
      "That user hasn't claimed a KoL account, so I don't know who they are in-game.",
    );
  });

  test("resolves a verified mention", async () => {
    const knownPlayer = { playerId: 1197090, discordId: DISCORD_ID };
    findPlayerWithRaffleWins.mockResolvedValue(knownPlayer);
    resolve.mockResolvedValue(GAUSIE);

    expect(await identifyPlayer(`<@${DISCORD_ID}>`)).toEqual([
      GAUSIE,
      knownPlayer,
    ]);
    expect(findPlayerWithRaffleWins).toHaveBeenCalledWith({
      discordId: DISCORD_ID,
    });
  });

  test("only treats input that is nothing but a mention as one", async () => {
    resolve.mockResolvedValue(null);

    expect(await identifyPlayer(`gausie <@${DISCORD_ID}>`)).toBe(
      `According to KoL, player gausie <@${DISCORD_ID}> does not exist.`,
    );
    expect(findPlayerWithRaffleWins).not.toHaveBeenCalled();
  });
});

describe("identifyPlayerOrSelf", () => {
  test("identifies the player named in the option", async () => {
    resolve.mockResolvedValue(GAUSIE);
    findPlayerWithRaffleWins.mockResolvedValue(null);

    expect(await identifyPlayerOrSelf(mockInteraction("gausie"))).toEqual([
      GAUSIE,
      null,
    ]);
    expect(resolve).toHaveBeenCalledWith("gausie");
  });

  test("falls back to the caller's claimed account", async () => {
    const knownPlayer = { playerId: 1197090, discordId: DISCORD_ID };
    findPlayerWithRaffleWins.mockResolvedValue(knownPlayer);
    resolve.mockResolvedValue(GAUSIE);

    expect(await identifyPlayerOrSelf(mockInteraction(null))).toEqual([
      GAUSIE,
      knownPlayer,
    ]);
    expect(findPlayerWithRaffleWins).toHaveBeenCalledWith({
      discordId: DISCORD_ID,
    });
  });

  test("points an unverified caller at /claim", async () => {
    findPlayerWithRaffleWins.mockResolvedValue(null);

    expect(await identifyPlayerOrSelf(mockInteraction(null))).toBe(
      "You haven't claimed a KoL account, so you'll have to tell me which player you mean or link one by running `/claim`.",
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  test("treats a mention of yourself as yourself", async () => {
    findPlayerWithRaffleWins.mockResolvedValue(null);

    expect(
      await identifyPlayerOrSelf(mockInteraction(`<@${DISCORD_ID}>`)),
    ).toBe(
      "You haven't claimed a KoL account, so you'll have to tell me which player you mean or link one by running `/claim`.",
    );
  });
});
