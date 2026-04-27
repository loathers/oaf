import { describe, expect, test, vi } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { type ClanInfo, type ClanRank, Clan, DungeonPrivilege, Privilege } from "./Clan.js";

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

describe("getRanks", () => {
  const client = new Client("", "");
  const clan = new Clan(client);

  test("parses clan_editranks.html", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_editranks.html"),
    );
    const allDungeons = DungeonPrivilege.AdventureAllDungeons | DungeonPrivilege.AdministerAllDungeons;
    expect(await clan.getRanks()).toStrictEqual<ClanRank[]>([
      {
        id: 1, name: "ASS Admin", degree: 100, karmaLimit: 0, zeroKarmaLimit: 0,
        privileges: Privilege.Approve | Privilege.ChangeRank | Privilege.Boot | Privilege.KarmaExempt | Privilege.BuyFurniture | Privilege.ViewLog | Privilege.PostAnnouncement | Privilege.Attack | Privilege.EditWhitelist | Privilege.WithdrawZeroKarmaItems | Privilege.ChangeTitles | Privilege.DeleteMessages | Privilege.DeleteAnnouncement | Privilege.ChangeAllTitles | Privilege.ViewWhitelist | Privilege.BuyClanBoosts | Privilege.BuyWarStuff,
        dungeonPrivileges: allDungeons | DungeonPrivilege.EditWhiteboard,
      },
      {
        id: 3, name: "Dungeon Admin", degree: 50, karmaLimit: 0, zeroKarmaLimit: 0,
        privileges: Privilege.Approve | Privilege.ChangeRank | Privilege.Boot | Privilege.ChangeTitles | Privilege.ViewWhitelist | Privilege.EditWhitelist | Privilege.PostAnnouncement | Privilege.KarmaExempt | Privilege.WithdrawZeroKarmaItems,
        dungeonPrivileges: allDungeons | DungeonPrivilege.EditWhiteboard,
      },
      {
        id: 4, name: "Dungeon Automation", degree: 40, karmaLimit: 0, zeroKarmaLimit: 1,
        privileges: Privilege.ViewLog | Privilege.ViewWhitelist | Privilege.EditWhitelist,
        dungeonPrivileges: allDungeons,
      },
      {
        id: 2, name: "Dungeon Runner", degree: 25, karmaLimit: 0, zeroKarmaLimit: 1,
        privileges: Privilege.ViewLog,
        dungeonPrivileges: DungeonPrivilege.AdventureAllDungeons,
      },
      { id: 0, name: "Normal Member", degree: 0, privileges: 0, dungeonPrivileges: 0, karmaLimit: 0, zeroKarmaLimit: 0 },
    ]);
  });
});

describe("setPlayerRank", () => {
  const client = new Client("", "");
  const clan = new Clan(client);

  test("success when level modified", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_members_set_rank_success.html"),
    );
    expect(await clan.setPlayerRank(437479, 1)).toStrictEqual({ success: true });
  });

  test("failure when player not in clan", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_members_set_rank_not_in_clan.html"),
    );
    expect(await clan.setPlayerRank(13, 2)).toStrictEqual({ success: false, reason: "Player not in clan" });
  });

  test("failure with unknown response", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_admin_changeleader_failure.html"),
    );
    expect(await clan.setPlayerRank(437479, 1)).toStrictEqual({ success: false, reason: "Unknown" });
  });

  test("omits level field when rankId not provided", async () => {
    const spy = vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_members_set_rank_success.html"),
    );
    await clan.setPlayerRank(437479);
    expect(spy).toHaveBeenCalledWith("clan_members.php", {
      method: "POST",
      form: { action: "modify", begin: 1, "pids[]": 437479 },
    });
  });

  test("includes title field when title provided", async () => {
    const spy = vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "clan_members_set_rank_success.html"),
    );
    await clan.setPlayerRank(437479, 2, "Runner");
    expect(spy).toHaveBeenCalledWith("clan_members.php", {
      method: "POST",
      form: { action: "modify", begin: 1, "pids[]": 437479, level437479: 2, title437479: "Runner" },
    });
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
