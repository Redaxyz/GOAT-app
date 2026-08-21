// Progressive overload suggestions:
// - Lifts: increase reps 8->12 at a fixed weight, then bump weight and reset
//   to 8 reps (double progression). Weight bump defaults to 5lb (smallest
//   dumbbell increment at a typical gym) but is overridden per-exercise
//   whenever the user actually logs a different jump (see lib/actions.ts).
// - Running: +0.5km each session.
// - Biking: +3.5km week to week, but only once per calendar week — the
//   two-week schedule's bonus bike day can land in the same week as another
//   ride (see lib/schedule.ts), so this cap can hold distance steady twice.

const REP_FLOOR = 8;
const REP_CEILING = 12;
export const DEFAULT_WEIGHT_INCREMENT_LB = 5;
export const MAX_LIFT_SETS = 4;
const RUN_INCREMENT_KM = 0.5;
const RUN_BASELINE_KM = 5;
const BIKE_INCREMENT_KM = 3.5;
const BIKE_BASELINE_KM = 25;

export type LiftSuggestion = {
  weightLb: number;
  reps: number;
  sets: number;
  rationale: string;
};

/**
 * Reduces a logged session's individual sets to the single point double
 * progression judges against: the heaviest weight worked, and the lowest
 * rep count among sets *at* that weight — a lighter back-off/drop set (e.g.
 * a dropped third set) doesn't count against clearing the rep ceiling.
 */
export function summarizeLiftSession(sets: { weightLb: number; reps: number }[]): { weightLb: number; reps: number; sets: number } {
  const weightLb = Math.max(...sets.map((s) => s.weightLb));
  const repsAtTopWeight = sets.filter((s) => s.weightLb === weightLb).map((s) => s.reps);
  return { weightLb, reps: Math.min(...repsAtTopWeight), sets: sets.length };
}

/**
 * Double progression: add one rep before ever adding weight, since +1 rep is
 * always a smaller volume increase than +1 weight increment.
 */
export function suggestNextLift(
  last: { weightLb: number; reps: number; sets: number },
  incrementLb: number = DEFAULT_WEIGHT_INCREMENT_LB
): LiftSuggestion {
  if (last.reps < REP_CEILING) {
    return {
      weightLb: last.weightLb,
      reps: last.reps + 1,
      sets: last.sets,
      rationale: `+1 rep at the same weight (${last.weightLb}lb) — smaller increase than adding weight.`,
    };
  }
  return {
    weightLb: Math.round((last.weightLb + incrementLb) * 10) / 10,
    reps: REP_FLOOR,
    sets: last.sets,
    rationale: `Hit the ${REP_CEILING}-rep ceiling, so drop back to ${REP_FLOOR} reps and add ${incrementLb}lb.`,
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
