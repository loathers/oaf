-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
);
