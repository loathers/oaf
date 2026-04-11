import { describe, it } from "vitest";

import { createTestClient } from "./TestClient.js";

describe.concurrent("rollover integration", () => {
  it("login succeeds in normal state", async (ctx) => {
    const client = await createTestClient(ctx);

    ctx.expect(await client.login()).toBe(true);
    ctx.expect(client.isRollover()).toBe(false);
  });

  it("login fails and detects rollover from maintenance page", async (ctx) => {
    const client = await createTestClient(ctx);
    client.simulateRollover(true);

    ctx.expect(await client.login()).toBe(false);
    ctx.expect(client.isRollover()).toBe(true);
  });

  it("kmail.fetch blocks during rollover and resumes after recovery", async (ctx) => {
    const client = await createTestClient(ctx);
    await client.login();
    client.simulateRollover(true);

    setTimeout(() => client.simulateRollover(false), 200);
    const kmails = await client.kmail.fetch();

    ctx.expect(kmails).toEqual([]);
    ctx.expect(client.isRollover()).toBe(false);
  });

  it("chat.fetch blocks during rollover and resumes after recovery", async (ctx) => {
    const client = await createTestClient(ctx);
    await client.login();
    client.simulateRollover(true);

    let rolloverEmitted = false;
    client.on("rollover", () => {
      rolloverEmitted = true;
    });

    setTimeout(() => client.simulateRollover(false), 200);
    const messages = await client.chat.fetch();

    ctx.expect(messages).toEqual([]);
    ctx.expect(rolloverEmitted).toBe(true);
    ctx.expect(client.isRollover()).toBe(false);
  });

  it("detects rollover and emits event on recovery via chat loop", async (ctx) => {
    const client = await createTestClient(ctx);

    let rolloverEmitted = false;
    client.on("rollover", () => {
      rolloverEmitted = true;
    });

    await client.startChatBot();

    client.simulateRollover(true);
    await ctx.expect.poll(() => client.isRollover()).toBe(true);

    client.simulateRollover(false);
    await ctx.expect.poll(() => rolloverEmitted).toBe(true);
    ctx.expect(client.isRollover()).toBe(false);
  });
});
