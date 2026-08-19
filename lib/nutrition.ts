// Fixed daily targets. The grocery page always uses these directly — it does
// not scale by BMR check-in data.
export const BASELINE_TARGETS = {
  proteinG: 180,
  carbsG: 195,
  fatG: 56,
  calories: 2000,
};

export const FRIEND_FACTOR = 0.95;

// Chicken thigh loses ~25% of its weight to cooking; the grocery list needs
// raw purchase weight even though meals are portioned by cooked weight.
// Salmon and tuna are tracked at the weight actually eaten (raw fillet /
// drained can) since that's the basis their macros were given in.
const CHICKEN_COOKING_YIELD = 0.75;

type ProteinKind = "chicken" | "salmon" | "tuna";

type DayType = {
  lunch: { protein: ProteinKind; item: string; amount: number; rice: number };
  dinner: { protein: ProteinKind; item: string; amount: number; pasta: number };
};

const GRANOLA_DAILY = 40; // g, same every day
const FRUIT_DAILY = 200; // g, same every day
const YOGURT_DAILY = 200; // g, same every day — standardized, no longer a per-day-type variable

// Lunch is always tuna + rice — tuna never goes with the pasta dinner.
// Dinner alternates chicken/salmon for variety. With yogurt/granola/fruit
// all fixed the same every day, rice/pasta/protein amounts are what absorb
// the difference between chicken and salmon days to keep hitting the exact
// macro targets.
//
// Each day's numbers are solved independently (not just scaled) so every day
// lands on the exact 180p/195c/56f/~2000cal targets regardless of which
// proteins are used — chicken, salmon, and tuna each have a different
// protein:fat ratio, so the portions aren't interchangeable.
const DAY_TYPES: Record<"tunaChicken" | "tunaSalmon", DayType> = {
  tunaChicken: {
    lunch: { protein: "tuna", item: "Tuna, canned in water (drained)", amount: 113, rice: 31 },
    dinner: { protein: "chicken", item: "Chicken thigh, cooked", amount: 417, pasta: 158 },
  },
  tunaSalmon: {
    lunch: { protein: "tuna", item: "Tuna, canned in water (drained)", amount: 339, rice: 74 },
    dinner: { protein: "salmon", item: "Salmon, Atlantic, raw", amount: 348, pasta: 106 },
  },
};

export const WEEKLY_MEAL_PLAN = [
  { day: "Monday", type: "tunaChicken" },
  { day: "Tuesday", type: "tunaSalmon" },
  { day: "Wednesday", type: "tunaChicken" },
  { day: "Thursday", type: "tunaSalmon" },
  { day: "Friday", type: "tunaChicken" },
  { day: "Saturday", type: "tunaSalmon" },
  { day: "Sunday", type: "tunaChicken" },
] as const satisfies { day: string; type: keyof typeof DAY_TYPES }[];

function weeklySum(pick: (d: DayType) => number) {
  return WEEKLY_MEAL_PLAN.reduce((sum, { type }) => sum + pick(DAY_TYPES[type]), 0);
}

const weeklyChickenCooked = weeklySum((d) => (d.dinner.protein === "chicken" ? d.dinner.amount : 0));
const weeklySalmonRaw = weeklySum((d) => (d.dinner.protein === "salmon" ? d.dinner.amount : 0));
const weeklyTuna = weeklySum((d) => d.lunch.amount);
const weeklyRice = weeklySum((d) => d.lunch.rice);
const weeklyPasta = weeklySum((d) => d.dinner.pasta);

// Weekly grocery list, derived from the day-by-day plan above. Chicken is
// converted from cooked meal weight to raw purchase weight.
export const BASELINE_GROCERY = [
  {
    item: "Chicken thigh, boneless skinless (raw)",
    amount: Math.round(weeklyChickenCooked / CHICKEN_COOKING_YIELD),
    unit: "g",
  },
  { item: "Salmon, Atlantic, raw", amount: weeklySalmonRaw, unit: "g" },
  { item: "Tuna, canned in water (drained)", amount: weeklyTuna, unit: "g" },
  { item: "Rice, raw (white)", amount: weeklyRice, unit: "g" },
  { item: "Protein pasta, dry", amount: weeklyPasta, unit: "g" },
  { item: "Greek yogurt (Oikos Triple Zero Vanilla)", amount: YOGURT_DAILY * WEEKLY_MEAL_PLAN.length, unit: "g" },
  { item: "Granola", amount: GRANOLA_DAILY * WEEKLY_MEAL_PLAN.length, unit: "g" },
  { item: "Mixed fruit", amount: FRUIT_DAILY * WEEKLY_MEAL_PLAN.length, unit: "g" },
] as const;

export type MacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  scaleFactor: number;
};

/** Friend's targets are always exactly 5% less than Me's. */
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

export function getMealPlan(scaleFactor: number) {
  const scale = (amount: number) => Math.round(amount * scaleFactor);

  return WEEKLY_MEAL_PLAN.map(({ day, type }) => {
    const t = DAY_TYPES[type];
    return {
      day,
      breakfast: [
        { item: "Greek yogurt (Oikos Triple Zero Vanilla)", amount: scale(YOGURT_DAILY), unit: "g" },
        { item: "Granola", amount: scale(GRANOLA_DAILY), unit: "g" },
        { item: "Mixed fruit", amount: scale(FRUIT_DAILY), unit: "g" },
      ],
      lunch: [
        { item: t.lunch.item, amount: scale(t.lunch.amount), unit: "g" },
        { item: "Rice, raw (white)", amount: scale(t.lunch.rice), unit: "g" },
      ],
      dinner: [
        { item: t.dinner.item, amount: scale(t.dinner.amount), unit: "g" },
        { item: "Protein pasta, dry", amount: scale(t.dinner.pasta), unit: "g" },
      ],
    };
  });
}
