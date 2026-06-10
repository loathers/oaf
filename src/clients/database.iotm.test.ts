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

// This is a real-database integration test for upsertIotmByName. It only runs when
// a DATABASE_URL is provided (skipped otherwise, e.g. local `yarn test` without a
// DB); CI supplies a throwaway Postgres service. We inject the URL into `config`
// because src/config.ts deliberately returns `{}` under Vitest.
vi.mock("../config.js", () => ({
  config: { DATABASE_URL: process.env.DATABASE_URL },
}));

const { db, upsertIotmByName, setIotmRemovedFromStore } =
  await import("./database.js");

const NAME = "__test_iotm_upsert__";
const MONTH = new Date("2099-01-01");

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("upsertIotmByName (integration)", () => {
  beforeAll(async () => {
    // Mirror the real schema so ON CONFLICT hits the same *partial* unique index.
    await sql`
      CREATE TABLE IF NOT EXISTS "Iotm" (
        "id" SERIAL PRIMARY KEY,
        "itemName" TEXT,
        "itemDescid" INTEGER,
        "itemImage" TEXT,
        "month" DATE NOT NULL,
        "mraCost" INTEGER NOT NULL DEFAULT 1,
        "subscriberItem" BOOLEAN NOT NULL DEFAULT false,
        "addedToStore" TIMESTAMPTZ,
        "removedFromStore" TIMESTAMPTZ,
        "distributedToSubscribers" TIMESTAMPTZ
      )
    `.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "Iotm_itemName_key"
      ON "Iotm" ("itemName") WHERE "itemName" IS NOT NULL
    `.execute(db);
  });

  beforeEach(async () => {
    await db.deleteFrom("Iotm").where("itemName", "=", NAME).execute();
  });

  afterAll(async () => {
    await db.deleteFrom("Iotm").where("itemName", "=", NAME).execute();
    await db.destroy();
  });

  // Regression: the unique index on itemName is partial (WHERE "itemName" IS NOT
  // NULL). Without repeating that predicate in the ON CONFLICT target, Postgres
  // raises 42P10 on every upsert, which silently aborted checkStore.
  test("a conflicting upsert does not throw", async () => {
    await upsertIotmByName({
      itemName: NAME,
      month: MONTH,
      subscriberItem: false,
      addedToStore: new Date("2099-01-01T03:30:00Z"),
    });

    await expect(
      upsertIotmByName({
        itemName: NAME,
        month: MONTH,
        subscriberItem: false,
        addedToStore: new Date("2099-02-01T03:30:00Z"),
      }),
    ).resolves.not.toThrow();
  });

  // Regression: addedToStore must reflect the true entry, not be bumped on every
  // rollover the item stays in the store.
  test("addedToStore is preserved while the item stays in store, and reset on re-entry", async () => {
    const entry = new Date("2099-01-01T03:30:00Z");
    await upsertIotmByName({
      itemName: NAME,
      month: MONTH,
      subscriberItem: false,
      addedToStore: entry,
    });

    // Still in store on a later rollover - entry must be preserved.
    await upsertIotmByName({
      itemName: NAME,
      month: MONTH,
      subscriberItem: false,
      addedToStore: new Date("2099-02-01T03:30:00Z"),
    });

    let row = await db
      .selectFrom("Iotm")
      .select("addedToStore")
      .where("itemName", "=", NAME)
      .executeTakeFirstOrThrow();
    expect(row.addedToStore?.toISOString()).toBe(entry.toISOString());

    // Item leaves, then re-enters later - entry should now update.
    await setIotmRemovedFromStore(NAME, new Date("2099-02-15T03:30:00Z"));
    const reentry = new Date("2099-03-01T03:30:00Z");
    await upsertIotmByName({
      itemName: NAME,
      month: MONTH,
      subscriberItem: false,
      addedToStore: reentry,
    });

    row = await db
      .selectFrom("Iotm")
      .select("addedToStore")
      .where("itemName", "=", NAME)
      .executeTakeFirstOrThrow();
    expect(row.addedToStore?.toISOString()).toBe(reentry.toISOString());
  });
});
