-- AlterTable
ALTER TABLE "custom_food_items" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'g';

-- AlterTable
ALTER TABLE "snack_logs" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'g';

-- CreateTable
CREATE TABLE "meal_plan_item_removals" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "groceryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plan_item_removals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_item_removals_profileId_day_meal_groceryId_key" ON "meal_plan_item_removals"("profileId", "day", "meal", "groceryId");

-- AddForeignKey
ALTER TABLE "meal_plan_item_removals" ADD CONSTRAINT "meal_plan_item_removals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
