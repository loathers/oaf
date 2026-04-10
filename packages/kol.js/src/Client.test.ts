import { describe, expect, it, test, vi } from "vitest";

import { Client } from "./Client.js";
import { AuthError, RolloverError } from "./errors.js";
import { loadFixture } from "./testUtils.js";

function mockSession(
  fn: (path: string) => unknown,
  options?: { redirectUrl?: (path: string) => string },
) {
  const session = Object.assign(
    (path: string) => {
      const result = fn(path);
      const responseUrl = options?.redirectUrl?.(path) ?? path;
      // Simulate onResponse hook — detect maint.php redirect
      if (responseUrl.includes("/maint.php") || responseUrl.includes("maint.php")) {
        // The real onResponse hook would set #isRollover and throw
        throw new RolloverError();
      }
      return result;
    },
    {
      raw: vi.fn(),
      native: fetch,
      create: vi.fn(),
    },
  ) as unknown as Client["session"];
  return session;
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

  it("recovers from RolloverError and retries", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");
    vi.spyOn(client, "login").mockResolvedValue(true);
    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      if (calls === 1) throw new RolloverError();
      // #waitForRolloverEnd polls login.php — return normal page
      if (calls === 2) return "<html>normal</html>";
      // Retry of original request after recovery
      return { result: "ok" };
    });

    const promise = client.fetchJson("test.php");
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result).toEqual({ result: "ok" });
    vi.useRealTimers();
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
  it("detects rollover when login throws RolloverError", async () => {
    const client = new Client("", "");
    client.session = mockSession(() => {
      throw new RolloverError();
    });
    await client.login();
    expect(client.isRollover()).toBe(true);
  });

  it("fetchText blocks during rollover and resumes after recovery", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");
    client.session = mockSession(() => {
      throw new RolloverError();
    });
    await client.login();
    expect(client.isRollover()).toBe(true);

    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      // First call: #waitForRolloverEnd polls login.php — recovered
      if (calls === 1) return "<html>normal</html>";
      // Second call: checkLoggedIn for re-login
      if (calls === 2) return { pwd: "abc123" };
      // Third call: the actual fetchText request
      return "response body";
    });

    const promise = client.fetchText("test.php");
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result).toBe("response body");
    expect(client.isRollover()).toBe(false);
    vi.useRealTimers();
  });

  it("emits rollover event when recovery is detected", async () => {
    vi.useFakeTimers();
    const client = new Client("", "");

    client.session = mockSession(() => {
      throw new RolloverError();
    });
    await client.login();
    expect(client.isRollover()).toBe(true);

    const rolloverSpy = vi.fn();
    client.on("rollover", rolloverSpy);

    let calls = 0;
    client.session = mockSession(() => {
      calls++;
      // First call: #waitForRolloverEnd polls — still in rollover
      if (calls === 1) throw new RolloverError();
      // Second call: recovered
      if (calls === 2) return "<html>normal login page</html>";
      // Third call: checkLoggedIn for re-login
      if (calls === 3) return { pwd: "abc123" };
      // Fourth call: the actual request
      return "done";
    });

    // Start a request that will block in #waitForRolloverEnd
    const promise = client.fetchText("test.php");

    // First poll — still in rollover
    await vi.advanceTimersByTimeAsync(60_000);
    expect(client.isRollover()).toBe(true);
    expect(rolloverSpy).not.toHaveBeenCalled();

    // Second poll — recovered, emits event, re-logins, retries
    await vi.advanceTimersByTimeAsync(60_000);
    await promise;

    expect(client.isRollover()).toBe(false);
    expect(rolloverSpy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
