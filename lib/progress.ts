export type WeightPoint = { date: Date; weightKg: number };

export type PaceResult = {
  daysRemaining: number | null;
  expectedWeightKg: number | null;
  actualWeightKg: number | null;
  deltaKg: number | null; // actual - expected
  status: "ahead" | "behind" | "on-track" | "unknown";
};

const MS_PER_DAY = 86_400_000;

/**
 * Compares actual weight trend against a straight-line path from the first
 * logged weight (or profile.startWeightKg) to profile.goalWeightKg by goalDate.
 */
export function computePace(
  profile: { startWeightKg: number | null; goalWeightKg: number | null; goalDate: Date | null },
  logs: WeightPoint[]
): PaceResult {
  const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
  const startLog = sorted[0];
  const latestLog = sorted[sorted.length - 1];

  const startWeight = startLog?.weightKg ?? profile.startWeightKg ?? null;
  const startDate = startLog?.date ?? null;

  const now = new Date();
  const daysRemaining = profile.goalDate
    ? Math.ceil((profile.goalDate.getTime() - now.getTime()) / MS_PER_DAY)
    : null;

  if (!startWeight || !startDate || !profile.goalWeightKg || !profile.goalDate || !latestLog) {
    return {
      daysRemaining,
      expectedWeightKg: null,
      actualWeightKg: latestLog?.weightKg ?? null,
      deltaKg: null,
      status: "unknown",
    };
  }

  const totalDays = (profile.goalDate.getTime() - startDate.getTime()) / MS_PER_DAY;
  const elapsedDays = (now.getTime() - startDate.getTime()) / MS_PER_DAY;
  const progress = totalDays > 0 ? Math.min(Math.max(elapsedDays / totalDays, 0), 1) : 1;

  const expectedWeight = startWeight + (profile.goalWeightKg - startWeight) * progress;
  const actualWeight = latestLog.weightKg;
  const delta = actualWeight - expectedWeight;

  const losingWeight = profile.goalWeightKg < startWeight;
  const isAhead = losingWeight ? delta < -0.2 : delta > 0.2;
  const isBehind = losingWeight ? delta > 0.2 : delta < -0.2;

  return {
    daysRemaining,
    expectedWeightKg: Math.round(expectedWeight * 10) / 10,
    actualWeightKg: actualWeight,
    deltaKg: Math.round(delta * 10) / 10,
    status: isAhead ? "ahead" : isBehind ? "behind" : "on-track",
  };
}
