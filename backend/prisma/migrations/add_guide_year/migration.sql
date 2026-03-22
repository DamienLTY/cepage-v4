-- AlterTable
ALTER TABLE "vintages" ADD COLUMN "guide_year" INTEGER;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS "vintages_guide_year_idx" ON "vintages"("guide_year");
