-- This migration follows the initial schema because it references ExamPaper and User.

-- CreateTable
CREATE TABLE "PaperView" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorKey" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PaperView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperView_paperId_viewedAt_idx" ON "PaperView"("paperId", "viewedAt");

-- CreateIndex
CREATE INDEX "PaperView_userId_viewedAt_idx" ON "PaperView"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperView_paperId_visitorKey_key" ON "PaperView"("paperId", "visitorKey");

-- AddForeignKey
ALTER TABLE "PaperView" ADD CONSTRAINT "PaperView_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperView" ADD CONSTRAINT "PaperView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
