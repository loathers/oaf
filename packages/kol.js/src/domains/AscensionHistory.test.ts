import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { AscensionHistory, type Ascension } from "./AscensionHistory.js";

const { text } = vi.hoisted(() => ({ text: vi.fn() }));

vi.mock("../Client.js", async (importOriginal) => {
  const client = await importOriginal<typeof import("../Client.js")>();
  client.Client.prototype.login = async () => true;
  client.Client.prototype.checkLoggedIn = async () => true;
  client.Client.prototype.fetchText = text;
  return client;
});

const client = new Client("", "");

describe("AscensionHistory.parseAscensions", () => {
  let gausieAscensions: Ascension[];

  beforeAll(async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    gausieAscensions = AscensionHistory.parseAscensions(page)?.ascensions ?? [];
  });

  it("parses all ascensions from a long page", () => {
    expect(gausieAscensions).toHaveLength(1112);
  });

  it("parses the player from the page header", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    expect(AscensionHistory.parseAscensions(page)?.player).toEqual({
      id: 1197090,
      name: "gAUSIE",
    });
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
    const ascensions = AscensionHistory.parseAscensions(page)?.ascensions;
    expect(ascensions?.find((a) => a.ascensionNumber === 1)).toHaveProperty(
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
    "returns empty ascensions for an account with no ascensions (%s NS13)",
    async (relativeToNS13) => {
      const page = await loadFixture(
        import.meta.dirname,
        `ascensionhistory_none_${relativeToNS13}_ns13.html`,
      );
      expect(AscensionHistory.parseAscensions(page)?.ascensions).toHaveLength(0);
    },
  );

  it("recognises an abandoned run", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_with_abandoned.html",
    );
    expect(
      AscensionHistory.parseAscensions(page)?.ascensions.find(
        (a) => a.ascensionNumber === 49,
      ),
    ).toHaveProperty("abandoned", true);
  });

  it("treats multiple asterisks as a dropped run", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_two_asterisks.html",
    );
    expect(
      AscensionHistory.parseAscensions(page)?.ascensions.find(
        (a) => a.ascensionNumber === 113,
      ),
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

  it("returns null for a manually elided account", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_jick.html",
    );
    expect(AscensionHistory.parseAscensions(page)).toBeNull();
  });

  it("returns null for a purged account", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_purged.html",
    );
    expect(AscensionHistory.parseAscensions(page)).toBeNull();
  });

  it("parses a player with no ascensions", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_none_before_ns13.html",
    );
    expect(AscensionHistory.parseAscensions(page)?.player).toEqual({
      id: 1199739,
      name: "onweb",
    });
  });
});

describe("AscensionHistory.getAscensions", () => {
  beforeEach(() => text.mockReset());

  it("fetches and parses post-NS13 ascensions", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    text.mockResolvedValueOnce(page);

    const history = new AscensionHistory(client);
    const result = await history.getAscensions(1197090);

    expect(result?.ascensions).toHaveLength(1112);
    expect(result?.player).toEqual({ id: 1197090, name: "gAUSIE" });
    expect(text).toHaveBeenCalledWith("ascensionhistory.php", {
      query: { who: 1197090 },
    });
  });

  it("fetches pre- and post-NS13 ascensions when includePreNS13 is true", async () => {
    const prePage = await loadFixture(
      import.meta.dirname,
      "gausie_pre_ns13_ascensionhistory.html",
    );
    const postPage = await loadFixture(
      import.meta.dirname,
      "gausie_post_ns13_ascensionhistory.html",
    );
    text.mockResolvedValueOnce(prePage).mockResolvedValueOnce(postPage);

    const history = new AscensionHistory(client);
    const result = await history.getAscensions(1197090, {
      includePreNS13: true,
    });

    expect(text).toHaveBeenCalledWith("ascensionhistory.php", {
      query: { who: 1197090, prens13: 1 },
    });
    expect(text).toHaveBeenCalledWith("ascensionhistory.php", {
      query: { who: 1197090 },
    });
    expect(result?.ascensions.length).toBeGreaterThan(1112);
  });

  it("returns null for a non-existent player", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_purged.html",
    );
    text.mockResolvedValueOnce(page);

    const history = new AscensionHistory(client);
    expect(await history.getAscensions(1)).toBeNull();
  });

  it("returns null without fetching post when pre page shows a non-existent player", async () => {
    const page = await loadFixture(
      import.meta.dirname,
      "ascensionhistory_purged.html",
    );
    text.mockResolvedValueOnce(page);

    const history = new AscensionHistory(client);
    expect(await history.getAscensions(1, { includePreNS13: true })).toBeNull();
    expect(text).toHaveBeenCalledTimes(1);
  });
});
