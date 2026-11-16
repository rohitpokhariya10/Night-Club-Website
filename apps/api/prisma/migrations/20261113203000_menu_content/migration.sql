ALTER TABLE "MenuCategory" ADD COLUMN "description" TEXT;
ALTER TABLE "Special" ADD COLUMN "slug" TEXT;
ALTER TABLE "Special" ADD COLUMN "priceLabel" TEXT NOT NULL DEFAULT '';
UPDATE "Special" SET "slug" = "id";
ALTER TABLE "Special" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Special" ALTER COLUMN "priceLabel" DROP DEFAULT;
CREATE UNIQUE INDEX "Special_slug_key" ON "Special"("slug");
