import { describe, expect, it, test, vi } from "vitest";

import { Client } from "./Client.js";
import { loadFixture } from "./testUtils.js";

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

describe("LoathingChat", () => {
  test("Can parse a regular message", async () => {
    json.mockResolvedValue({});
    json.mockResolvedValueOnce({
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
    json.mockResolvedValueOnce({
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
    json.mockResolvedValueOnce({
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
    json.mockResolvedValueOnce({
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
    json.mockResolvedValueOnce({
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
  test("can describe a Skill with no bluetext", async () => {
    text.mockResolvedValueOnce(
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
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "desc_skill_impetuous_sauciness.html"),
    );

    const description = await client.getSkillDescription(4015);

    expect(description).toStrictEqual({
      blueText: "Makes Sauce Potions last longer",
    });
  });
});

describe("Familiars", () => {
  test("can fetch all familiars", async () => {
    text.mockResolvedValueOnce(
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

describe("Raffle", () => {
  it("can fetch the current raffle", async () => {
    text.mockResolvedValueOnce(await loadFixture(__dirname, "raffle.html"));
    text.mockResolvedValueOnce("<!-- itemid: 1 -->");
    text.mockResolvedValueOnce("<!-- itemid: 2 -->");
    text.mockResolvedValueOnce("<!-- itemid: 3 -->");
    text.mockResolvedValueOnce("<!-- itemid: 4 -->");
    text.mockResolvedValueOnce("<!-- itemid: 4 -->");
    text.mockResolvedValueOnce("<!-- itemid: 4 -->");

    const raffle = await client.getRaffle();

    expect(raffle).toMatchObject({
      today: {
        first: 1,
        second: 2,
      },
      yesterday: [
        {
          player: { id: 809337, name: "Collective Consciousness" },
          item: 3,
          tickets: 3333,
        },
        {
          player: { id: 852958, name: "Ryo_Sangnoir" },
          item: 4,
          tickets: 1011,
        },
        {
          player: { id: 1765063, name: "SSpectre_Karasu" },
          item: 4,
          tickets: 1000,
        },
        {
          player: { id: 1652370, name: "yueli7" },
          item: 4,
          tickets: 2040,
        },
      ],
    });
  });
});
