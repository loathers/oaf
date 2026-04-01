import { describe, expect, it, vi } from "vitest";

import { Client } from "./Client.js";

vi.mock("./Client.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./Client.js")>();
  mod.Client.prototype.login = async () => true;
  mod.Client.prototype.checkLoggedIn = async () => true;
  return mod;
});

describe("fetchJson", () => {
  it("throws on non-login errors instead of retrying", async () => {
    const client = new Client("", "");

    // Mock session to throw a regular error (not a login redirect)
    client.session = Object.assign(
      () => {
        throw new Error("500 Internal Server Error");
      },
      { raw: vi.fn(), native: fetch, create: vi.fn() },
    ) as unknown as typeof client.session;

    await expect(client.fetchJson("api.php")).rejects.toThrow(
      "500 Internal Server Error",
    );
  });
});

describe("fetchText", () => {
  it("throws on non-login errors instead of retrying", async () => {
    const client = new Client("", "");

    client.session = Object.assign(
      () => {
        throw new Error("Network timeout");
      },
      { raw: vi.fn(), native: fetch, create: vi.fn() },
    ) as unknown as typeof client.session;

    await expect(client.fetchText("familiar.php")).rejects.toThrow(
      "Network timeout",
    );
  });
});
