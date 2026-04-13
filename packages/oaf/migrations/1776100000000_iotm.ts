import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    CREATE TABLE "Iotm" (
      "id" SERIAL PRIMARY KEY,
      "itemName" TEXT,
      "itemDescid" INTEGER,
      "itemImage" TEXT,
      "month" DATE NOT NULL,
      "mraCost" INTEGER,
      "subscriberItem" BOOLEAN NOT NULL DEFAULT false,
      "addedToStore" TIMESTAMPTZ,
      "removedFromStore" TIMESTAMPTZ,
      "distributedToSubscribers" TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX "Iotm_itemName_key" ON "Iotm" ("itemName") WHERE "itemName" IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP TABLE IF EXISTS "Iotm"`.execute(db);
}
