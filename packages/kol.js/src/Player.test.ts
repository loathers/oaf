import { describe, expect, test, vi } from "vitest";
import { resolveKoLImage } from "./utils/utils.js";
import { Player } from "./Player.js";
import { expectNotNull, loadFixture } from "./testUtils.js";
import { Client } from "./Client.js";

const { json, text } = vi.hoisted(() => ({ json: vi.fn(), text: vi.fn() }));

vi.mock("./utils/visit.js", () => ({
  createSession: vi.fn().mockReturnValue({ json, text }),
}));

const client = new Client("", "");

test("Can search for a player by name", async () => {
  vi.mocked(text).mockResolvedValueOnce(
    await loadFixture(__dirname, "searchplayer_mad_carew.html"),
  );

  const player = await Player.fromName(client, "mad carew");

  expectNotNull(player);

  expect(player.id).toBe(263717);
  // Learns correct capitalisation
  expect(player.name).toBe("Mad Carew");
});

describe("Profile parsing", () => {
  test("Can parse a profile picture", async () => {
    vi.mocked(text).mockResolvedValueOnce(
      await loadFixture(__dirname, "showplayer_regular.html"),
    );

    const player = await new Player(
      client,
      2264486,
      "SSBBHax",
      1,
      "Sauceror",
    ).full();

    expectNotNull(player);
    expect(player.avatar).toContain("<svg");
  });

  test("Can parse a profile picture on dependence day", async () => {
    vi.mocked(text).mockResolvedValueOnce(
      await loadFixture(__dirname, "showplayer_dependence_day.html"),
    );

    const player = await new Player(
      client,
      3019702,
      "Name Guy Man",
      1,
      "Sauceror",
    ).full();

    expectNotNull(player);
    expect(player.avatar).toContain("<svg");
  });

  test("Can parse an avatar when the player has been painted gold", async () => {
    vi.mocked(text).mockResolvedValueOnce(
      await loadFixture(__dirname, "showplayer_golden_gun.html"),
    );

    const player = await new Player(
      client,
      1197090,
      "gAUSIE",
      15,
      "Sauceror",
    ).full();

    expectNotNull(player);
    expect(player.avatar).toContain("<svg");
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
});
