-- CreateTable
CREATE TABLE "meal_plan_item_swaps" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "groceryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_item_swaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_item_swaps_profileId_day_meal_slot_key" ON "meal_plan_item_swaps"("profileId", "day", "meal", "slot");

-- AddForeignKey
ALTER TABLE "meal_plan_item_swaps" ADD CONSTRAINT "meal_plan_item_swaps_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
