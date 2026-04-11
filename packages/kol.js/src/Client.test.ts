import { MockAgent } from "undici";
import { describe, expect, it, test, vi } from "vitest";

import { Client } from "./Client.js";
import { AuthError } from "./errors.js";
import { loadFixture } from "./testUtils.js";

const KOL = "https://www.kingdomofloathing.com";

class TestClient extends Client {
  agent = new MockAgent();

  constructor() {
    super("testuser", "testpass");
    this.agent.disableNetConnect();
  }

  protected override get dispatcher() {
    return this.agent;
  }

  mock() {
    return this.agent.get(KOL);
  }

  simulateLoggedIn() {
    this.mock()
      .intercept({ path: /\/api\.php/, method: "GET" })
      .reply(200, JSON.stringify({ pwd: "abc123" }), {
        headers: { "content-type": "application/json" },
      });
    return this;
  }

  simulateLoggedOut() {
    this.mock()
      .intercept({ path: /\/api\.php/, method: "GET" })
      .reply(200, "{}", {
        headers: { "content-type": "application/json" },
      });
    return this;
  }

  simulateLoginSuccess() {
    this.simulateLoggedOut();
    this.mock()
      .intercept({ path: /\/login\.php/, method: "POST" })
      .reply(200, "<html>game frameset</html>", {
        headers: { "content-type": "text/html" },
      });
    this.simulateLoggedIn();
    return this;
  }

  simulateSessionExpiry(path: RegExp | string = /.*/) {
    this.mock()
      .intercept({ path })
      .reply(302, "", { headers: { location: "/login.php" } });
    this.mock()
      .intercept({ path: /\/login\.php/ })
      .reply(200, "<html>login</html>", {
        headers: { "content-type": "text/html" },
      });
    return this;
  }

  simulateResponse(
    path: RegExp | string,
    body: string | object,
    contentType = "application/json",
  ) {
    this.mock()
      .intercept({ path })
      .reply(200, typeof body === "string" ? body : JSON.stringify(body), {
        headers: { "content-type": contentType },
      });
    return this;
  }

  simulateServerError(path: RegExp | string = /.*/) {
    this.mock().intercept({ path }).reply(500, "Internal Server Error");
    return this;
  }
}

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

    expect(familiars).toContainEqual({
      id: 294,
      name: "Jill-of-All-Trades",
      image: "itemimages/darkjill2f.gif",
    });

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

    expect(familiars).toHaveLength(206);
  });
});

describe("login", () => {
  it("succeeds when already logged in", async () => {
    const client = new TestClient().simulateLoggedIn();

    expect(await client.login()).toBe(true);
  });

  it("succeeds via login POST when not already logged in", async () => {
    const client = new TestClient().simulateLoginSuccess();

    expect(await client.login()).toBe(true);
  });

  it("deduplicates concurrent calls", async () => {
    const client = new TestClient().simulateLoggedIn();

    const results = await Promise.all([
      client.login(),
      client.login(),
      client.login(),
    ]);

    expect(results).toEqual([true, true, true]);
  });
});

describe("request error handling", () => {
  it("propagates non-login errors from fetchJson", async () => {
    const client = new TestClient()
      .simulateLoggedIn()
      .simulateServerError(/\/test\.php/);

    await client.login();

    await expect(client.fetchJson("test.php")).rejects.toThrow();
  });

  it("retries once on session expiry (login.php redirect)", async () => {
    const client = new TestClient().simulateLoggedIn();
    await client.login();

    client
      .simulateSessionExpiry(/\/test\.php/)
      .simulateLoginSuccess()
      .simulateResponse(/\/test\.php/, { ok: true });

    const result = await client.fetchJson("test.php");
    expect(result).toEqual({ ok: true });
  });

  it("throws AuthError when login fails", async () => {
    const client = new TestClient()
      .simulateLoggedOut()
      .simulateServerError(/\/login\.php/)
      .simulateLoggedOut();

    await expect(client.fetchJson("test.php")).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});

describe("stopChatBot", () => {
  it("stops the chat loop", async () => {
    const client = new TestClient();
    client
      .simulateLoggedIn()
      .simulateResponse(/\/newchatmessages\.php/, { last: "1", msgs: [] })
      .simulateResponse(/\/api\.php/, []);

    await client.login();
    await client.startChatBot();

    // Stop the loop
    client.stopChatBot();

    // Starting again should work
    client
      .simulateResponse(/\/newchatmessages\.php/, { last: "1", msgs: [] })
      .simulateResponse(/\/api\.php/, []);
    await client.startChatBot();
    client.stopChatBot();
  });
});
