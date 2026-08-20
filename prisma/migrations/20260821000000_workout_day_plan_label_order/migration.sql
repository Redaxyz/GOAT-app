-- AlterTable
ALTER TABLE "workout_day_plans" ADD COLUMN "label" TEXT;
ALTER TABLE "workout_day_plans" ADD COLUMN "sortOrder" INTEGER;

-- Backfill existing rows using the historical A1/B1/A2/B2 ordering
UPDATE "workout_day_plans" SET
  "label" = CASE "dayKey"
    WHEN 'A1' THEN 'Day A1'
    WHEN 'B1' THEN 'Day B1'
    WHEN 'A2' THEN 'Day A2'
    WHEN 'B2' THEN 'Day B2'
    ELSE 'Day ' || "dayKey"
  END,
  "sortOrder" = CASE "dayKey"
    WHEN 'A1' THEN 0
    WHEN 'B1' THEN 1
    WHEN 'A2' THEN 2
    WHEN 'B2' THEN 3
    ELSE 4
  END
WHERE "label" IS NULL;

ALTER TABLE "workout_day_plans" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "workout_day_plans" ALTER COLUMN "sortOrder" SET NOT NULL;
