-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "calorieGoal";

-- CreateTable
CREATE TABLE "meal_plan_item_overrides" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "groceryId" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_item_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_item_overrides_profileId_day_meal_groceryId_key" ON "meal_plan_item_overrides"("profileId", "day", "meal", "groceryId");

-- AddForeignKey
ALTER TABLE "meal_plan_item_overrides" ADD CONSTRAINT "meal_plan_item_overrides_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
