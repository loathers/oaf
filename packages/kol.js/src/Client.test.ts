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
