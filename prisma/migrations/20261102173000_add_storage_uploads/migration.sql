-- CreateEnum
CREATE TYPE "StorageUploadKind" AS ENUM ('EXAM_DOCUMENT', 'ANSWER_KEY');

-- CreateEnum
CREATE TYPE "StorageUploadStatus" AS ENUM ('RESERVED', 'UPLOADED', 'ATTACHED', 'REJECTED');

-- CreateTable
CREATE TABLE "StorageUpload" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "paperId" TEXT,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "kind" "StorageUploadKind" NOT NULL,
    "status" "StorageUploadStatus" NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageUpload_objectKey_key" ON "StorageUpload"("objectKey");

-- CreateIndex
CREATE INDEX "StorageUpload_ownerId_status_expiresAt_idx" ON "StorageUpload"("ownerId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "StorageUpload_paperId_status_idx" ON "StorageUpload"("paperId", "status");

-- AddForeignKey
ALTER TABLE "StorageUpload" ADD CONSTRAINT "StorageUpload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageUpload" ADD CONSTRAINT "StorageUpload_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ExamPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
