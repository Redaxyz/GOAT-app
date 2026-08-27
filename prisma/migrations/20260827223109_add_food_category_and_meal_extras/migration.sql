-- AlterTable
ALTER TABLE "custom_food_items" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other';

-- CreateTable
CREATE TABLE "meal_plan_extra_items" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "customFoodItemId" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_extra_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_extra_items_profileId_day_meal_customFoodItemId_key" ON "meal_plan_extra_items"("profileId", "day", "meal", "customFoodItemId");

-- AddForeignKey
ALTER TABLE "meal_plan_extra_items" ADD CONSTRAINT "meal_plan_extra_items_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_extra_items" ADD CONSTRAINT "meal_plan_extra_items_customFoodItemId_fkey" FOREIGN KEY ("customFoodItemId") REFERENCES "custom_food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
