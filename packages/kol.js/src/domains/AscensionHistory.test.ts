import { beforeAll, describe, expect, it } from "vitest";
import { loadFixture } from "../testUtils.js";
import { AscensionHistory, type Ascension } from "./AscensionHistory.js";

describe("AscensionHistory.parse", () => {
  let gausieAscensions: Ascension[];

  beforeAll(async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    gausieAscensions = AscensionHistory.parse(page, 1197090);
  });

  it("parses all ascensions from a long page", () => {
    expect(gausieAscensions).toHaveLength(1112);
  });

  it("recognises a dropped run", () => {
    expect(gausieAscensions.find((a) => a.ascensionNumber === 13)).toHaveProperty(
      "dropped",
      true,
    );
  });

  it("parses a pre-NS13 run with no sign", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_pre_ns13_ascensionhistory.html",
    );
    const ascensions = AscensionHistory.parse(page, 1197090);
    expect(ascensions.find((a) => a.ascensionNumber === 1)).toHaveProperty(
      "sign",
      "None",
    );
  });

  it("parses a regular familiar", () => {
    const run = gausieAscensions.find((a) => a.ascensionNumber === 20);
    expect(run).toHaveProperty("familiarName", "XO Skeleton");
    expect(run).toHaveProperty("familiarImage", "xoskeleton");
    expect(run).toHaveProperty("familiarPercentage", 99.8);
  });

  it("parses an extra-wide familiar icon", () => {
    const run = gausieAscensions.find((a) => a.ascensionNumber === 288);
    expect(run).toHaveProperty("familiarName", "Melodramedary");
    expect(run).toHaveProperty("familiarImage", "camelcalf");
    expect(run).toHaveProperty("familiarPercentage", 17.5);
  });

  it("parses a PNG familiar icon", () => {
    const run = gausieAscensions.find((a) => a.ascensionNumber === 493);
    expect(run).toHaveProperty("familiarName", "Left-Hand Man");
    expect(run).toHaveProperty("familiarImage", "lhmlarva");
    expect(run).toHaveProperty("familiarPercentage", 23.6);
  });

  it.each(["before", "after"])(
    "returns empty array for an account with no ascensions (%s NS13)",
    async (relativeToNS13) => {
      const page = await loadFixture(
        import.meta.dirname,
        `ascensionhistory_none_${relativeToNS13}_ns13.html`,
      );
      expect(AscensionHistory.parse(page, 1199739)).toHaveLength(0);
    },
  );

  it("recognises an abandoned run", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_with_abandoned.html",
    );
    expect(
      AscensionHistory.parse(page, 725488).find((a) => a.ascensionNumber === 49),
    ).toHaveProperty("abandoned", true);
  });

  it("treats multiple asterisks as a dropped run", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_two_asterisks.html",
    );
    expect(
      AscensionHistory.parse(page, 2026359).find((a) => a.ascensionNumber === 113),
    ).toHaveProperty("dropped", true);
  });

  it("parses a Grey Goo Goo Score", () => {
    expect(gausieAscensions.find((a) => a.ascensionNumber === 275)?.extra).toEqual(
      { "Goo Score": 9950 },
    );
  });

  it("parses an OCRS Fun score", () => {
    expect(gausieAscensions.find((a) => a.ascensionNumber === 279)?.extra).toEqual(
      { Fun: 7018 },
    );
  });
});

describe("AscensionHistory.parsePlayer", () => {
  it("parses player name and id from the page header", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    expect(AscensionHistory.parsePlayer(page)).toEqual({
      id: 1197090,
      name: "gAUSIE",
    });
  });

  it("parses a player with no ascensions", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_none_before_ns13.html",
    );
    expect(AscensionHistory.parsePlayer(page)).toEqual({
      id: 1199739,
      name: "onweb",
    });
  });

  it("returns null for a manually elided account", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_jick.html",
    );
    expect(AscensionHistory.parsePlayer(page)).toBeNull();
  });

  it("returns null for a purged account", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_purged.html",
    );
    expect(AscensionHistory.parsePlayer(page)).toBeNull();
  });
});
