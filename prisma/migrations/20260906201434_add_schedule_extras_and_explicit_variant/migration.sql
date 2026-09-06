-- AlterTable
ALTER TABLE "schedule_overrides" ADD COLUMN     "dayKey" TEXT,
ADD COLUMN     "runVariant" TEXT;

-- CreateTable
CREATE TABLE "schedule_extras" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayType" TEXT NOT NULL,
    "dayKey" TEXT,
    "runVariant" TEXT,
    "customLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_extras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_extras_profileId_date_key" ON "schedule_extras"("profileId", "date");

-- AddForeignKey
ALTER TABLE "schedule_extras" ADD CONSTRAINT "schedule_extras_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
