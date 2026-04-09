import { describe, expect, test, vi } from "vitest";

import type { Client } from "../Client.js";
import { ChatMailbox } from "./ChatMailbox.js";

function mockClient(fetchJson: () => unknown) {
  return {
    fetchJson: vi.fn().mockResolvedValueOnce(fetchJson()),
    emit: vi.fn(),
  } as unknown as Client;
}

describe("chat.check", () => {
  test("Can parse a regular message", async () => {
    const client = mockClient(() => ({
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
    }));
    const chat = new ChatMailbox(client);

    await chat.check();

    expect(client.emit).toHaveBeenCalledOnce();
    expect(client.emit).toHaveBeenCalledWith(
      "public",
      expect.objectContaining({
        type: "public",
        msg: "testing",
        time: new Date(1698787642000),
        who: expect.objectContaining({ id: 1197090, name: "gAUSIE" }),
      }),
    );
  });

  test("Can parse a system message for rollover in 5 minutes", async () => {
    const client = mockClient(() => ({
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
    }));
    const chat = new ChatMailbox(client);

    await chat.check();

    expect(client.emit).toHaveBeenCalledWith(
      "system",
      expect.objectContaining({
        type: "system",
        who: expect.objectContaining({ id: -1, name: "System Message" }),
        msg: "The system will go down for nightly maintenance in 5 minutes.",
        time: new Date(1698809101000),
      }),
    );
  });

  test("Can parse a system message for rollover in one minute", async () => {
    const client = mockClient(() => ({
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
    }));
    const chat = new ChatMailbox(client);

    await chat.check();

    expect(client.emit).toHaveBeenCalledWith(
      "system",
      expect.objectContaining({
        type: "system",
        who: expect.objectContaining({ id: -1, name: "System Message" }),
        msg: "The system will go down for nightly maintenance in 1 minute.",
        time: new Date(1698809101000),
      }),
    );
  });

  test("Can parse a system message for rollover complete", async () => {
    const client = mockClient(() => ({
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
    }));
    const chat = new ChatMailbox(client);

    await chat.check();

    expect(client.emit).toHaveBeenCalledWith(
      "system",
      expect.objectContaining({
        type: "system",
        who: expect.objectContaining({ id: -1, name: "System Message" }),
        msg: "Rollover is over.",
        time: new Date(1698809633000),
      }),
    );
  });
});

describe("chat.getUpdates", () => {
  test("Can parse updates", async () => {
    const client = mockClient(() => ({
      output:
        '<hr><center><font color=green><b>Recent Announcements:</b></font></center><p><b>August 21</b> - That pocast you like is back in style.  Get it on iTunes, or from the <A style="text-decoration: underline" target=_blank href=http://radio.kingdomofloathing.com/podcast.php>direct RSS feed</a> or <a style="text-decoration: underline" target=_blank href=http://shows.kingdomofloathing.com/The_KoL_Show_20250819.mp3>download the mp3 directly</a>.<p><b>August 15</b> - On September 1st commendations will be given out for softcore Under the Sea runs. The we\'ll be making some nerfs and the leaderboards will be reset for phase 2. <p><b>August 14</b> - Swim into the fall challenge path, 11,037 Leagues Under the Sea!<p><b>March 07</b> - Check out Jick\'s entry in the 2025 7-Day Roguelike Challenge.  It\'s called Catacombo and you can <a href=https://zapjackson.itch.io/catacombo target=_blank style="text-decoration: underline">play it here on itch dot eye oh</a>.<p><b>March 06</b> - KoL\'s own Jick wrote a book, a choose-your-own-adventure about escaping from a wizard.  You can <a style="text-decoration: underline" target=_blank href=https://www.amazon.com/Escape-Prison-Tower-Wizard-Adventures/dp/B0CTW34JV1/>buy it on Amazon dot com</a>. <p><hr>',
      msgs: [],
    }));
    const chat = new ChatMailbox(client);

    const updates = await chat.getUpdates();

    expect(updates[0]).toMatch(/^That pocast you like is back/);
    expect(updates).toHaveLength(5);
  });
});
