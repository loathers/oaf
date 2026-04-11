import { describe, it } from "vitest";

import { createTestClient } from "./TestClient.js";

describe.concurrent("auth integration", () => {
  it("login succeeds with correct credentials", async (ctx) => {
    const client = await createTestClient(ctx);

    ctx.expect(await client.login()).toBe(true);
  });

  it("login fails with wrong password", async (ctx) => {
    const client = await createTestClient(ctx, "testuser", "wrongpass");

    ctx.expect(await client.login()).toBe(false);
  });

  it("login fails with unknown user", async (ctx) => {
    const client = await createTestClient(ctx, "nobody", "nopass");

    ctx.expect(await client.login()).toBe(false);
  });

  it("checkLoggedIn returns false before login", async (ctx) => {
    const client = await createTestClient(ctx);

    ctx.expect(await client.checkLoggedIn()).toBe(false);
  });

  it("checkLoggedIn returns true after login", async (ctx) => {
    const client = await createTestClient(ctx);
    await client.login();

    ctx.expect(await client.checkLoggedIn()).toBe(true);
  });

  it("session persists across multiple requests without re-login", async (ctx) => {
    const client = await createTestClient(ctx);
    await client.login();

    const status1 = await client.fetchStatus();
    const kmails = await client.kmail.fetch();
    const messages = await client.chat.fetch();
    const status2 = await client.fetchStatus();

    // Same pwd means the same session — no re-login happened
    ctx.expect(status1.pwd).toBeTruthy();
    ctx.expect(status2.pwd).toBe(status1.pwd);
    ctx.expect(kmails).toEqual([]);
    ctx.expect(messages).toEqual([]);
  });

  it("logout clears session", async (ctx) => {
    const client = await createTestClient(ctx);
    await client.login();
    ctx.expect(await client.checkLoggedIn()).toBe(true);

    await client.logout();
    ctx.expect(await client.checkLoggedIn()).toBe(false);
  });

  it("login deduplicates concurrent calls", async (ctx) => {
    const client = await createTestClient(ctx);

    const results = await Promise.all([
      client.login(),
      client.login(),
      client.login(),
    ]);

    ctx.expect(results).toEqual([true, true, true]);
  });
});
