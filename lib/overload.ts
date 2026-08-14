// Progressive overload suggestions per Fitness.md rules:
// - Lifts: increase by the smallest possible bump in weight*reps (double progression).
// - Running: +0.5km each session (Tue + Fri).
// - Biking: +3.5km week to week, but only once per week (Sat).

const REP_FLOOR = 8;
const REP_CEILING = 12;
const WEIGHT_INCREMENT_KG = 2.5; // smallest common plate jump (1.25kg/side)
const RUN_INCREMENT_KM = 0.5;
const RUN_BASELINE_KM = 5;
const BIKE_INCREMENT_KM = 3.5;
const BIKE_BASELINE_KM = 25;

export type LiftSuggestion = {
  weightKg: number;
  reps: number;
  sets: number;
  rationale: string;
};

/**
 * Double progression: add one rep before ever adding weight, since +1 rep is
 * always a smaller volume increase than +1 smallest plate.
 */
export function suggestNextLift(last: { weightKg: number; reps: number; sets: number }): LiftSuggestion {
  if (last.reps < REP_CEILING) {
    return {
      weightKg: last.weightKg,
      reps: last.reps + 1,
      sets: last.sets,
      rationale: `+1 rep at the same weight (${last.weightKg}kg) — smaller increase than adding weight.`,
    };
  }
  return {
    weightKg: last.weightKg + WEIGHT_INCREMENT_KG,
    reps: REP_FLOOR,
    sets: last.sets,
    rationale: `Hit the ${REP_CEILING}-rep ceiling, so drop back to ${REP_FLOOR} reps and add the smallest plate increment (+${WEIGHT_INCREMENT_KG}kg).`,
  };
}

export function suggestNextRun(last: { distanceKm: number } | null): { distanceKm: number; rationale: string } {
  if (!last) {
    return { distanceKm: RUN_BASELINE_KM, rationale: `No runs logged yet — start with a baseline ${RUN_BASELINE_KM}km run.` };
  }
  return {
    distanceKm: Math.round((last.distanceKm + RUN_INCREMENT_KM) * 100) / 100,
    rationale: `+${RUN_INCREMENT_KM}km on your last run distance.`,
  };
}

/** Bike distance increases each week, but only once per calendar week. */
export function suggestNextBike(
  logs: { date: Date; distanceKm: number }[]
): { distanceKm: number; rationale: string } {
  if (logs.length === 0) {
    return { distanceKm: BIKE_BASELINE_KM, rationale: `No rides logged yet — start with a baseline ${BIKE_BASELINE_KM}km ride.` };
  }

  const sorted = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latest = sorted[0];
  const currentWeek = isoWeekKey(new Date());
  const latestWeek = isoWeekKey(latest.date);

  if (currentWeek === latestWeek) {
    return {
      distanceKm: latest.distanceKm,
      rationale: "Already logged a ride this week — hold distance steady until next week's bump.",
    };
  }

  return {
    distanceKm: Math.round((latest.distanceKm + BIKE_INCREMENT_KM) * 100) / 100,
    rationale: `New week — +${BIKE_INCREMENT_KM}km on last week's distance.`,
  };
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}
