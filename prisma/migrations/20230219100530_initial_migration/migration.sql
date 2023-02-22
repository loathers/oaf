-- CreateTable
CREATE TABLE "migrations" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "hash" VARCHAR(40) NOT NULL,
    "executed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);

-- -- CreateTable
-- CREATE TABLE "players" (
--     "username" VARCHAR(31) NOT NULL,
--     "kills" INTEGER NOT NULL DEFAULT 0,
--     "skills" SMALLINT NOT NULL DEFAULT 0,
--     "done_with_skills" BOOLEAN NOT NULL DEFAULT false,
--     "user_id" VARCHAR(8),
--     "brainiac" BOOLEAN NOT NULL DEFAULT false,

--     CONSTRAINT "players_pkey" PRIMARY KEY ("username")
-- );

-- -- CreateTable
-- CREATE TABLE "reminders" (
--     "id" SERIAL NOT NULL,
--     "guild_id" VARCHAR(30),
--     "channel_id" VARCHAR(30) NOT NULL,
--     "user_id" VARCHAR(30) NOT NULL,
--     "message_contents" VARCHAR(128) NOT NULL,
--     "reminder_time" BIGINT NOT NULL,
--     "interaction_reply_id" VARCHAR(30),

--     CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateTable
-- CREATE TABLE "tracked_instances" (
--     "raid_id" VARCHAR(8) NOT NULL,

--     CONSTRAINT "tracked_instances_pkey" PRIMARY KEY ("raid_id")
-- );

-- CreateIndex
CREATE UNIQUE INDEX "migrations_name_key" ON "migrations"("name");
