import * as path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadFixture } from "../testUtils.js";
import { Client } from "../Client.js";
import { Player } from "../Player.js";

const fixturesDir = path.resolve(import.meta.dirname, "..");

const { json, text } = vi.hoisted(() => ({ json: vi.fn(), text: vi.fn() }));

vi.mock("../Client.js", async (importOriginal) => {
  const client = await importOriginal<typeof import("../Client.js")>();
  client.Client.prototype.login = async () => true;
  client.Client.prototype.checkLoggedIn = async () => true;
  client.Client.prototype.fetchText = text;
  client.Client.prototype.fetchJson = json;
  return client;
});

let client: Client;

beforeEach(() => {
  vi.clearAllMocks();
  client = new Client("", "");
});

describe("Players.resolve", () => {
  test("resolves a player by name via search", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );

    const player = await client.players.resolve("mad carew");

    expect(player).not.toBeNull();
    expect(player!.id).toBe(263717);
    expect(player!.name).toBe("Mad Carew");
    expect(player).toBeInstanceOf(Player);
    expect(player).not.toBeInstanceOf(Player.Profiled);
  });

  test("returns null for unknown player", async () => {
    text.mockResolvedValueOnce("<html>No results</html>");

    const player = await client.players.resolve("nonexistent");

    expect(player).toBeNull();
  });

  test("returns cached player on second call", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );

    const first = await client.players.resolve("mad carew");
    const second = await client.players.resolve("Mad Carew");

    expect(first).toBe(second);
    expect(text).toHaveBeenCalledTimes(1);
  });

  test("can resolve by id after resolving by name", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );

    const byName = await client.players.resolve("mad carew");
    const byId = await client.players.resolve(263717);

    expect(byName).toBe(byId);
    expect(text).toHaveBeenCalledTimes(1);
  });
});

describe("Players.fetch", () => {
  test("fetches a full profile", async () => {
    // First call: search
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );
    // Second call: whois (for id resolution)
    // Third call: profile
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "showplayer_regular.html"),
    );

    const profiled = await client.players.fetch("mad carew");

    expect(profiled).not.toBeNull();
    expect(profiled).toBeInstanceOf(Player.Profiled);
    expect(profiled!.id).toBe(263717);
    expect(profiled!.avatar).toContain("<svg");
    expect(profiled!.ascensions).toBeGreaterThan(0);
  });

  test("returns cached Profiled on second call", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "showplayer_regular.html"),
    );

    const first = await client.players.fetch("mad carew");
    const second = await client.players.fetch(263717);

    expect(first).toBe(second);
  });

  test("returns null when profile parsing fails", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(fixturesDir, "searchplayer_mad_carew.html"),
    );
    text.mockResolvedValueOnce("<html>Not a profile</html>");

    const profiled = await client.players.fetch("mad carew");

    expect(profiled).toBeNull();
  });
});

describe("Players.getNameFromId", () => {
  test("parses name from whois response", async () => {
    text.mockResolvedValueOnce(
      '<a target=mainpane href="showplayer.php?who=263717"><b>Mad Carew (#263717)</b></a>',
    );

    const name = await client.players.getNameFromId(263717);

    expect(name).toBe("Mad Carew");
  });

  test("returns null on error", async () => {
    text.mockRejectedValueOnce(new Error("network error"));

    const name = await client.players.getNameFromId(999);

    expect(name).toBeNull();
  });
});
