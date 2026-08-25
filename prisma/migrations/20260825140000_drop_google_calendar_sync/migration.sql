-- Google Calendar sync was removed (not configured, added no real value).
ALTER TABLE "athletic_calendar_events" DROP CONSTRAINT "athletic_calendar_events_profileId_fkey";

ALTER TABLE "athletic_schedule_settings" DROP CONSTRAINT "athletic_schedule_settings_profileId_fkey";

ALTER TABLE "google_calendar_connections" DROP CONSTRAINT "google_calendar_connections_profileId_fkey";

DROP TABLE "athletic_calendar_events";

DROP TABLE "athletic_schedule_settings";

DROP TABLE "google_calendar_connections";
