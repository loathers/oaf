import { sql } from "kysely";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

// Real-database integration test for the starboard claim, which is what stops a
// reaction burst double-posting and what lets an unstarred message come back.
// Only runs when a DATABASE_URL is provided; CI supplies a throwaway Postgres.
// We inject the URL because src/config.ts deliberately returns `{}` under Vitest.
vi.mock("../config.js", () => ({
  config: { DATABASE_URL: process.env.DATABASE_URL },
}));

const {
  adoptStarboardMessages,
  claimStarboardMessage,
  clearStarboardPost,
  db,
  findStarboardMessage,
  findStarboardMessageByPostId,
  setStarboardPost,
  suppressStarboardMessage,
} = await import("./database.js");

const SOURCE = "__test_starboard_source__";
const CHANNEL = "__test_starboard_channel__";

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("starboard claim (integration)", () => {
  beforeAll(async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "StarboardMessage" (
        "sourceMessageId" TEXT PRIMARY KEY,
        "sourceChannelId" TEXT NOT NULL,
        "starboardMessageId" TEXT,
        "score" INTEGER NOT NULL DEFAULT 0,
        "suppressed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "StarboardMessage_starboardMessageId_key"
      ON "StarboardMessage" ("starboardMessageId")
    `.execute(db);
  });

  beforeEach(async () => {
    await db
      .deleteFrom("StarboardMessage")
      .where("sourceChannelId", "=", CHANNEL)
      .execute();
  });

  afterAll(async () => {
    await db
      .deleteFrom("StarboardMessage")
      .where("sourceChannelId", "=", CHANNEL)
      .execute();
    await db.destroy();
  });

  const claim = () =>
    claimStarboardMessage({
      sourceMessageId: SOURCE,
      sourceChannelId: CHANNEL,
    });

  test("grants the claim for a message never seen before", async () => {
    expect(await claim()).toBe(true);
    expect(await findStarboardMessage(SOURCE)).toMatchObject({
      sourceMessageId: SOURCE,
      starboardMessageId: null,
      score: 0,
      suppressed: false,
    });
  });

  test("refuses a second claim while a post exists", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);

    expect(await claim()).toBe(false);
  });

  test("grants the claim again after the post is cleared", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);
    await clearStarboardPost(SOURCE);

    // An unstarred message that becomes popular again must be postable
    expect(await claim()).toBe(true);
  });

  test("grants the claim for a row left behind by a crash", async () => {
    await claim();

    // Claimed but never posted, so the next evaluation should heal it
    expect(await claim()).toBe(true);
  });

  test("never grants the claim for a suppressed message", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);
    await suppressStarboardMessage(SOURCE);

    expect(await claim()).toBe(false);
  });

  test("finds a row by the id of the post we made", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);

    expect(await findStarboardMessageByPostId("post-1")).toMatchObject({
      sourceMessageId: SOURCE,
    });
  });

  test("forgets the post id when we clear it, so our own delete is not seen as manual", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);
    await clearStarboardPost(SOURCE);

    expect(await findStarboardMessageByPostId("post-1")).toBeUndefined();
  });

  test("adopted messages are suppressed and never claimable", async () => {
    await adoptStarboardMessages([
      { sourceMessageId: SOURCE, sourceChannelId: CHANNEL },
    ]);

    expect(await findStarboardMessage(SOURCE)).toMatchObject({
      suppressed: true,
      starboardMessageId: null,
    });
    expect(await claim()).toBe(false);
  });

  test("adoption is re-runnable over rows that already exist", async () => {
    await adoptStarboardMessages([
      { sourceMessageId: SOURCE, sourceChannelId: CHANNEL },
    ]);

    await expect(
      adoptStarboardMessages([
        { sourceMessageId: SOURCE, sourceChannelId: CHANNEL },
      ]),
    ).resolves.toBeUndefined();
  });
});
