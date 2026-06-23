import { Monster as DolMonster, createClient } from "data-of-loathing";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Monster } from "../things/Monster.js";
import {
  DataOfLoathingClient,
  dataOfLoathingClient,
} from "./dataOfLoathing.js";

vi.mock("data-of-loathing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("data-of-loathing")>();
  return { ...actual, createClient: vi.fn(actual.createClient) };
});

let hermit: Monster;

beforeAll(async () => {
  const client = await testDb;
  const dolMonster = await client.query.findOne(
    DolMonster,
    { id: 1781 },
    { populate: ["drops.item"] },
  );
  hermit = new Monster(dolMonster!);
});

describe("Wiki link", () => {
  test("Hermit", () => {
    const link = dataOfLoathingClient.getWikiLink(hermit);
    expect(link).toBe("https://wiki.kingdomofloathing.com/Monster:1781");
  });
});

describe("Degraded mode", () => {
  test("load() does not throw when data source is unavailable", async () => {
    const mockClient = createClient();
    vi.spyOn(mockClient, "load").mockRejectedValue(new Error("network error"));
    vi.mocked(createClient).mockReturnValueOnce(mockClient);

    const client = new DataOfLoathingClient();
    await expect(client.load()).resolves.toBeUndefined();
  });

  test("loaded is false after a failed load", async () => {
    const mockClient = createClient();
    vi.spyOn(mockClient, "load").mockRejectedValue(new Error("network error"));
    vi.mocked(createClient).mockReturnValueOnce(mockClient);

    const client = new DataOfLoathingClient();
    await client.load();
    expect(client.loaded).toBe(false);
  });

  test("loaded is true after a successful load", async () => {
    const realClient = await testDb;
    vi.mocked(createClient).mockReturnValueOnce(realClient);

    const client = new DataOfLoathingClient();
    await client.load();
    expect(client.loaded).toBe(true);
  }, 15000);

  test("reload() does not retry within an hour after a failed load", async () => {
    const mockClient = createClient();
    const mockLoad = vi
      .spyOn(mockClient, "load")
      .mockRejectedValue(new Error("network error"));
    vi.mocked(createClient).mockReturnValueOnce(mockClient);

    const client = new DataOfLoathingClient();
    await client.load();
    const result = await client.reload();
    expect(result).toBe(false);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
