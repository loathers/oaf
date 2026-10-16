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

// Real-database integration test for the starboard claim, which is the only
// thing standing between a reaction burst and a double post, and what lets an
// unstarred message come back.
// Only runs when a DATABASE_URL is provided; CI supplies a throwaway Postgres.
// We inject the URL because src/config.ts deliberately returns `{}` under Vitest.
vi.mock("../config.js", () => ({
  config: { DATABASE_URL: process.env.DATABASE_URL },
}));

const {
  adoptStarboardMessages,
  claimStarboardMessage,
  db,
  deleteStarboardMessage,
  findStarboardMessage,
  findStarboardMessageByPostId,
  releaseStarboardMessage,
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
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  test("grants the claim to exactly one of two racing evaluations", async () => {
    // The whole point: two reactions landing together must not both post
    const [first, second] = await Promise.all([claim(), claim()]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
  });

  test("grants the claim again after the message is released", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);
    await releaseStarboardMessage(SOURCE);

    // An unstarred message that becomes popular again must be postable
    expect(await claim()).toBe(true);
  });

  test("refuses the claim a crash left behind", async () => {
    await claim();

    // The cost of the row being the claim: dying between claiming and posting
    // strands the message. Rarer than double-posting, and quieter.
    expect(await claim()).toBe(false);
  });

  test("keeps a suppressed row when the message is released", async () => {
    await claim();
    await suppressStarboardMessage(SOURCE);
    await releaseStarboardMessage(SOURCE);

    // Releasing a tombstone would let a message a human removed come straight
    // back the next time someone reacts
    expect(await findStarboardMessage(SOURCE)).toMatchObject({
      suppressed: true,
    });
    expect(await claim()).toBe(false);
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

  test("forgets the post id when we release it, so our own delete is not seen as manual", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);
    await releaseStarboardMessage(SOURCE);

    expect(await findStarboardMessageByPostId("post-1")).toBeUndefined();
  });

  test("reports whether recording a post found the row", async () => {
    await claim();
    expect(await setStarboardPost(SOURCE, "post-1", 5)).toBe(true);

    // What post() sees when the source is deleted while it is sending
    await deleteStarboardMessage(SOURCE);
    expect(await setStarboardPost(SOURCE, "post-2", 5)).toBe(false);
  });

  test("hands back the post id when deleting the row, in one round trip", async () => {
    await claim();
    await setStarboardPost(SOURCE, "post-1", 5);

    expect(await deleteStarboardMessage(SOURCE)).toBe("post-1");
    expect(await findStarboardMessage(SOURCE)).toBeUndefined();
  });

  test("reports no post id when deleting a row we never posted", async () => {
    await claim();

    expect(await deleteStarboardMessage(SOURCE)).toBeNull();
  });

  test("reports no post id when there was no row at all", async () => {
    expect(await deleteStarboardMessage(SOURCE)).toBeNull();
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
