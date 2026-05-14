import { beforeEach, describe, expect, test, vi } from "vitest";
import { Client } from "../Client.js";
import { DailyFlag } from "../flags/registry.js";
import { runResponsePipeline } from "../proxy/pipeline.js";
import { loadFixture } from "../testUtils.js";
import { Bookshelf, Libram, Tome, candyHeart, sugarSheets } from "./Bookshelf.js";

const client = new Client("", "");

beforeEach(() => {
  client.flags.set(DailyFlag.skillCasts, {});
});

function campgroundResponse(html: string, preaction: string) {
  return {
    path: "campground.php",
    method: "POST",
    params: new URLSearchParams({ preaction }),
  } as const;
}

describe("cast result", () => {
  test("returns success when response contains 'You acquire'", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_success_1.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await sugarSheets.cast(client)).toStrictEqual({ success: true });
  });

  test("returns failure when response does not contain 'You acquire'", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_fail.html");
    vi.spyOn(client, "fetchText").mockResolvedValueOnce(html);
    expect(await sugarSheets.cast(client)).toStrictEqual({ success: false, reason: "Cast failed" });
  });
});

describe("cast recording via interceptor", () => {
  test("records a successful tome cast", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_success_1.html");
    await runResponsePipeline(client, campgroundResponse(html, "summonsugarsheets"), { status: 200, contentType: "text/html", body: html });
    expect(client.skills.castsToday(sugarSheets.skillId)).toBe(1);
  });

  test("does not record a failed tome cast", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_fail.html");
    await runResponsePipeline(client, campgroundResponse(html, "summonsugarsheets"), { status: 200, contentType: "text/html", body: html });
    expect(client.skills.castsToday(sugarSheets.skillId)).toBe(0);
  });

  test("records a successful libram cast", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summoncandyheart_success.html");
    await runResponsePipeline(client, campgroundResponse(html, "summoncandyheart"), { status: 200, contentType: "text/html", body: html });
    expect(client.skills.castsToday(candyHeart.skillId)).toBe(1);
  });
});

describe("syncFromPage", () => {
  test("syncs libram casts from MP cost on bookshelf page", async () => {
    client.flags.set(DailyFlag.skillCasts, { [candyHeart.skillId]: 2 });
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_success_1.html");
    Bookshelf.syncFromPage(client, html);
    expect(client.skills.castsToday(candyHeart.skillId)).toBe(0);
  });

  test("does not change libram count when already in sync", async () => {
    client.flags.set(DailyFlag.skillCasts, { [candyHeart.skillId]: 0 });
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_success_1.html");
    Bookshelf.syncFromPage(client, html);
    expect(client.skills.castsToday(candyHeart.skillId)).toBe(0);
  });

  test("sets tome pool to exhausted when page says so", async () => {
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_fail.html");
    Bookshelf.syncFromPage(client, html);
    expect(Tome.totalCastsToday(client)).toBe(3);
  });

  test("does not reduce tome pool if already at or above 3", async () => {
    client.flags.set(DailyFlag.skillCasts, { [sugarSheets.skillId]: 3 });
    const html = await loadFixture(import.meta.dirname, "campground_summonsugarsheets_fail.html");
    Bookshelf.syncFromPage(client, html);
    expect(Tome.totalCastsToday(client)).toBe(3);
  });

  test("ignores pages that are not bookshelf pages", async () => {
    client.flags.set(DailyFlag.skillCasts, { [candyHeart.skillId]: 5 });
    Bookshelf.syncFromPage(client, "<html>some other campground page</html>");
    expect(client.skills.castsToday(candyHeart.skillId)).toBe(5);
  });
});
