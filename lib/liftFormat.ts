import { kgToLb } from "@/lib/units";
import type { LiftSetEntry } from "@/lib/types";

/**
 * Plain formatting helpers with no server-only dependencies (unlike
 * lib/fitnessData.ts, which pulls in Prisma) — safe to import from both
 * server-rendered lists (Fitness's "Every logged lift") and TodayWorkoutCard,
 * a "use client" component, without dragging Prisma into the client bundle.
 */
export function liftSets(lift: { sets: unknown }): LiftSetEntry[] {
  return lift.sets as LiftSetEntry[];
}

export function formatSetsLb(sets: LiftSetEntry[]): string {
  return sets.map((s) => `${kgToLb(s.weightKg)}lb×${s.reps}`).join(", ");
}

/** Short calendar-cell code for a lift day's own label — "Front 1" -> "F1", "Back 2" -> "B2" — so the month view shows which specific gym day is coming up, not just a generic "gym" marker. */
export function liftDayAbbr(label: string): string {
  const letters = label
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0].toUpperCase())
    .join("");
  const num = label.match(/\d+/)?.[0] ?? "";
  return letters + num || label.slice(0, 2).toUpperCase();
}
