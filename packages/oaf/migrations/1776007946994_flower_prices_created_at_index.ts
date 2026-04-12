import type { Kysely } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await db.schema
    .createIndex("FlowerPrices_createdAt_idx")
    .on("FlowerPrices")
    .column("createdAt")
    .execute();
}

export async function down(db: Kysely<never>): Promise<void> {
  await db.schema.dropIndex("FlowerPrices_createdAt_idx").execute();
}
