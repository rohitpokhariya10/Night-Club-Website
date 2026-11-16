-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InquiryType" ADD VALUE 'CATERING';
ALTER TYPE "InquiryType" ADD VALUE 'JOB';

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "preferredTime" TEXT;

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'FOOD';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "priceLabel" TEXT;

-- CreateTable
CREATE TABLE "Special" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "schedule" TEXT,
    "image" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Special_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Special_published_startsAt_expiresAt_idx" ON "Special"("published", "startsAt", "expiresAt");
