import { prisma } from "@/lib/prisma";
import { suggestNextRun, suggestNextBike, DEFAULT_WEIGHT_INCREMENT_LB } from "@/lib/overload";
import {
  resolveLiftDays,
  resolveCycleTemplate,
  effectiveEntryForDate,
  type LiftDayDef,
  type ScheduleDayType,
  type ScheduleEntry,
  type ScheduleOverrideInfo,
} from "@/lib/schedule";
import { toDateInputValue } from "@/lib/date";

/**
 * Everything both the Home and Fitness pages need to render a "today's
 * workout" card and (on Fitness) the full suggestions/history lists —
 * fetched once here so neither page re-derives the same maps independently.
 */
export async function getFitnessData(profileId: string) {
  const [lifts, cardio, dayPlanRows, incrementRows, scheduleOverrideRows, scheduleTemplateRows] = await Promise.all([
    prisma.liftLog.findMany({ where: { profileId }, orderBy: { date: "desc" } }),
    prisma.cardioLog.findMany({ where: { profileId }, orderBy: { date: "desc" } }),
    prisma.workoutDayPlan.findMany({ where: { profileId } }),
    prisma.exerciseIncrement.findMany({ where: { profileId } }),
    prisma.scheduleOverride.findMany({ where: { profileId } }),
    prisma.scheduleTemplate.findMany({ where: { profileId } }),
  ]);

  const incrementByExercise = new Map(incrementRows.map((row) => [row.exerciseName, row.incrementLb]));

  const scheduleOverrideByDate = new Map<string, ScheduleOverrideInfo>();
  for (const row of scheduleOverrideRows) {
    scheduleOverrideByDate.set(toDateInputValue(row.date), { type: row.dayType as ScheduleDayType, customLabel: row.customLabel });
  }

  const latestByExercise = new Map<string, (typeof lifts)[number]>();
  for (const lift of lifts) {
    if (!latestByExercise.has(lift.exerciseName)) latestByExercise.set(lift.exerciseName, lift);
  }

  const latestRun = cardio.find((c) => c.type === "RUN") ?? null;
  const bikeLogs = cardio.filter((c) => c.type === "BIKE");
  const latestBike = bikeLogs[0] ?? null;

  return {
    lifts,
    cardio,
    liftDays: resolveLiftDays(dayPlanRows),
    cycleTemplate: resolveCycleTemplate(scheduleTemplateRows),
    incrementByExercise,
    scheduleOverrideByDate,
    latestByExercise,
    latestRun,
    bikeLogs,
    latestBike,
    runSuggestion: suggestNextRun(latestRun),
    bikeSuggestion: suggestNextBike(bikeLogs),
  };
}

export type FitnessData = Awaited<ReturnType<typeof getFitnessData>>;

export type DayEntryInfo = {
  entry: ScheduleEntry;
  override: ScheduleOverrideInfo | null;
  liftDay: LiftDayDef | null;
  isRunDay: boolean;
  isBikeDay: boolean;
  isGenericGymDay: boolean;
  ranToday: boolean;
  bikedToday: boolean;
  loggedToday: (exerciseName: string) => boolean;
  incrementLb: (exerciseName: string) => number;
};

/** Resolves the effective schedule entry (and today-specific "already logged?" flags) for one date. Works for any date, not just today. */
export function resolveDayEntry(data: FitnessData, dateStr: string): DayEntryInfo {
  const override = data.scheduleOverrideByDate.get(dateStr) ?? null;
  const entry = effectiveEntryForDate(dateStr, override, data.liftDays, data.cycleTemplate);
  const liftDay = entry.dayKey ? data.liftDays.find((d) => d.dayKey === entry.dayKey) ?? null : null;

  return {
    entry,
    override,
    liftDay,
    isRunDay: entry.type === "RUN",
    isBikeDay: entry.type === "BIKE",
    isGenericGymDay: entry.type === "GYM" && !liftDay,
    ranToday: data.latestRun != null && toDateInputValue(data.latestRun.date) === dateStr,
    bikedToday: data.latestBike != null && toDateInputValue(data.latestBike.date) === dateStr,
    loggedToday: (name: string) => {
      const log = data.latestByExercise.get(name);
      return log != null && toDateInputValue(log.date) === dateStr;
    },
    incrementLb: (name: string) => data.incrementByExercise.get(name) ?? DEFAULT_WEIGHT_INCREMENT_LB,
  };
}
