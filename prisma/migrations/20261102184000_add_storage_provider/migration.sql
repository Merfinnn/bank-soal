CREATE TYPE "StorageProvider" AS ENUM ('S3', 'LOCAL');

ALTER TABLE "StorageUpload"
ADD COLUMN "storageProvider" "StorageProvider" NOT NULL DEFAULT 'S3';
