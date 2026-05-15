import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  // Strip both literal zero-width spaces and HTML-encoded &#8203; entities
  await sql`
    UPDATE "DailySubmission"
    SET "value" = REPLACE(REPLACE("value", chr(8203), ''), '&#8203;', ''),
        "key" = REPLACE(REPLACE("key", chr(8203), ''), '&#8203;', '')
    WHERE "value" LIKE '%&#8203;%' OR "key" LIKE '%&#8203;%'
       OR "value" LIKE '%' || chr(8203) || '%' OR "key" LIKE '%' || chr(8203) || '%'
  `.execute(db);

  await sql`
    UPDATE "Daily"
    SET "value" = REPLACE(REPLACE("value", chr(8203), ''), '&#8203;', ''),
        "key" = REPLACE(REPLACE("key", chr(8203), ''), '&#8203;', '')
    WHERE "value" LIKE '%&#8203;%' OR "key" LIKE '%&#8203;%'
       OR "value" LIKE '%' || chr(8203) || '%' OR "key" LIKE '%' || chr(8203) || '%'
  `.execute(db);
}

export async function down(_db: Kysely<never>): Promise<void> {
  // Cannot restore zero-width spaces once removed
}
