import { describe, expect, test, vi } from "vitest";
import { resolveKoLImage } from "./utils/utils.js";
import { Player } from "./Player.js";
import { expectNotNull, loadFixture } from "./testUtils.js";
import { Client } from "./Client.js";

const { json, text } = vi.hoisted(() => ({ json: vi.fn(), text: vi.fn() }));

vi.mock("./Client.js", async (importOriginal) => {
  const client = await importOriginal<typeof import("./Client.js")>();
  client.Client.prototype.login = async () => true;
  client.Client.prototype.checkLoggedIn = async () => true;
  client.Client.prototype.fetchText = text;
  client.Client.prototype.fetchJson = json;
  return client;
});

const client = new Client("", "");

describe("Player.parseSearch", () => {
  test("Can parse a player search result", async () => {
    const html = await loadFixture(__dirname, "searchplayer_mad_carew.html");
    const result = Player.parseSearch(html);

    expectNotNull(result);
    expect(result.id).toBe(263717);
    expect(result.name).toBe("Mad Carew");
  });

  test("Can parse a player in Valhalla", async () => {
    const html = await loadFixture(__dirname, "searchplayer_beldur.html");
    const result = Player.parseSearch(html);

    expectNotNull(result);
    expect(result.id).toBe(1046951);
    expect(result.name).toBe("Beldur");
    expect(result.level).toBe(0);
    expect(result.kolClass).toBe("Astral Spirit");
  });
});

describe("Player.Profiled.parseProfile", () => {
  test("Can parse a profile picture", async () => {
    const html = await loadFixture(__dirname, "showplayer_regular.html");
    const result = await Player.Profiled.parseProfile(html);

    expectNotNull(result);
    expect(result.avatar).toContain("<svg");
  });

  test("Can parse a profile picture on dependence day", async () => {
    const html = await loadFixture(__dirname, "showplayer_dependence_day.html");
    const result = await Player.Profiled.parseProfile(html);

    expectNotNull(result);
    expect(result.avatar).toContain("<svg");
  });

  test("Can parse an avatar when the player has been painted gold", async () => {
    const html = await loadFixture(__dirname, "showplayer_golden_gun.html");
    const result = await Player.Profiled.parseProfile(html);

    expectNotNull(result);
    expect(result.avatar).toContain("<svg");
  });
});

describe("Player class", () => {
  test("toString returns formatted string", () => {
    const player = new Player(client, 1197090, "gausie");
    expect(player.toString()).toBe("gausie (#1197090)");
  });

  test("matches by id", () => {
    const player = new Player(client, 1197090, "gausie");
    expect(player.matches(1197090)).toBe(true);
    expect(player.matches(999)).toBe(false);
  });

  test("matches by name case-insensitively", () => {
    const player = new Player(client, 1197090, "gausie");
    expect(player.matches("gausie")).toBe(true);
    expect(player.matches("GAUSIE")).toBe(true);
    expect(player.matches("other")).toBe(false);
  });

  test("Profiled.fetch() returns itself", async () => {
    const profiled = new Player.Profiled(client, {
      id: 1,
      name: "test",
      level: 15,
      kolClass: "Sauceror",
      avatar: "test.gif",
      ascensions: 100,
      trophies: 5,
      tattoos: 3,
      favoriteFood: null,
      favoriteBooze: null,
      createdDate: new Date(),
      lastLogin: new Date(),
      hasDisplayCase: false,
    });
    expect(await profiled.fetch()).toBe(profiled);
  });
});

test("Can resolve KoL images", () => {
  expect(resolveKoLImage("/iii/otherimages/classav31_f.gif")).toBe(
    "https://s3.amazonaws.com/images.kingdomofloathing.com/otherimages/classav31_f.gif",
  );
  expect(resolveKoLImage("/itemimages/oaf.gif")).toBe(
    "https://s3.amazonaws.com/images.kingdomofloathing.com/itemimages/oaf.gif",
  );
  expect(
    resolveKoLImage(
      "https://s3.amazonaws.com/images.kingdomofloathing.com/itemimages/oaf.gif",
    ),
  ).toBe(
    "https://s3.amazonaws.com/images.kingdomofloathing.com/itemimages/oaf.gif",
  );
});
