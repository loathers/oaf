import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    INSERT INTO "Iotm" ("itemName", "itemDescid", "itemImage", "month", "mraCost", "subscriberItem", "addedToStore", "removedFromStore", "distributedToSubscribers")
    VALUES
        ('Dark Jill-O-Lantern', null, null, '2004-10-01', 1, true, '2004-10-06 03:30:00+00', '2004-11-02 03:30:00+00', null),
        ('hand turkey outline', null, null, '2004-11-01', 1, true, '2004-11-02 03:30:00+00', '2004-12-02 03:30:00+00', null),
        ('crimbo elfling', null, null, '2004-12-01', 1, true, '2004-12-02 03:30:00+00', '2005-01-04 03:30:00+00', null),
        ('orphan baby yeti', null, null, '2005-01-01', 1, true, '2005-01-04 03:30:00+00', '2005-02-01 03:30:00+00', null),
        ('silk garter snake', null, null, '2005-02-01', 1, true, '2005-02-01 03:30:00+00', '2005-03-01 03:30:00+00', null),
        ('lucky Tam O''Shanter', null, null, '2005-03-01', 1, true, '2005-03-05 03:30:00+00', '2005-04-01 03:30:00+00', null)
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`
    DELETE FROM "Iotm" WHERE "month" < '2005-04-01'
  `.execute(db);
}
