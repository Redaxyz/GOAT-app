-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3),
    "heightCm" DOUBLE PRECISION,
    "activityFactor" DOUBLE PRECISION DEFAULT 1.4,
    "startWeightKg" DOUBLE PRECISION,
    "goalWeightKg" DOUBLE PRECISION,
    "goalDate" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stuckToMealPlan" BOOLEAN NOT NULL,
    "stuckToFitnessPlan" BOOLEAN NOT NULL,
    "sleepScore" INTEGER,
    "recoveryScore" INTEGER,
    "bmrReadingKcal" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_logs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day_plans" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "exercises" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_day_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardio_logs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardio_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_slug_key" ON "profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_profileId_date_key" ON "daily_checkins"("profileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_logs_profileId_date_key" ON "weight_logs"("profileId", "date");

-- CreateIndex
CREATE INDEX "lift_logs_profileId_exerciseName_date_idx" ON "lift_logs"("profileId", "exerciseName", "date");

-- CreateIndex
CREATE UNIQUE INDEX "workout_day_plans_profileId_dayKey_key" ON "workout_day_plans"("profileId", "dayKey");

-- CreateIndex
CREATE INDEX "cardio_logs_profileId_type_date_idx" ON "cardio_logs"("profileId", "type", "date");

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_logs" ADD CONSTRAINT "lift_logs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_plans" ADD CONSTRAINT "workout_day_plans_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardio_logs" ADD CONSTRAINT "cardio_logs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
