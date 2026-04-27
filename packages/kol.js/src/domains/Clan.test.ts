import { describe, expect, test, vi } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { type ClanInfo, Clan } from "./Clan.js";

describe("getInfo", () => {
  const client = new Client("", "");
  const clan = new Clan(client);

  test.each<[string, number, ClanInfo]>([
    [
      "showclan_cdr1.html",
      2047008362,
      {
        id: 2047008362,
        name: "Collaborative Dungeon Running 1",
        leader: { id: 1382257, name: "UberJew" },
        credo: "Dungeon running managed by the Ascension Speed Society.  Management and coordination is done here: https://discord.gg/KphxvKa",
        website: null,
        memberCount: 7,
        trophies: { "Space Shadow": 1 },
      },
    ],
    [
      "showclan_bafh.html",
      90485,
      {
        id: 90485,
        name: "Bonus Adventures from Hell",
        leader: { id: 1883589, name: "BAFH" },
        credo: "+Adv and VIP room for all",
        website: "http://alliancefromhell.com/",
        memberCount: 1626,
        trophies: {
          "Uncle Hobo's Cigar": 1,
          "Bronzed Hot Dog": 111,
          "Space Shadow": 8,
          "Star Wallet": 7,
          "Wolf Whistle": 2,
          "Great Sheep's Clothing": 8,
          "Self-Righteous Rib": 13,
          "Bit of Devil Horn": 15,
          "Meddling Finger": 5,
          "Corporeal Necktie": 55,
          "Ghost Diploma": 11,
          "Bloody Bottlecap": 11,
          "Antique Pewter Bottle Opener": 8,
          "Vibrating Fingerbone": 4,
          "Crackling Pelvis": 7,
          "Evil Snowman Heart": 4,
          "Garbage-covered Rags": 4,
          "Massive Cracked Skull": 4,
          "Handful of Chest Hair": 56,
          "Filthy Crown": 320,
          "Hodgman's skivvies": 4,
          "Slimy Tooth": 76,
        },
      },
    ],
  ])("parses %s", async (fixture, clanId, expected) => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, fixture),
    );
    expect(await clan.getInfo(clanId)).toStrictEqual(expected);
  });
});

describe("transferLeadership", () => {
  const client = new Client("", "");
  const clan = new Clan(client);

  test("success when leadership transferred", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_admin_changeleader_success.html"),
    );
    expect(await clan.transferLeadership(3366354)).toStrictEqual({ success: true });
  });

  test("failure with no admin rights", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_admin_changeleader_no_rights.html"),
    );
    expect(await clan.transferLeadership(3366354)).toStrictEqual({
      success: false,
      reason: "Insufficient clan admin rights",
    });
  });

  test("failure with unknown response", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_admin_changeleader_failure.html"),
    );
    expect(await clan.transferLeadership(3366354)).toStrictEqual({
      success: false,
      reason: "Unknown",
    });
  });
});
