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
