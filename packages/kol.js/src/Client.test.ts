import { describe, expect, it, test, vi } from "vitest";

import { AuthError, Client, RolloverError } from "./Client.js";
import { loadFixture } from "./testUtils.js";

function mockSession(fn: () => unknown) {
  return Object.assign(fn, {
    raw: vi.fn(),
    native: fetch,
    create: vi.fn(),
  }) as unknown as Client["session"];
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

describe("fetchJson error handling", () => {
  it("throws on non-login errors", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
    client.session = mockSession(() => {
      throw new Error("500 Internal Server Error");
    });
    await expect(client.fetchJson("api.php")).rejects.toThrow(
      "500 Internal Server Error",
    );
  });

  it("does not retry more than once on non-login errors", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      throw new Error("persistent error");
    });
    await expect(client.fetchJson("test.php")).rejects.toThrow(
      "persistent error",
    );
    expect(calls).toBe(1);
  });

  it("propagates RolloverError", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
    client.session = mockSession(() => {
      throw new RolloverError();
    });
    await expect(client.fetchJson("test.php")).rejects.toBeInstanceOf(
      RolloverError,
    );
  });

  it("throws AuthError when login fails", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(false);
    await expect(client.fetchJson("test.php")).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});

describe("fetchText error handling", () => {
  it("throws on non-login errors instead of retrying", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
    client.session = mockSession(() => {
      throw new Error("Network timeout");
    });
    await expect(client.fetchText("familiar.php")).rejects.toThrow(
      "Network timeout",
    );
  });

  it("does not retry more than once on non-login errors", async () => {
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
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

describe("login deduplication", () => {
  it("concurrent login() calls share one in-flight request", async () => {
    const client = new Client("", "");
    let loginPostCount = 0;

    // First checkLoggedIn fails, login POST succeeds, second checkLoggedIn succeeds
    let callCount = 0;
    client.session = mockSession(() => {
      callCount++;
      if (callCount === 1) return "<html>not logged in</html>";
      if (callCount === 2) {
        loginPostCount++;
        return "<html>game frameset</html>";
      }
      return { pwd: "abc123" };
    });

    // Fire three concurrent login() calls
    const results = await Promise.all([
      client.login(),
      client.login(),
      client.login(),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(loginPostCount).toBe(1);
  });

  it("allows a new login after the first one completes", async () => {
    const client = new Client("", "");
    let loginPostCount = 0;

    client.session = mockSession(() => {
      loginPostCount++;
      // checkLoggedIn succeeds immediately
      return { pwd: "abc123" };
    });

    await client.login();
    await client.login();

    // Each login() call is independent (not deduplicated) since the first completed
    expect(loginPostCount).toBe(2);
  });
});

describe("rollover handling", () => {
  it("detects rollover from login.php response", async () => {
    const client = new Client("", "");
    client.session = mockSession(
      () => "The system is currently down for nightly maintenance.",
    );
    await client.login();
    expect(client.isRollover()).toBe(true);

    // All fetch methods should fail fast
    await expect(client.fetchText("test.php")).rejects.toBeInstanceOf(
      RolloverError,
    );
    await expect(client.fetchJson("test.php")).rejects.toBeInstanceOf(
      RolloverError,
    );
  });

  it("fetchText throws RolloverError immediately when in rollover", async () => {
    const client = new Client("", "");
    client.session = mockSession(
      () => "The system is currently down for nightly maintenance",
    );
    await client.login();

    let sessionCalled = false;
    client.session = mockSession(() => {
      sessionCalled = true;
      return "";
    });
    await expect(client.fetchText("test.php")).rejects.toBeInstanceOf(
      RolloverError,
    );
    expect(sessionCalled).toBe(false);
  });

  it("fetchJson throws RolloverError immediately when in rollover", async () => {
    const client = new Client("", "");
    client.session = mockSession(
      () => "The system is currently down for nightly maintenance",
    );
    await client.login();

    let sessionCalled = false;
    client.session = mockSession(() => {
      sessionCalled = true;
      return {};
    });
    await expect(client.fetchJson("test.php")).rejects.toBeInstanceOf(
      RolloverError,
    );
    expect(sessionCalled).toBe(false);
  });

  it("recovers from rollover when server comes back", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");

    client.session = mockSession(
      () => "The system is currently down for nightly maintenance",
    );
    await client.login();
    expect(client.isRollover()).toBe(true);

    client.session = mockSession(() => "<html>normal login page</html>");
    await vi.advanceTimersByTimeAsync(60_000);

    expect(client.isRollover()).toBe(false);
    vi.useRealTimers();
  });

  it("emits rollover event when recovery is detected", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");

    // Enter rollover
    client.session = mockSession(
      () => "The system is currently down for nightly maintenance",
    );
    await client.login();
    expect(client.isRollover()).toBe(true);

    // Listen for rollover event
    const rolloverSpy = vi.fn();
    client.on("rollover", rolloverSpy);

    // Recover: #checkForRollover sees normal page → emits rollover event
    client.session = mockSession(() => "<html>normal login page</html>");
    await vi.advanceTimersByTimeAsync(60_000);

    expect(client.isRollover()).toBe(false);
    expect(rolloverSpy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("stays in rollover if server is unreachable", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");

    client.session = mockSession(
      () => "The system is currently down for nightly maintenance",
    );
    await client.login();
    expect(client.isRollover()).toBe(true);

    client.session = mockSession(() => {
      throw new Error("Network error");
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.isRollover()).toBe(true);

    client.session = mockSession(() => "<html>normal login page</html>");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.isRollover()).toBe(false);

    vi.useRealTimers();
  });

  it("does not recurse through fetchText/login during rollover check", async () => {
    const client = new Client("", "");
    let sessionCallCount = 0;
    client.session = mockSession(() => {
      sessionCallCount++;
      return "The system is currently down for nightly maintenance";
    });

    await client.login();
    expect(sessionCallCount).toBeLessThanOrEqual(3);
  });
});
