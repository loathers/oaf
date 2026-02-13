import { describe, expect, it } from "vitest";
import { parseKmailMessage } from "./kmail.js";

describe("Kmail parsing", () => {
  it("strips a valentine", () => {
    const result = parseKmailMessage(
      "<center><table><tr><td><img src=\"https://d2uyhvukfffg5a.cloudfront.net/adventureimages/smiley.gif\" width=100 height=100></td><td valign=center>You zerg rush'd my heart<br>Your love gets me high<br>Come give me a kiss<br>You're oh em gee KAWAIIIIIIII!!11!!11!!!?!!?!</td></tr></table></center>",
      "normal",
    );

    expect(result.msg).toBe("");
    expect(result.valentine).toBe("smiley");
    expect(result.items).toEqual([]);
    expect(result.meat).toBe(0);
    expect(result.insideNote).toBeNull();
  });

  it("parses a kmail with items and a message", () => {
    const result = parseKmailMessage(
      'Enjoy!<center><table class="item" style="float: none" rel="id=641&s=14&q=0&d=1&g=0&t=1&n=1&m=0&p=0&u=e"><tr><td><img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/toast.gif" alt="toast" title="toast" class=hand onClick=\'descitem(931984879)\' ></td><td valign=center class=effect>You acquire an item: <b>toast</b></td></tr></table></center>',
      "normal",
    );

    expect(result.msg).toBe("Enjoy!");
    expect(result.valentine).toBeNull();
    expect(result.items).toEqual([
      { id: 641, name: "toast", quantity: 1, descid: "931984879" },
    ]);
    expect(result.meat).toBe(0);
    expect(result.insideNote).toBeNull();
  });

  it("parses a kmail with items but no message", () => {
    const result = parseKmailMessage(
      '<center><table class="item" style="float: none" rel="id=6863&s=1&q=0&d=1&g=0&t=1&n=2&m=0&p=0&u=e"><tr><td><img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/butterpat.gif" alt="pat of butter" title="pat of butter" class=hand onClick=\'descitem(310457727)\' ></td><td valign=center class=effect>You acquire <b>2 pats of butter</b></td></tr></table></center>',
      "normal",
    );

    expect(result.msg).toBe("");
    expect(result.valentine).toBeNull();
    expect(result.items).toEqual([
      {
        id: 6863,
        name: "pat of butter",
        quantity: 2,
        descid: "310457727",
      },
    ]);
    expect(result.meat).toBe(0);
    expect(result.insideNote).toBeNull();
  });

  it("parses a kmail with meat", () => {
    const result = parseKmailMessage(
      "<center>You acquire <b>5,000</b> Meat.<br>You gain 5,000 Meat</center>",
      "normal",
    );

    expect(result.msg).toBe("");
    expect(result.items).toEqual([]);
    expect(result.meat).toBe(5000);
    expect(result.insideNote).toBeNull();
  });

  it("parses a kmail with items and meat", () => {
    const result = parseKmailMessage(
      'Here you go<center><table class="item" style="float: none" rel="id=641&s=14&q=0&d=1&g=0&t=1&n=1&m=0&p=0&u=e"><tr><td><img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/toast.gif" alt="toast" title="toast" class=hand onClick=\'descitem(931984879)\' ></td><td valign=center class=effect>You acquire an item: <b>toast</b></td></tr></table></center><center>You gain 1,000 Meat</center>',
      "normal",
    );

    expect(result.msg).toBe("Here you go");
    expect(result.items).toEqual([
      { id: 641, name: "toast", quantity: 1, descid: "931984879" },
    ]);
    expect(result.meat).toBe(1000);
    expect(result.insideNote).toBeNull();
  });

  it("parses a plain text kmail", () => {
    const result = parseKmailMessage("Hello there!", "normal");

    expect(result.msg).toBe("Hello there!");
    expect(result.valentine).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.meat).toBe(0);
    expect(result.insideNote).toBeNull();
  });

  it("parses a gift shop kmail", () => {
    const result = parseKmailMessage(
      "Thanks for everything!<p>Inside Note:<p>Hope you enjoy this!",
      "giftshop",
    );

    expect(result.msg).toBe("Thanks for everything!");
    expect(result.kmailType).toBe("giftshop");
    expect(result.insideNote).toBe("Hope you enjoy this!");
    expect(result.items).toEqual([]);
    expect(result.meat).toBe(0);
  });

  it("decodes HTML entities", () => {
    const result = parseKmailMessage(
      "That&apos;s a &quot;great&quot; idea &amp; I love it",
      "normal",
    );

    expect(result.msg).toBe(`That's a "great" idea & I love it`);
  });
});
