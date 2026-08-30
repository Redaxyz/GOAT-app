import { prisma } from "@/lib/prisma";
import { suggestNextRun, suggestNextBike, suggestNextRow, suggestNextSwim } from "@/lib/overload";
import { resolveLiftDays, resolveCycleTemplate, type ScheduleDayType, type ScheduleOverrideInfo } from "@/lib/schedule";
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
  const latestRow = cardio.find((c) => c.type === "ROW") ?? null;
  const latestSwim = cardio.find((c) => c.type === "SWIM") ?? null;

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
    latestRow,
    latestSwim,
    runSuggestion: suggestNextRun(latestRun),
    bikeSuggestion: suggestNextBike(bikeLogs),
    rowSuggestion: suggestNextRow(latestRow),
    swimSuggestion: suggestNextSwim(latestSwim),
  };
}

export type FitnessData = Awaited<ReturnType<typeof getFitnessData>>;
