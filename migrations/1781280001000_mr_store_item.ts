import { type Kysely, sql } from "kysely";

// Renames the "Iotm" table to "MrStoreItem" (it now tracks every Mr. Store item,
// not just items-of-the-month), adds a "category" column (iotm | ioty | other) and
// makes "month" nullable (NULL for permanent "other" items). The category backfill
// here is generic (subscriberItem -> iotm/other); the IoTY reclassification and the
// missing Oct 2024 non-subscriber IotM are applied separately via prod ssh.

export async function up(db: Kysely<never>): Promise<void> {
  // Rename the table and its dependent objects (Postgres does not auto-rename these)
  await sql`ALTER TABLE "Iotm" RENAME TO "MrStoreItem"`.execute(db);
  await sql`ALTER SEQUENCE "Iotm_id_seq" RENAME TO "MrStoreItem_id_seq"`.execute(
    db,
  );
  await sql`ALTER INDEX "Iotm_pkey" RENAME TO "MrStoreItem_pkey"`.execute(db);
  await sql`ALTER INDEX "Iotm_itemName_key" RENAME TO "MrStoreItem_itemName_key"`.execute(
    db,
  );
  await sql`ALTER TABLE "MrStoreItem" RENAME CONSTRAINT "Iotm_currency_check" TO "MrStoreItem_currency_check"`.execute(
    db,
  );

  // Add category nullable first - the table is non-empty so a NOT NULL add would fail
  await sql`ALTER TABLE "MrStoreItem" ADD COLUMN "category" TEXT`.execute(db);

  // Generic backfill: subscriber items are items-of-the-month, the rest are permanent
  await sql`
    UPDATE "MrStoreItem"
    SET "category" = CASE WHEN "subscriberItem" THEN 'iotm' ELSE 'other' END
  `.execute(db);

  // Now enforce NOT NULL + the allowed values
  await sql`ALTER TABLE "MrStoreItem" ALTER COLUMN "category" SET NOT NULL`.execute(
    db,
  );
  await sql`
    ALTER TABLE "MrStoreItem"
    ADD CONSTRAINT "MrStoreItem_category_check"
    CHECK ("category" IN ('iotm', 'ioty', 'other'))
  `.execute(db);

  // Permanent items have no meaningful month
  await sql`ALTER TABLE "MrStoreItem" ALTER COLUMN "month" DROP NOT NULL`.execute(
    db,
  );
  await sql`UPDATE "MrStoreItem" SET "month" = NULL WHERE "category" = 'other'`.execute(
    db,
  );
}

export async function down(db: Kysely<never>): Promise<void> {
  // Lossy: the iotm/ioty/other distinction is dropped, and months nulled in up()
  // are reconstructed approximately from store timestamps.
  await sql`ALTER TABLE "MrStoreItem" DROP CONSTRAINT "MrStoreItem_category_check"`.execute(
    db,
  );
  await sql`ALTER TABLE "MrStoreItem" DROP COLUMN "category"`.execute(db);

  await sql`
    UPDATE "MrStoreItem"
    SET "month" = date_trunc(
      'month',
      COALESCE("addedToStore", "distributedToSubscribers", now())
    )::date
    WHERE "month" IS NULL
  `.execute(db);
  await sql`ALTER TABLE "MrStoreItem" ALTER COLUMN "month" SET NOT NULL`.execute(
    db,
  );

  await sql`ALTER TABLE "MrStoreItem" RENAME CONSTRAINT "MrStoreItem_currency_check" TO "Iotm_currency_check"`.execute(
    db,
  );
  await sql`ALTER INDEX "MrStoreItem_itemName_key" RENAME TO "Iotm_itemName_key"`.execute(
    db,
  );
  await sql`ALTER INDEX "MrStoreItem_pkey" RENAME TO "Iotm_pkey"`.execute(db);
  await sql`ALTER SEQUENCE "MrStoreItem_id_seq" RENAME TO "Iotm_id_seq"`.execute(
    db,
  );
  await sql`ALTER TABLE "MrStoreItem" RENAME TO "Iotm"`.execute(db);
}
