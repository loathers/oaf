import { beforeEach, describe, expect, it, vi } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";
import { SkeletonOfCrimboPast } from "./SkeletonOfCrimboPast.js";

const { text } = vi.hoisted(() => ({ text: vi.fn() }));

vi.mock("../Client.js", async (importOriginal) => {
  const client = await importOriginal<typeof import("../Client.js")>();
  client.Client.prototype.login = async () => true;
  client.Client.prototype.checkLoggedIn = async () => true;
  client.Client.prototype.fetchText = text;
  return client;
});

const client = new Client("", "");

const terrariumWithSocp = `onClick='fam(326)'><img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/socp.gif" 1-pound Skeleton of Crimbo Past (`;

describe("SkeletonOfCrimboPast", () => {
  beforeEach(() => text.mockReset());

  it("returns null if player has no familiar", async () => {
    text.mockResolvedValueOnce(""); // empty terrarium
    const socp = new SkeletonOfCrimboPast(client);
    expect(await socp.getDailySpecial()).toBeNull();
  });

  it("caches the familiar check", async () => {
    text.mockResolvedValueOnce(""); // empty terrarium
    const socp = new SkeletonOfCrimboPast(client);
    await socp.getDailySpecial();
    await socp.getDailySpecial();
    // getFamiliars only called once
    expect(text).toHaveBeenCalledTimes(1);
  });

  it("returns null if page does not match", async () => {
    text.mockResolvedValueOnce(terrariumWithSocp);
    text.mockResolvedValueOnce("<html>no match here</html>");
    const socp = new SkeletonOfCrimboPast(client);
    expect(await socp.getDailySpecial()).toBeNull();
  });

  it("parses the daily special", async () => {
    text.mockResolvedValueOnce(terrariumWithSocp);
    text.mockResolvedValueOnce(
      await loadFixture(import.meta.dirname, "socp.html"),
    );
    const socp = new SkeletonOfCrimboPast(client);
    const special = await socp.getDailySpecial();
    expect(special).toEqual({ descId: 153919945, price: 1388 });
  });
});
