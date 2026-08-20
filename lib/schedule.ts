// Training split. Gym days rotate through four exercise variants (A1/B1/A2/B2);
// each profile can override a variant's exercise list (see WorkoutDayPlan) —
// DEFAULT_LIFT_DAYS below is just the fallback.

import { daysBetween } from "@/lib/date";

export type DayKey = "A1" | "B1" | "A2" | "B2";

export type LiftDayDef = { dayKey: DayKey; label: string; exercises: string[] };

export const DEFAULT_LIFT_DAYS: LiftDayDef[] = [
  { dayKey: "A1", label: "Day A1", exercises: ["Dumbbell bench", "Bulgarian split squat", "Preacher curl", "Abs", "Lateral raise"] },
  { dayKey: "B1", label: "Day B1", exercises: ["RDL", "Chest supported row", "Skull crusher", "Face pulls", "Lat pulldown"] },
  { dayKey: "A2", label: "Day A2", exercises: ["Bench press", "Hack squat", "Bicep curl", "Abs", "Lateral raise"] },
  { dayKey: "B2", label: "Day B2", exercises: ["Hamstring curl", "Bent over row", "Tricep pushdown", "Shoulder press", "Pull ups"] },
];

/** Merge per-profile overrides (dayKey -> exercise list) on top of the defaults. */
export function mergeLiftDays(overrides: Map<DayKey, string[]>): LiftDayDef[] {
  return DEFAULT_LIFT_DAYS.map((d) => ({
    ...d,
    exercises: overrides.get(d.dayKey) ?? d.exercises,
  }));
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
// swaps Sunday's gym day (B2) for an extra bike.
//
// CYCLE_ANCHOR is a fixed Monday that always starts "Week A" — the cycle is
// computed from how many days a given date is from this anchor, so it never
// drifts regardless of when the app is opened.
const CYCLE_ANCHOR = "2026-08-17"; // a Monday

export type ScheduleDayType = "GYM" | "RUN" | "BIKE" | "REST";

export type ScheduleEntry = { type: ScheduleDayType; dayKey: DayKey | null };

const CYCLE_TEMPLATE: ScheduleEntry[] = [
  { type: "GYM", dayKey: "A1" }, // Week A Mon
  { type: "RUN", dayKey: null }, // Week A Tue
  { type: "GYM", dayKey: "B1" }, // Week A Wed
  { type: "RUN", dayKey: null }, // Week A Thu
  { type: "GYM", dayKey: "A2" }, // Week A Fri
  { type: "BIKE", dayKey: null }, // Week A Sat
  { type: "GYM", dayKey: "B2" }, // Week A Sun
  { type: "GYM", dayKey: "A1" }, // Week B Mon
  { type: "RUN", dayKey: null }, // Week B Tue
  { type: "GYM", dayKey: "B1" }, // Week B Wed
  { type: "RUN", dayKey: null }, // Week B Thu
  { type: "GYM", dayKey: "A2" }, // Week B Fri
  { type: "BIKE", dayKey: null }, // Week B Sat
  { type: "BIKE", dayKey: null }, // Week B Sun — bonus bike, replaces B2 gym
];

/** Index (0-13) of `isoDate` within the repeating 14-day cycle. */
export function cycleIndexForDate(isoDate: string): number {
  const diff = daysBetween(CYCLE_ANCHOR, isoDate);
  return ((diff % 14) + 14) % 14;
}

/** The template's default schedule entry for a date, before any user swap. */
export function templateEntryForDate(isoDate: string): ScheduleEntry {
  return CYCLE_TEMPLATE[cycleIndexForDate(isoDate)];
}

/**
 * The effective schedule entry for a date once a user swap is applied.
 * Swapping *to* GYM only carries over a specific exercise variant (dayKey)
 * if the template already had one for that date — otherwise it's a generic
 * "gym day" with no preset exercise list, and the user picks from every
 * exercise in the full "Log a lift" list instead.
 */
export function effectiveEntryForDate(isoDate: string, override: ScheduleDayType | null): ScheduleEntry {
  const template = templateEntryForDate(isoDate);
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
