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
