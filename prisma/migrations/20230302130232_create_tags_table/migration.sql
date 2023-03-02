-- CreateTable
CREATE TABLE "Tag" (
    "tag" TEXT NOT NULL,
    "reason" TEXT,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("tag")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_guildId_channelId_messageId_key" ON "Tag"("guildId", "channelId", "messageId");
