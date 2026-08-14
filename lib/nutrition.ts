import { prisma } from "@/lib/prisma";

// Baseline plan for "Me", straight from nutrition_plan.md. Friend's targets
// are always exactly 95% of these (scaled by the same BMR adjustment).
export const BASELINE_TARGETS = {
  proteinG: 180,
  carbsG: 195,
  fatG: 56,
  calories: 2000,
};

export const FRIEND_FACTOR = 0.95;

export const BASELINE_GROCERY = [
  { item: "Chicken breast, boneless skinless", amount: 985, unit: "g" },
  { item: "Chicken thigh, boneless skinless", amount: 859, unit: "g" },
  { item: "Salmon, Atlantic", amount: 744, unit: "g" },
  { item: "Ground beef, 90/10", amount: 495, unit: "g" },
  { item: "Tuna, canned in water", amount: 1496, unit: "g" },
  { item: "Rice, raw (white)", amount: 973, unit: "g" },
  { item: "Corn, kernels", amount: 630, unit: "g" },
  { item: "Eggs", amount: 14, unit: "count" },
  { item: "Greek yogurt (Oikos Triple Zero Vanilla)", amount: 1400, unit: "g" },
  { item: "Granola", amount: 280, unit: "g" },
  { item: "Mixed fruit", amount: 1400, unit: "g" },
] as const;

export type MacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  scaleFactor: number;
};

/** 1-month trailing average of wearable BMR readings, or null if not enough data. */
export async function getMonthlyAvgBmr(profileId: string): Promise<number | null> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { profileId, date: { gte: since }, bmrReadingKcal: { not: null } },
    select: { bmrReadingKcal: true },
  });

  if (checkIns.length === 0) return null;
  const total = checkIns.reduce((sum, c) => sum + (c.bmrReadingKcal ?? 0), 0);
  return Math.round(total / checkIns.length);
}

/**
 * "Me"'s macro targets, scaled off the 1-month avg BMR * activity factor when
 * available, falling back to the fixed baseline plan otherwise.
 */
export async function getMeTargets(meProfileId: string): Promise<MacroTargets> {
  const [avgBmr, profile] = await Promise.all([
    getMonthlyAvgBmr(meProfileId),
    prisma.profile.findUnique({ where: { id: meProfileId } }),
  ]);

  const activityFactor = profile?.activityFactor ?? 1.4;
  const adjustedCalories = avgBmr ? Math.round(avgBmr * activityFactor) : BASELINE_TARGETS.calories;
  const scaleFactor = adjustedCalories / BASELINE_TARGETS.calories;

  return {
    calories: adjustedCalories,
    proteinG: Math.round(BASELINE_TARGETS.proteinG * scaleFactor),
    carbsG: Math.round(BASELINE_TARGETS.carbsG * scaleFactor),
    fatG: Math.round(BASELINE_TARGETS.fatG * scaleFactor),
    scaleFactor,
  };
}

/** Friend's targets are always exactly 5% less than Me's current targets. */
export function getFriendTargets(meTargets: MacroTargets): MacroTargets {
  return {
    calories: Math.round(meTargets.calories * FRIEND_FACTOR),
    proteinG: Math.round(meTargets.proteinG * FRIEND_FACTOR),
    carbsG: Math.round(meTargets.carbsG * FRIEND_FACTOR),
    fatG: Math.round(meTargets.fatG * FRIEND_FACTOR),
    scaleFactor: meTargets.scaleFactor * FRIEND_FACTOR,
  };
}

export function getGroceryList(scaleFactor: number) {
  return BASELINE_GROCERY.map((row) => ({
    ...row,
    amount: Math.round(row.amount * scaleFactor),
  }));
}

// Fixed daily components, straight from nutrition_plan.md.

export const BREAKFAST = [
  { item: "Greek yogurt (Oikos Triple Zero Vanilla)", amount: 200, unit: "g" },
  { item: "Granola", amount: 40, unit: "g" },
  { item: "Mixed fruit", amount: 200, unit: "g" },
  { item: "Sugar-free syrup", amount: 30, unit: "g" },
] as const;

// Added to each of the 2 protein meals every day.
export const PER_MEAL_ADDONS = [
  { item: "Rice, raw (white)", amount: 70, unit: "g" },
  { item: "Corn, kernels", amount: 45, unit: "g" },
  { item: "Egg", amount: 1, unit: "count" },
] as const;

export const WEEKLY_MEAL_PLAN = [
  { day: "Day 1 — Monday", meals: [{ protein: "Chicken breast", amount: 367 }, { protein: "Salmon", amount: 232 }] },
  { day: "Day 2 — Tuesday", meals: [{ protein: "Salmon", amount: 256 }, { protein: "Tuna", amount: 408 }] },
  { day: "Day 3 — Wednesday", meals: [{ protein: "Chicken breast", amount: 386 }, { protein: "Ground beef (90/10)", amount: 234 }] },
  { day: "Day 4 — Thursday", meals: [{ protein: "Ground beef (90/10)", amount: 261 }, { protein: "Tuna", amount: 432 }] },
  { day: "Day 5 — Friday", meals: [{ protein: "Chicken thigh", amount: 443 }, { protein: "Tuna", amount: 248 }] },
  { day: "Day 6 — Saturday", meals: [{ protein: "Chicken thigh", amount: 416 }, { protein: "Chicken breast", amount: 232 }] },
  { day: "Day 7 — Sunday", meals: [{ protein: "Salmon", amount: 256 }, { protein: "Tuna", amount: 408 }] },
] as const;

export function getMealPlan(scaleFactor: number) {
  const scale = (amount: number) => Math.round(amount * scaleFactor);

  return {
    breakfast: BREAKFAST.map((row) => ({ ...row, amount: scale(row.amount) })),
    perMealAddons: PER_MEAL_ADDONS.map((row) => ({ ...row, amount: scale(row.amount) })),
    days: WEEKLY_MEAL_PLAN.map((day) => ({
      day: day.day,
      meals: day.meals.map((m) => ({ ...m, amount: scale(m.amount) })),
    })),
  };
}
