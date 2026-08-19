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

// Per-100g macro rates, used both to size the plan and to show C/P/F columns
// on the grocery page. Chicken's rate is on a *cooked* basis — always apply
// it to cooked-equivalent grams, not raw purchase grams.
const CHICKEN_PER_100G_COOKED = { protein: 25, carb: 0, fat: 11 };
const SALMON_PER_100G_RAW = { protein: 20.3, carb: 0, fat: 13.1 };
const TUNA_PER_100G_DRAINED = { protein: 17.699, carb: 0, fat: 0.4425 }; // 20p/0.5f per 113g can
const RICE_PER_100G_RAW = { protein: 6.67, carb: 80, fat: 0.67 };
const PASTA_PER_100G_DRY = { protein: 17.637, carb: 67.022, fat: 1.7637 }; // 10p/38c/1f per 2oz/56.7g
const YOGURT_PER_100G = { protein: 10, carb: 4.12, fat: 0 };
const GRANOLA_PER_100G = { protein: 10, carb: 64, fat: 15 };
const FRUIT_PER_100G = { protein: 0.9, carb: 15.5, fat: 0.3 };

function macroGrams(amountG: number, per100g: { protein: number; carb: number; fat: number }) {
  return {
    proteinG: Math.round((amountG / 100) * per100g.protein),
    carbG: Math.round((amountG / 100) * per100g.carb),
    fatG: Math.round((amountG / 100) * per100g.fat),
  };
}

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
const weeklyYogurt = YOGURT_DAILY * WEEKLY_MEAL_PLAN.length;
const weeklyGranola = GRANOLA_DAILY * WEEKLY_MEAL_PLAN.length;
const weeklyFruit = FRUIT_DAILY * WEEKLY_MEAL_PLAN.length;

// Weekly grocery list, derived from the day-by-day plan above. Chicken's
// listed amount is raw purchase weight, but its macros are computed from the
// cooked-equivalent total (weeklyChickenCooked) since the macro rate is a
// cooked-basis rate.
export const BASELINE_GROCERY = [
  {
    item: "Chicken thigh, boneless skinless (raw)",
    amount: Math.round(weeklyChickenCooked / CHICKEN_COOKING_YIELD),
    unit: "g",
    ...macroGrams(weeklyChickenCooked, CHICKEN_PER_100G_COOKED),
  },
  { item: "Salmon, Atlantic, raw", amount: weeklySalmonRaw, unit: "g", ...macroGrams(weeklySalmonRaw, SALMON_PER_100G_RAW) },
  { item: "Tuna, canned in water (drained)", amount: weeklyTuna, unit: "g", ...macroGrams(weeklyTuna, TUNA_PER_100G_DRAINED) },
  { item: "Rice, raw (white)", amount: weeklyRice, unit: "g", ...macroGrams(weeklyRice, RICE_PER_100G_RAW) },
  { item: "Protein pasta, dry", amount: weeklyPasta, unit: "g", ...macroGrams(weeklyPasta, PASTA_PER_100G_DRY) },
  {
    item: "Greek yogurt (Oikos Triple Zero Vanilla)",
    amount: weeklyYogurt,
    unit: "g",
    ...macroGrams(weeklyYogurt, YOGURT_PER_100G),
  },
  { item: "Granola", amount: weeklyGranola, unit: "g", ...macroGrams(weeklyGranola, GRANOLA_PER_100G) },
  { item: "Mixed fruit", amount: weeklyFruit, unit: "g", ...macroGrams(weeklyFruit, FRUIT_PER_100G) },
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
    proteinG: Math.round(row.proteinG * scaleFactor),
    carbG: Math.round(row.carbG * scaleFactor),
    fatG: Math.round(row.fatG * scaleFactor),
  }));
}

export function getMealPlan(scaleFactor: number) {
  const row = (item: string, amount: number, unit: string, per100g: { protein: number; carb: number; fat: number }) => {
    const scaledAmount = Math.round(amount * scaleFactor);
    return { item, amount: scaledAmount, unit, ...macroGrams(scaledAmount, per100g) };
  };

  return WEEKLY_MEAL_PLAN.map(({ day, type }) => {
    const t = DAY_TYPES[type];
    const dinnerRate = t.dinner.protein === "chicken" ? CHICKEN_PER_100G_COOKED : SALMON_PER_100G_RAW;
    return {
      day,
      breakfast: [
        row("Greek yogurt (Oikos Triple Zero Vanilla)", YOGURT_DAILY, "g", YOGURT_PER_100G),
        row("Granola", GRANOLA_DAILY, "g", GRANOLA_PER_100G),
        row("Mixed fruit", FRUIT_DAILY, "g", FRUIT_PER_100G),
      ],
      lunch: [
        row(t.lunch.item, t.lunch.amount, "g", TUNA_PER_100G_DRAINED),
        row("Rice, raw (white)", t.lunch.rice, "g", RICE_PER_100G_RAW),
      ],
      dinner: [row(t.dinner.item, t.dinner.amount, "g", dinnerRate), row("Protein pasta, dry", t.dinner.pasta, "g", PASTA_PER_100G_DRY)],
    };
  });
}
