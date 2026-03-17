import { type Kysely, sql } from "kysely";

// The epoch was corrected from Feb 1, 2003 to Feb 10, 2003.
// All existing gameday values in Daily/DailySubmission are 9 too high
// and need to be decremented. Raffle gamedays were sourced externally
// and are already correct.

export async function up(db: Kysely<never>): Promise<void> {
  await sql`UPDATE "Daily" SET "gameday" = "gameday" - 9`.execute(db);
  await sql`UPDATE "DailySubmission" SET "gameday" = "gameday" - 9`.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`UPDATE "Daily" SET "gameday" = "gameday" + 9`.execute(db);
  await sql`UPDATE "DailySubmission" SET "gameday" = "gameday" + 9`.execute(db);
}
