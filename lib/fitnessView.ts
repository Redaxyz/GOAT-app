import { effectiveEntryForDate, extraEntryForDate, type LiftDayDef, type RunVariant, type ScheduleEntry, type ScheduleOverrideInfo } from "@/lib/schedule";
import { DEFAULT_WEIGHT_INCREMENT_LB } from "@/lib/overload";
import { toDateInputValue } from "@/lib/date";
import type { FitnessData } from "@/lib/fitnessData";

/**
 * Pure view logic over FitnessData, kept out of lib/fitnessData.ts (which
 * imports Prisma for getFitnessData) so it can be called from
 * TodayWorkoutCard, a "use client" component, without dragging Prisma into
 * the client bundle — the `FitnessData` import above is type-only and is
 * erased at compile time either way.
 */
export type DayEntryInfo = {
  entry: ScheduleEntry;
  override: ScheduleOverrideInfo | null;
  liftDay: LiftDayDef | null;
  isRunDay: boolean;
  runVariant: RunVariant | null;
  isBikeDay: boolean;
  isRowDay: boolean;
  isSwimDay: boolean;
  isGenericGymDay: boolean;
  ranToday: boolean;
  bikedToday: boolean;
  rowedToday: boolean;
  swamToday: boolean;
  loggedToday: (exerciseName: string) => boolean;
  incrementLb: (exerciseName: string) => number;
};

function buildDayEntryInfo(data: FitnessData, dateStr: string, entry: ScheduleEntry, override: ScheduleOverrideInfo | null): DayEntryInfo {
  const liftDay = entry.dayKey ? data.liftDays.find((d) => d.dayKey === entry.dayKey) ?? null : null;

  return {
    entry,
    override,
    liftDay,
    isRunDay: entry.type === "RUN",
    runVariant: entry.runVariant ?? null,
    isBikeDay: entry.type === "BIKE",
    isRowDay: entry.type === "ROW",
    isSwimDay: entry.type === "SWIM",
    isGenericGymDay: entry.type === "GYM" && !liftDay,
    ranToday: data.latestRun != null && toDateInputValue(data.latestRun.date) === dateStr,
    bikedToday: data.latestBike != null && toDateInputValue(data.latestBike.date) === dateStr,
    rowedToday: data.latestRow != null && toDateInputValue(data.latestRow.date) === dateStr,
    swamToday: data.latestSwim != null && toDateInputValue(data.latestSwim.date) === dateStr,
    loggedToday: (name: string) => {
      const log = data.latestByExercise.get(name);
      return log != null && toDateInputValue(log.date) === dateStr;
    },
    incrementLb: (name: string) => data.incrementByExercise.get(name) ?? DEFAULT_WEIGHT_INCREMENT_LB,
  };
}

/** Resolves the effective schedule entry (and today-specific "already logged?" flags) for one date. Works for any date, not just today. */
export function resolveDayEntry(data: FitnessData, dateStr: string): DayEntryInfo {
  const entry = effectiveEntryForDate(dateStr, data.liftDays, data.cycleTemplate, data.scheduleOverrideByDate, data.profileSlug);
  const override = data.scheduleOverrideByDate.get(dateStr) ?? null;
  return buildDayEntryInfo(data, dateStr, entry, override);
}

/** Both scheduled entries for a date — just [primary], or [primary, secondary] on a two-workout day (added via the calendar's "+"). */
export function resolveDayEntries(data: FitnessData, dateStr: string): DayEntryInfo[] {
  const primary = resolveDayEntry(data, dateStr);
  const extra = extraEntryForDate(dateStr, data.scheduleExtraByDate);
  return extra ? [primary, buildDayEntryInfo(data, dateStr, extra, null)] : [primary];
}
