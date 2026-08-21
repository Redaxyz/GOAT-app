-- Old weightKg/reps/sets columns are superseded by setsData (already
-- backfilled from them), which becomes the required `sets` field.
ALTER TABLE "lift_logs" DROP COLUMN "reps",
DROP COLUMN "sets",
DROP COLUMN "weightKg",
ALTER COLUMN "setsData" SET NOT NULL;
