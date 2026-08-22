-- CreateTable
CREATE TABLE "athletic_schedule_settings" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weekdayWakeTime" TEXT NOT NULL DEFAULT '05:00',
    "weekendWakeTime" TEXT NOT NULL DEFAULT '07:00',
    "getReadyMin" INTEGER NOT NULL DEFAULT 20,
    "commuteToGymMin" INTEGER NOT NULL DEFAULT 20,
    "gymDurationMin" INTEGER NOT NULL DEFAULT 60,
    "runDurationMin" INTEGER NOT NULL DEFAULT 60,
    "showerMin" INTEGER NOT NULL DEFAULT 15,
    "commuteToWorkMinByWeekday" JSONB NOT NULL DEFAULT '{"1":20,"2":30,"3":30,"4":20,"5":20}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletic_schedule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_connections" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletic_calendar_events" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athletic_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "athletic_schedule_settings_profileId_key" ON "athletic_schedule_settings"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_connections_profileId_key" ON "google_calendar_connections"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "athletic_calendar_events_profileId_date_kind_key" ON "athletic_calendar_events"("profileId", "date", "kind");

-- AddForeignKey
ALTER TABLE "athletic_schedule_settings" ADD CONSTRAINT "athletic_schedule_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletic_calendar_events" ADD CONSTRAINT "athletic_calendar_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
