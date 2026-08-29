-- CreateTable
CREATE TABLE "food_item_extras" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meal" TEXT NOT NULL,
    "groceryId" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_item_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_item_removals" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meal" TEXT NOT NULL,
    "groceryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_item_removals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_item_extras_profileId_date_meal_groceryId_key" ON "food_item_extras"("profileId", "date", "meal", "groceryId");

-- CreateIndex
CREATE UNIQUE INDEX "food_item_removals_profileId_date_meal_groceryId_key" ON "food_item_removals"("profileId", "date", "meal", "groceryId");

-- AddForeignKey
ALTER TABLE "food_item_extras" ADD CONSTRAINT "food_item_extras_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_item_removals" ADD CONSTRAINT "food_item_removals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
