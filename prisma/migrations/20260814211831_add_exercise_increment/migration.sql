-- CreateTable
CREATE TABLE "exercise_increments" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "incrementLb" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_increments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_increments_profileId_exerciseName_key" ON "exercise_increments"("profileId", "exerciseName");

-- AddForeignKey
ALTER TABLE "exercise_increments" ADD CONSTRAINT "exercise_increments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
