import { prisma } from "@/lib/prisma";
import { addDays, dateOnly, dayOfWeekIndex } from "@/lib/date";
import { resolveLiftDays, resolveCycleTemplate, effectiveEntryForDate, type ScheduleEntry, type ScheduleDayType } from "@/lib/schedule";
import {
  refreshAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventInput,
} from "@/lib/googleCalendar";

// How far ahead a full-template/settings change regenerates. Kept modest
// (not 60+ days) since this runs as a sequence of real Google API calls —
// see syncDateRange's call site in app/actions.ts for why it's wrapped in
// `after()` rather than awaited inline.
export const SYNC_WINDOW_DAYS = 30;

export type AthleticScheduleSettingsLike = {
  weekdayWakeTime: string;
  weekendWakeTime: string;
  getReadyMin: number;
  commuteToGymMin: number;
  gymDurationMin: number;
  runDurationMin: number;
  showerMin: number;
  commuteToWorkMinByWeekday: Record<string, number>;
};

export const DEFAULT_ATHLETIC_SETTINGS: AthleticScheduleSettingsLike = {
  weekdayWakeTime: "05:00",
  weekendWakeTime: "07:00",
  getReadyMin: 20,
  commuteToGymMin: 20,
  gymDurationMin: 60,
  runDurationMin: 60,
  showerMin: 15,
  commuteToWorkMinByWeekday: { "1": 20, "2": 30, "3": 30, "4": 20, "5": 20 },
};

type ComputedEvent = {
  summary: string;
  description?: string;
  startDate: string; // "YYYY-MM-DD"
  startTimeStr: string; // "HH:MM"
  endDate: string;
  endTimeStr: string;
};

export type DayPlan = { activity: ComputedEvent | null; commute: ComputedEvent | null };

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(totalMinutes: number): { timeStr: string; dayOffset: number } {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { timeStr: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, dayOffset };
}

function toEvent(baseDateStr: string, startMin: number, endMin: number, summary: string, description?: string): ComputedEvent {
  const start = minutesToTimeStr(startMin);
  const end = minutesToTimeStr(endMin);
  return {
    summary,
    description,
    startDate: addDays(baseDateStr, start.dayOffset),
    startTimeStr: start.timeStr,
    endDate: addDays(baseDateStr, end.dayOffset),
    endTimeStr: end.timeStr,
  };
}

/**
 * Pure — no I/O. Given a date's effective schedule entry and the profile's
 * timing settings, returns the calendar events that SHOULD exist for that
 * date. REST/BIKE days get nothing (bike is after work, deliberately not
 * scheduled here). Commute-to-work only applies where the weekday has an
 * entry in commuteToWorkMinByWeekday (Mon-Fri) — so a GYM day landing on a
 * weekend (the cycle's biweekly Sunday swap) correctly gets no commute leg.
 */
export function computeDayPlan(dateStr: string, entry: ScheduleEntry, settings: AthleticScheduleSettingsLike): DayPlan {
  if (entry.type !== "GYM" && entry.type !== "RUN") {
    return { activity: null, commute: null };
  }

  const weekday = dayOfWeekIndex(dateStr);
  const isWeekend = weekday === 0 || weekday === 6;
  const wakeTimeStr = isWeekend ? settings.weekendWakeTime : settings.weekdayWakeTime;
  const wakeMin = parseTimeToMinutes(wakeTimeStr);
  const leaveMin = wakeMin + settings.getReadyMin;

  const isGym = entry.type === "GYM";
  const activityDurationMin = isGym
    ? settings.commuteToGymMin + settings.gymDurationMin + settings.showerMin
    : settings.runDurationMin + settings.showerMin;
  const summary = isGym ? "Gym" : "Run";
  const description = isGym
    ? `${wakeTimeStr} wake, ${settings.getReadyMin} min to get ready, ${settings.commuteToGymMin} min commute to gym, ${settings.gymDurationMin} min gym, ${settings.showerMin} min shower & change.`
    : `${wakeTimeStr} wake, ${settings.getReadyMin} min to get ready, ${settings.runDurationMin} min run, ${settings.showerMin} min shower & change.`;

  const activityEndMin = leaveMin + activityDurationMin;
  const activity = toEvent(dateStr, leaveMin, activityEndMin, summary, description);

  const commuteMin = settings.commuteToWorkMinByWeekday[String(weekday)];
  const commute = commuteMin != null ? toEvent(dateStr, activityEndMin, activityEndMin + commuteMin, "Commute to Work") : null;

  return { activity, commute };
}

function offsetForDate(dateStr: string, timeZone: string): string {
  // Noon UTC is safely within the correct local calendar day for any
  // realistic timezone, so this avoids ambiguity around DST transitions
  // that happen near local midnight.
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(ref);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = tzName.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hours = match ? parseInt(match[1], 10) : 0;
  const mins = match?.[2] ? parseInt(match[2], 10) : 0;
  const sign = hours < 0 ? "-" : "+";
  return `${sign}${String(Math.abs(hours)).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function zonedIsoString(dateStr: string, timeStr: string, timeZone: string): string {
  return `${dateStr}T${timeStr}:00${offsetForDate(dateStr, timeZone)}`;
}

function toCalendarEventInput(event: ComputedEvent, timeZone: string): CalendarEventInput {
  return {
    summary: event.summary,
    description: event.description,
    startTime: zonedIsoString(event.startDate, event.startTimeStr, timeZone),
    endTime: zonedIsoString(event.endDate, event.endTimeStr, timeZone),
    timeZone,
  };
}

type Connection = { accessToken: string; refreshToken: string; tokenExpiry: Date; calendarId: string; timeZone: string; id: string };

async function ensureFreshAccessToken(connection: Connection): Promise<string> {
  if (connection.tokenExpiry.getTime() > Date.now() + 60_000) return connection.accessToken;
  const refreshed = await refreshAccessToken(connection.refreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresInSec * 1000);
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { accessToken: refreshed.accessToken, tokenExpiry },
  });
  return refreshed.accessToken;
}

async function reconcileKind(
  profileId: string,
  dateStr: string,
  kind: "ACTIVITY" | "COMMUTE",
  desired: ComputedEvent | null,
  existing: { id: string; googleEventId: string } | undefined,
  accessToken: string,
  connection: Connection
): Promise<void> {
  if (!desired && existing) {
    await deleteCalendarEvent(accessToken, connection.calendarId, existing.googleEventId);
    await prisma.athleticCalendarEvent.delete({ where: { id: existing.id } });
    return;
  }
  if (desired && !existing) {
    const googleEventId = await createCalendarEvent(accessToken, connection.calendarId, toCalendarEventInput(desired, connection.timeZone));
    await prisma.athleticCalendarEvent.create({ data: { profileId, date: dateOnly(dateStr), kind, googleEventId } });
    return;
  }
  if (desired && existing) {
    await updateCalendarEvent(accessToken, connection.calendarId, existing.googleEventId, toCalendarEventInput(desired, connection.timeZone));
  }
}

/** Recomputes and pushes the calendar events for a single date. No-op if the profile hasn't connected Google Calendar. */
export async function syncDate(profileId: string, dateStr: string): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { profileId } });
  if (!connection) return;

  const [liftDayRows, scheduleTemplateRows, scheduleOverrideRow, settingsRow] = await Promise.all([
    prisma.workoutDayPlan.findMany({ where: { profileId } }),
    prisma.scheduleTemplate.findMany({ where: { profileId } }),
    prisma.scheduleOverride.findUnique({ where: { profileId_date: { profileId, date: dateOnly(dateStr) } } }),
    prisma.athleticScheduleSettings.findUnique({ where: { profileId } }),
  ]);

  const liftDays = resolveLiftDays(liftDayRows);
  const cycleTemplate = resolveCycleTemplate(scheduleTemplateRows);
  const override = (scheduleOverrideRow?.dayType as ScheduleDayType | undefined) ?? null;
  const entry = effectiveEntryForDate(dateStr, override, liftDays, cycleTemplate);
  const settings: AthleticScheduleSettingsLike = settingsRow
    ? { ...settingsRow, commuteToWorkMinByWeekday: settingsRow.commuteToWorkMinByWeekday as Record<string, number> }
    : DEFAULT_ATHLETIC_SETTINGS;

  const plan = computeDayPlan(dateStr, entry, settings);

  const accessToken = await ensureFreshAccessToken(connection);
  const existingRows = await prisma.athleticCalendarEvent.findMany({ where: { profileId, date: dateOnly(dateStr) } });
  const existingByKind = new Map(existingRows.map((r) => [r.kind, r]));

  await reconcileKind(profileId, dateStr, "ACTIVITY", plan.activity, existingByKind.get("ACTIVITY"), accessToken, connection);
  await reconcileKind(profileId, dateStr, "COMMUTE", plan.commute, existingByKind.get("COMMUTE"), accessToken, connection);
}

/** Regenerates a rolling window starting at startDateStr. Sequential and can take a while for the full window — call sites should defer this with `after()` rather than awaiting inline in a form-submitting server action. */
export async function syncDateRange(profileId: string, startDateStr: string, days: number = SYNC_WINDOW_DAYS): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { profileId } });
  if (!connection) return;
  for (let i = 0; i < days; i++) {
    await syncDate(profileId, addDays(startDateStr, i));
  }
}

/** Deletes every registered calendar event for a profile — used before disconnecting so stale events don't linger on Google's side. */
export async function deleteAllSyncedEvents(profileId: string): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { profileId } });
  if (!connection) return;
  const accessToken = await ensureFreshAccessToken(connection);
  const rows = await prisma.athleticCalendarEvent.findMany({ where: { profileId } });
  for (const row of rows) {
    await deleteCalendarEvent(accessToken, connection.calendarId, row.googleEventId);
  }
  await prisma.athleticCalendarEvent.deleteMany({ where: { profileId } });
}
