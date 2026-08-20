// Training split. A profile owns its own ordered list of gym-day variants —
// not a fixed A1/B1/A2/B2 set — so days can be renamed and more of them
// added (see WorkoutDayPlan). DEFAULT_LIFT_DAYS is just the starting point
// for a brand new profile that hasn't saved anything yet.

import { daysBetween } from "@/lib/date";

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

export type ScheduleDayType = "GYM" | "RUN" | "BIKE" | "REST";

export type ScheduleEntry = { type: ScheduleDayType; dayKey: DayKey | null };

// Only the *type* per slot is fixed; which specific gym-day variant lands on
// a given GYM slot is a round-robin over however many days the profile
// currently has (see gymDayKeyForCycleIndex) — so adding a 5th day just
// spreads the rotation across five variants instead of four, no schedule
// redesign needed.
const CYCLE_TYPE_TEMPLATE: ScheduleDayType[] = [
  "GYM", // Week A Mon
  "RUN", // Week A Tue
  "GYM", // Week A Wed
  "RUN", // Week A Thu
  "GYM", // Week A Fri
  "BIKE", // Week A Sat
  "GYM", // Week A Sun
  "GYM", // Week B Mon
  "RUN", // Week B Tue
  "GYM", // Week B Wed
  "RUN", // Week B Thu
  "GYM", // Week B Fri
  "BIKE", // Week B Sat
  "BIKE", // Week B Sun — bonus bike
];

// Rank (0-based) of each GYM slot among all GYM slots in the cycle, in
// chronological order; -1 for non-GYM slots. Computed once at module load.
const GYM_SLOT_RANKS: number[] = (() => {
  let rank = 0;
  return CYCLE_TYPE_TEMPLATE.map((t) => (t === "GYM" ? rank++ : -1));
})();

/** Index (0-13) of `isoDate` within the repeating 14-day cycle. */
export function cycleIndexForDate(isoDate: string): number {
  const diff = daysBetween(CYCLE_ANCHOR, isoDate);
  return ((diff % 14) + 14) % 14;
}

/** The template's default schedule entry for a date, before any user swap. */
export function templateEntryForDate(isoDate: string, liftDays: LiftDayDef[]): ScheduleEntry {
  const cycleIndex = cycleIndexForDate(isoDate);
  const type = CYCLE_TYPE_TEMPLATE[cycleIndex];
  if (type !== "GYM" || liftDays.length === 0) return { type, dayKey: null };
  const rank = GYM_SLOT_RANKS[cycleIndex];
  return { type: "GYM", dayKey: liftDays[rank % liftDays.length].dayKey };
}

/**
 * The effective schedule entry for a date once a user swap is applied.
 * Swapping *to* GYM only carries over a specific exercise variant (dayKey)
 * if the template already had one for that date — otherwise it's a generic
 * "gym day" with no preset exercise list, and the user picks from every
 * exercise in the full "Log a lift" list instead.
 */
export function effectiveEntryForDate(isoDate: string, override: ScheduleDayType | null, liftDays: LiftDayDef[]): ScheduleEntry {
  const template = templateEntryForDate(isoDate, liftDays);
  if (override == null || override === template.type) return template;
  if (override === "GYM") return { type: "GYM", dayKey: template.type === "GYM" ? template.dayKey : null };
  return { type: override, dayKey: null };
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleDayType, string> = {
  GYM: "Gym",
  RUN: "Run",
  BIKE: "Bike",
  REST: "Rest",
};
