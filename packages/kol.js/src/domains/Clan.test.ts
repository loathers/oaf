import { describe, expect, test, vi } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { Clan } from "./Clan.js";

describe("getInfo", () => {
  const client = new Client("", "");
  const clan = new Clan(client);

  test("parses clan info from showclan page", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "showclan_cdr1.html"),
    );
    expect(await clan.getInfo(2047008362)).toStrictEqual({
      id: 2047008362,
      name: "Collaborative Dungeon Running 1",
      leader: { id: 1382257, name: "UberJew" },
      credo: "Dungeon running managed by the Ascension Speed Society.  Management and coordination is done here: https://discord.gg/KphxvKa",
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
