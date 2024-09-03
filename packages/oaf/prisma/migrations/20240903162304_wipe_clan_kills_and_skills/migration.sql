-- Force oaf to recalculate all raid stats.
TRUNCATE TABLE "Raid";
UPDATE "Player" SET "kills" = 0, "skills" = 0;