// Training split. A profile owns its own ordered list of gym-day variants —
// not a fixed A1/B1/A2/B2 set — so days can be renamed and more of them
// added (see WorkoutDayPlan). DEFAULT_LIFT_DAYS is just the starting point
// for a brand new profile that hasn't saved anything yet.

import { daysBetween, addDays, dateOnly } from "@/lib/date";

export type DayKey = string;

export type LiftDayDef = { dayKey: DayKey; label: string; exercises: string[] };

export const DEFAULT_LIFT_DAYS: LiftDayDef[] = [
  { dayKey: "A1", label: "Day A1", exercises: ["Dumbbell bench", "Bulgarian split squat", "Preacher curl", "Abs", "Lateral raise"] },
  { dayKey: "B1", label: "Day B1", exercises: ["RDL", "Chest supported row", "Skull crusher", "Face pulls", "Lat pulldown"] },
  { dayKey: "A2", label: "Day A2", exercises: ["Bench press", "Hack squat", "Bicep curl", "Abs", "Lateral raise"] },
  { dayKey: "B2", label: "Day B2", exercises: ["Hamstring curl", "Bent over row", "Tricep pushdown", "Shoulder press", "Pull ups"] },
];

/** A profile's own saved day list, in order — or the defaults if they haven't saved any yet. */
export function resolveLiftDays(rows: { dayKey: string; label: string; exercises: string; sortOrder: number }[]): LiftDayDef[] {
  if (rows.length === 0) return DEFAULT_LIFT_DAYS;
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({ dayKey: r.dayKey, label: r.label, exercises: parseExercisesText(r.exercises) }));
}

export function parseExercisesText(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- Two-week schedule ----------------------------------------------------
// Gym and cardio alternate across a repeating 14-day cycle: 7 gym sessions,
// 4 runs, 3 bikes (one "bonus" bike in the cardio-heavy week keeps every
// weekday's run/bike slot unchanged from before — the only thing that
// changed is one gym day per cycle becoming a second bike day instead).
// Week A is unchanged from the old single-week split; Week B repeats it but
// swaps Sunday's gym day for an extra bike.
//
// CYCLE_ANCHOR is a fixed Monday that always starts "Week A" — the cycle is
// computed from how many days a given date is from this anchor, so it never
// drifts regardless of when the app is opened.
const CYCLE_ANCHOR = "2026-08-17"; // a Monday

export type ScheduleDayType = "GYM" | "RUN" | "BIKE" | "REST" | "OTHER";

/** A saved per-date override — customLabel only applies when type is "OTHER". */
export type ScheduleOverrideInfo = { type: ScheduleDayType; customLabel: string | null };

export type ScheduleEntry = { type: ScheduleDayType; dayKey: DayKey | null; customLabel?: string | null };

// Only the *type* per slot is a built-in default; a profile can rearrange it
// slot by slot through the edit view (see ScheduleTemplate / resolveCycleTemplate).
// Which specific gym-day variant lands on a given GYM slot is always a
// round-robin over however many days the profile currently has — so adding a
// 5th day just spreads the rotation across five variants instead of four,
// and rearranging GYM slots just changes how many round-robin turns happen,
// no separate redesign needed either way.
export const DEFAULT_CYCLE_TYPE_TEMPLATE: ScheduleDayType[] = [
  "GYM", // Week 1 Mon
  "RUN", // Week 1 Tue
  "GYM", // Week 1 Wed
  "RUN", // Week 1 Thu
  "GYM", // Week 1 Fri
  "BIKE", // Week 1 Sat
  "GYM", // Week 1 Sun
  "GYM", // Week 2 Mon
  "RUN", // Week 2 Tue
  "GYM", // Week 2 Wed
  "RUN", // Week 2 Thu
  "GYM", // Week 2 Fri
  "BIKE", // Week 2 Sat
  "BIKE", // Week 2 Sun — bonus bike
];

/** A profile's own saved two-week template, slot by slot — falling back to the built-in default for any slot they haven't customized. */
export function resolveCycleTemplate(rows: { slotIndex: number; dayType: string }[]): ScheduleDayType[] {
  const bySlot = new Map(rows.map((r) => [r.slotIndex, r.dayType as ScheduleDayType]));
  return DEFAULT_CYCLE_TYPE_TEMPLATE.map((defaultType, i) => bySlot.get(i) ?? defaultType);
}

/** Human label for a cycle slot, e.g. "Week 1 — Monday", for the edit view. */
export function cycleSlotLabel(slotIndex: number): string {
  const week = slotIndex < 7 ? "Week 1" : "Week 2";
  const weekday = dateOnly(addDays(CYCLE_ANCHOR, slotIndex)).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  return `${week} — ${weekday}`;
}

/** Index (0-13) of `isoDate` within the repeating 14-day cycle. */
export function cycleIndexForDate(isoDate: string): number {
  const diff = daysBetween(CYCLE_ANCHOR, isoDate);
  return ((diff % 14) + 14) % 14;
}

/** Rank (0-based) of each GYM slot among all GYM slots in `cycleTemplate`, in chronological order; -1 for non-GYM slots. */
function gymSlotRanks(cycleTemplate: ScheduleDayType[]): number[] {
  let rank = 0;
  return cycleTemplate.map((t) => (t === "GYM" ? rank++ : -1));
}

/** The template's default schedule entry for a date, before any user swap. */
export function templateEntryForDate(isoDate: string, liftDays: LiftDayDef[], cycleTemplate: ScheduleDayType[]): ScheduleEntry {
  const cycleIndex = cycleIndexForDate(isoDate);
  const type = cycleTemplate[cycleIndex];
  if (type !== "GYM" || liftDays.length === 0) return { type, dayKey: null };
  const rank = gymSlotRanks(cycleTemplate)[cycleIndex];
  return { type: "GYM", dayKey: liftDays[rank % liftDays.length].dayKey };
}

/**
 * The effective schedule entry for a date once a user swap is applied.
 * Swapping *to* GYM only carries over a specific exercise variant (dayKey)
 * if the template already had one for that date — otherwise it's a generic
 * "gym day" with no preset exercise list, and the user picks from every
 * exercise in the full "Log a lift" list instead.
 */
export function effectiveEntryForDate(
  isoDate: string,
  override: ScheduleOverrideInfo | null,
  liftDays: LiftDayDef[],
  cycleTemplate: ScheduleDayType[]
): ScheduleEntry {
  const template = templateEntryForDate(isoDate, liftDays, cycleTemplate);
  if (override == null || override.type === template.type) return template;
  if (override.type === "GYM") return { type: "GYM", dayKey: template.type === "GYM" ? template.dayKey : null };
  return { type: override.type, dayKey: null, customLabel: override.type === "OTHER" ? override.customLabel : null };
}

/** Display label for an entry — the type's fixed name, or the custom text for an "OTHER" day. */
export function entryLabel(entry: ScheduleEntry): string {
  return entry.type === "OTHER" ? entry.customLabel || "Other" : SCHEDULE_TYPE_LABEL[entry.type];
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleDayType, string> = {
  GYM: "Gym",
  RUN: "Run",
  BIKE: "Bike",
  REST: "Rest",
  OTHER: "Other",
};
