// Weekly training split, straight from Fitness.md. Sunday and Wednesday are
// both "Day A" (A1/A2) but use different exercise variants, same for
// Monday/Thursday "Day B" (B1/B2) — kept as separate groups so suggestions
// stay tied to the exact variant actually logged. Each profile can override
// a day's exercise list (see WorkoutDayPlan); these are just the defaults.

export type DayKey = "A1" | "B1" | "A2" | "B2";

export type LiftDayDef = { dayKey: DayKey; label: string; weekday: number; exercises: string[] };

// weekday: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (matches Date#getUTCDay()).
export const DEFAULT_LIFT_DAYS: LiftDayDef[] = [
  { dayKey: "A1", label: "Day A1", weekday: 0, exercises: ["Dumbbell bench", "Bulgarian split squat", "Preacher curl", "Abs", "Lateral raise"] },
  { dayKey: "B1", label: "Day B1", weekday: 1, exercises: ["RDL", "Chest supported row", "Skull crusher", "Face pulls", "Lat pulldown"] },
  { dayKey: "A2", label: "Day A2", weekday: 3, exercises: ["Bench press", "Hack squat", "Bicep curl", "Abs", "Lateral raise"] },
  { dayKey: "B2", label: "Day B2", weekday: 4, exercises: ["Hamstring curl", "Bent over row", "Tricep pushdown", "Shoulder press", "Pull ups"] },
];

export const RUN_WEEKDAYS = [2, 5]; // Tue, Fri
export const BIKE_WEEKDAY = 6; // Sat

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
