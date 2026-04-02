import { describe, expect, it, test, vi } from "vitest";

import { Client } from "./Client.js";
import { loadFixture } from "./testUtils.js";

vi.mock("./Client.js", async (importOriginal) => {
  const client = await importOriginal<typeof import("./Client.js")>();
  client.Client.prototype.login = async () => true;
  client.Client.prototype.checkLoggedIn = async () => true;
  return client;
});

function mockSession(fn: () => unknown) {
  return Object.assign(fn, {
    raw: vi.fn(),
    native: fetch,
    create: vi.fn(),
  }) as unknown as Client["session"];
}

describe("LoathingChat", () => {
  const client = new Client("", "");

  test("Can parse a regular message", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValue({});
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({
      msgs: [
        {
          msg: "testing",
          type: "public",
          mid: "1538072797",
          who: { name: "gAUSIE", id: "1197090", color: "black" },
          format: "0",
          channel: "talkie",
          channelcolor: "green",
          time: "1698787642",
        },
      ],
    });

    const messageSpy = vi.fn();

    client.on("public", messageSpy);

    await client.checkMessages();

    expect(messageSpy).toHaveBeenCalledOnce();
    const [message] = messageSpy.mock.calls[0];
    expect(message).toMatchObject({
      type: "public",
      msg: "testing",
      time: new Date(1698787642000),
      who: { id: 1197090, name: "gAUSIE" },
    });
  });

  test("Can parse a system message for rollover in 5 minutes", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({
      msgs: [
        {
          msg: "The system will go down for nightly maintenance in 5 minutes.",
          type: "system",
          mid: "1538084998",
          who: { name: "System Message", id: "-1", color: "" },
          format: "2",
          channelcolor: "green",
          time: "1698809101",
        },
      ],
    });

    const messageSpy = vi.fn();

    client.on("system", messageSpy);

    await client.checkMessages();

    expect(messageSpy).toHaveBeenCalledOnce();
    const [message] = messageSpy.mock.calls[0];
    expect(message).toMatchObject({
      type: "system",
      who: { id: -1, name: "System Message" },
      msg: "The system will go down for nightly maintenance in 5 minutes.",
      time: new Date(1698809101000),
    });
  });

  test("Can parse a system message for rollover in one minute", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({
      msgs: [
        {
          msg: "The system will go down for nightly maintenance in 1 minute.",
          type: "system",
          mid: "1538084998",
          who: { name: "System Message", id: "-1", color: "" },
          format: "2",
          channelcolor: "green",
          time: "1698809101",
        },
      ],
    });

    const messageSpy = vi.fn();

    client.on("system", messageSpy);

    await client.checkMessages();

    expect(messageSpy).toHaveBeenCalledOnce();
    const [message] = messageSpy.mock.calls[0];
    expect(message).toMatchObject({
      type: "system",
      who: { id: -1, name: "System Message" },
      msg: "The system will go down for nightly maintenance in 1 minute.",
      time: new Date(1698809101000),
    });
  });

  test("Can parse a system message for rollover complete", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({
      msgs: [
        {
          msg: "Rollover is over.",
          type: "system",
          mid: "1538085619",
          who: { name: "System Message", id: "-1", color: "" },
          format: "2",
          channelcolor: "green",
          time: "1698809633",
        },
      ],
    });

    const messageSpy = vi.fn();

    client.on("system", messageSpy);

    await client.checkMessages();

    expect(messageSpy).toHaveBeenCalledOnce();
    const [message] = messageSpy.mock.calls[0];
    expect(message).toMatchObject({
      type: "system",
      who: { id: -1, name: "System Message" },
      msg: "Rollover is over.",
      time: new Date(1698809633000),
    });
  });

  test("Can parse updates", async () => {
    vi.spyOn(client, "fetchJson").mockResolvedValueOnce({
      output:
        '<hr><center><font color=green><b>Recent Announcements:</b></font></center><p><b>August 21</b> - That pocast you like is back in style.  Get it on iTunes, or from the <A style="text-decoration: underline" target=_blank href=http://radio.kingdomofloathing.com/podcast.php>direct RSS feed</a> or <a style="text-decoration: underline" target=_blank href=http://shows.kingdomofloathing.com/The_KoL_Show_20250819.mp3>download the mp3 directly</a>.<p><b>August 15</b> - On September 1st commendations will be given out for softcore Under the Sea runs. The we\'ll be making some nerfs and the leaderboards will be reset for phase 2. <p><b>August 14</b> - Swim into the fall challenge path, 11,037 Leagues Under the Sea!<p><b>March 07</b> - Check out Jick\'s entry in the 2025 7-Day Roguelike Challenge.  It\'s called Catacombo and you can <a href=https://zapjackson.itch.io/catacombo target=_blank style="text-decoration: underline">play it here on itch dot eye oh</a>.<p><b>March 06</b> - KoL\'s own Jick wrote a book, a choose-your-own-adventure about escaping from a wizard.  You can <a style="text-decoration: underline" target=_blank href=https://www.amazon.com/Escape-Prison-Tower-Wizard-Adventures/dp/B0CTW34JV1/>buy it on Amazon dot com</a>. <p><hr>',
      msgs: [],
    });

    const updates = await client.getUpdates();

    expect(updates[0]).toMatch(/^That pocast you like is back/);
    expect(updates).toHaveLength(5);
  });
});

describe("Skill descriptions", () => {
  const client = new Client("", "");

  test("can describe a Skill with no bluetext", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(
        __dirname,
        "desc_skill_overload_discarded_refridgerator.html",
      ),
    );

    const description = await client.getSkillDescription(7017);

    expect(description).toStrictEqual({
      blueText: "",
    });
  });

  test("can describe a Skill with bluetext", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "desc_skill_impetuous_sauciness.html"),
    );

    const description = await client.getSkillDescription(4015);

    expect(description).toStrictEqual({
      blueText: "Makes Sauce Potions last longer",
    });
  });
});

describe("Familiars", () => {
  const client = new Client("", "");

  test("can fetch all familiars", async () => {
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(
      await loadFixture(__dirname, "familiar_in_standard_run.html"),
    );

    const familiars = await client.getFamiliars();

    // Current
    expect(familiars).toContainEqual({
      id: 294,
      name: "Jill-of-All-Trades",
      image: "itemimages/darkjill2f.gif",
    });

    // Problematic
    expect(familiars).toContainEqual({
      id: 278,
      name: "Left-Hand Man",
      image: "otherimages/righthandbody.png",
    });
    expect(familiars).toContainEqual({
      id: 279,
      name: "Melodramedary",
      image: "otherimages/camelfam_left.gif",
    });

    // Just to be sure
    expect(familiars).toHaveLength(206);
  });
});

describe("fetchJson error handling", () => {
  it("returns null on non-login errors instead of retrying", async () => {
    const client = new Client("", "");
    client.session = mockSession(() => {
      throw new Error("500 Internal Server Error");
    });
    expect(await client.fetchJson("api.php")).toBeNull();
  });

  it("returns fallback on non-login errors", async () => {
    const client = new Client("", "");
    client.session = mockSession(() => {
      throw new Error("Parse error");
    });
    expect(await client.fetchJson("api.php", {}, "default")).toBe("default");
  });

  it("does not retry more than once on non-login errors", async () => {
    const client = new Client("", "");
    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      throw new Error("persistent error");
    });
    expect(await client.fetchJson("test.php")).toBeNull();
    expect(calls).toBe(1);
  });
});

describe("fetchText error handling", () => {
  it("throws on non-login errors instead of retrying", async () => {
    const client = new Client("", "");
    client.session = mockSession(() => {
      throw new Error("Network timeout");
    });
    await expect(client.fetchText("familiar.php")).rejects.toThrow(
      "Network timeout",
    );
  });

  it("does not retry more than once on non-login errors", async () => {
    const client = new Client("", "");
    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      throw new Error("persistent error");
    });
    await expect(client.fetchText("test.php")).rejects.toThrow(
      "persistent error",
    );
    expect(calls).toBe(1);
  });
});
