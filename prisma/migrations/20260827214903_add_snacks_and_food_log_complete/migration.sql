-- CreateTable
CREATE TABLE "snack_logs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snack_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_food_log_complete" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_food_log_complete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snack_logs_profileId_date_idx" ON "snack_logs"("profileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_food_log_complete_profileId_date_key" ON "daily_food_log_complete"("profileId", "date");

-- AddForeignKey
ALTER TABLE "snack_logs" ADD CONSTRAINT "snack_logs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_food_log_complete" ADD CONSTRAINT "daily_food_log_complete_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
