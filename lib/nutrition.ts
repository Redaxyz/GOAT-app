// Locked, 7-day meal plan — 2026-08 revision. Lunch is fixed at a real,
// validated portion (350g chicken thigh / equivalent-protein ground beef —
// not "as much as can be solved for" or "the most that can ever be eaten"),
// and dinner is solved per day against whatever's left of the daily ceiling:
// don't exceed 180p/164c/70f (BASELINE_TARGETS below — carbs were traded for
// fat gram-for-gram on an isocaloric basis: +14g fat (9cal/g) ≈ -31g carb
// (4cal/g), so total calories land close to the same ~2000 as before). Every
// day picks whichever of {protein, fat} binds first for that day's dinner
// protein and stops there — the other one lands with some slack rather than
// being forced to hit exactly, so lunch and dinner both stay real, sized
// portions instead of one meal swallowing the whole day's budget.
export const BASELINE_TARGETS = {
  proteinG: 180,
  carbsG: 164,
  fatG: 70,
  calories: 2000,
};

export const FRIEND_FACTOR = 0.95;

// Cooking yields — raw purchase weight ≈ cooked weight ÷ yield. Only used to
// size the weekly grocery list; meals themselves are portioned by cooked
// weight. Salmon needs no such conversion — tracked at raw weight, same as
// it's eaten.
const CHICKEN_THIGH_COOKING_YIELD = 0.75;
const GROUND_BEEF_COOKING_YIELD = 0.75;
const TOP_SIRLOIN_COOKING_YIELD = 0.75;

// Per-100g macro rates. Cooked-basis rates apply to cooked-equivalent grams,
// not raw purchase grams — same convention as before.
const CHICKEN_THIGH_PER_100G_COOKED = { protein: 25, carb: 0, fat: 11 };
const GROUND_BEEF_93_7_PER_100G_COOKED = { protein: 28.2, carb: 0, fat: 8.1 }; // chosen over 90/10 — same protein at meaningfully less fat
const TOP_SIRLOIN_PER_100G_COOKED = { protein: 29, carb: 0, fat: 8.5 };
const SALMON_PER_100G_RAW = { protein: 20.3, carb: 0, fat: 13.1 };
const BASMATI_RICE_PER_100G_RAW = { protein: 7.13, carb: 78.13, fat: 0.44 };
const PASTA_PER_100G_DRY = { protein: 17.637, carb: 67.022, fat: 1.7637 }; // 10p/38c/1f per 2oz/56.7g
const RAO_SAUCE_PER_100G = { protein: 1.6, carb: 6.5, fat: 4.8 }; // Rao's Homemade, ~90cal/2p/8c/6f per 1/2 cup (124g) serving
const YOGURT_PER_100G = { protein: 10, carb: 4.12, fat: 0 };
const GRANOLA_PER_100G = { protein: 10, carb: 64, fat: 15 };
const FRUIT_PER_100G = { protein: 0.9, carb: 15.5, fat: 0.3 };
const EGG_PER_100G_COOKED = { protein: 12.6, carb: 1.2, fat: 9.6 }; // ~2 large eggs per 100g cooked
const TOAST_PER_100G_BREAD = { protein: 12, carb: 50, fat: 4 }; // standard sandwich bread, ~25g/slice
const AVOCADO_PER_100G = { protein: 2, carb: 8.5, fat: 14.7 };

function macroGrams(amountG: number, per100g: { protein: number; carb: number; fat: number }) {
  return {
    proteinG: Math.round((amountG / 100) * per100g.protein),
    carbG: Math.round((amountG / 100) * per100g.carb),
    fatG: Math.round((amountG / 100) * per100g.fat),
  };
}

// ---- Fixed amounts (same every time that meal appears) -------------------
const YOGURT_DAILY = 200;
const GRANOLA_DAILY = 40;
const FRUIT_DAILY = 200;
const EGG_G = 100; // ~2 large eggs
const TOAST_G = 25; // 1 slice
const AVOCADO_G = 100; // ~1/2 avocado
const LUNCH_RICE_G = 70; // raw basmati, every lunch
const DINNER_SAUCE_G = 125; // Rao's tomato sauce, ~1/2 cup, every dinner

// ---- Lunch: real, fixed portions — not solved, not maxed out -------------
// 350g chicken thigh + 70g rice is the user's actual established lunch.
// Ground beef's lunch amount matches it for protein (350g thigh = 87.5g
// protein; 310g of 93/7 ground beef carries the same 87.5g) so both lunches
// deliver comparable substance.
const LUNCH_CHICKEN_THIGH_G = 350; // Mon/Wed/Fri
const LUNCH_GROUND_BEEF_G = 310; // Tue/Thu/Sat/Sun — protein-equivalent to 350g chicken thigh

// ---- Dinner: solved per day against what's left of 180p/164c/70f once
// breakfast + lunch + rice + sauce are fixed. Each day, dinner's protein
// source amount is set by whichever of {remaining protein, remaining fat}
// is the tighter (smaller) constraint — that source stops there rather than
// being pushed to hit both, so dinner is never squeezed to near-nothing
// (weekday sirloin/salmon: protein binds first — dinner is protein-limited,
// with some fat headroom left over. Weekend salmon/sirloin: the egg
// breakfast's fat already eats most of the budget, so fat binds first
// instead, and dinner protein comes in lower than weekdays as a result.)
const DINNER_SIRLOIN_WEEKDAY_G = 173; // Mon/Wed/Fri
const DINNER_SALMON_WEEKDAY_G = 229; // Tue/Thu
const DINNER_PASTA_WEEKDAY_G = 54;

const DINNER_SALMON_WEEKEND_G = 86; // Sat
const DINNER_SIRLOIN_WEEKEND_G = 132; // Sun
const DINNER_PASTA_WEEKEND_G = 118;

type BreakfastKind = "standard" | "eggToast";
type LunchKind = "chickenThigh" | "groundBeef";
type DinnerKind = "sirloin" | "salmon";

// Locked day-by-day plan, straight from the user's spec.
export const WEEKLY_MEAL_PLAN = [
  { day: "Monday", breakfast: "standard", lunch: "chickenThigh", dinner: "sirloin" },
  { day: "Tuesday", breakfast: "standard", lunch: "groundBeef", dinner: "salmon" },
  { day: "Wednesday", breakfast: "standard", lunch: "chickenThigh", dinner: "sirloin" },
  { day: "Thursday", breakfast: "standard", lunch: "groundBeef", dinner: "salmon" },
  { day: "Friday", breakfast: "standard", lunch: "chickenThigh", dinner: "sirloin" },
  { day: "Saturday", breakfast: "eggToast", lunch: "groundBeef", dinner: "salmon" },
  { day: "Sunday", breakfast: "eggToast", lunch: "groundBeef", dinner: "sirloin" },
] as const satisfies { day: string; breakfast: BreakfastKind; lunch: LunchKind; dinner: DinnerKind }[];

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

type MacroItem = { item: string; groceryId: string; amount: number; unit: string; proteinG: number; carbG: number; fatG: number };

function row(
  item: string,
  groceryId: string,
  amount: number,
  unit: string,
  per100g: { protein: number; carb: number; fat: number },
  scaleFactor: number
): MacroItem {
  const scaledAmount = Math.round(amount * scaleFactor);
  return { item, groceryId, amount: scaledAmount, unit, ...macroGrams(scaledAmount, per100g) };
}

function breakfastItems(kind: BreakfastKind, scaleFactor: number): MacroItem[] {
  if (kind === "standard") {
    return [
      row("Greek yogurt (Oikos Triple Zero Vanilla)", "yogurt", YOGURT_DAILY, "g", YOGURT_PER_100G, scaleFactor),
      row("Granola", "granola", GRANOLA_DAILY, "g", GRANOLA_PER_100G, scaleFactor),
      row("Mixed fruit", "fruit", FRUIT_DAILY, "g", FRUIT_PER_100G, scaleFactor),
    ];
  }
  return [
    row("Eggs (2)", "eggs", EGG_G, "g", EGG_PER_100G_COOKED, scaleFactor),
    row("Toast", "toast", TOAST_G, "g", TOAST_PER_100G_BREAD, scaleFactor),
    row("Avocado (1/2)", "avocado", AVOCADO_G, "g", AVOCADO_PER_100G, scaleFactor),
  ];
}

function lunchItems(kind: LunchKind, scaleFactor: number): MacroItem[] {
  const protein =
    kind === "chickenThigh"
      ? row("Chicken thigh, cooked", "chickenThigh", LUNCH_CHICKEN_THIGH_G, "g", CHICKEN_THIGH_PER_100G_COOKED, scaleFactor)
      : row("Ground beef 93/7, cooked", "groundBeef", LUNCH_GROUND_BEEF_G, "g", GROUND_BEEF_93_7_PER_100G_COOKED, scaleFactor);
  return [protein, row("Basmati rice, raw", "rice", LUNCH_RICE_G, "g", BASMATI_RICE_PER_100G_RAW, scaleFactor)];
}

function dinnerItems(kind: DinnerKind, breakfastKind: BreakfastKind, scaleFactor: number): MacroItem[] {
  const pastaG = breakfastKind === "standard" ? DINNER_PASTA_WEEKDAY_G : DINNER_PASTA_WEEKEND_G;
  const protein =
    kind === "sirloin"
      ? row(
          "Top sirloin, cooked",
          "sirloin",
          breakfastKind === "standard" ? DINNER_SIRLOIN_WEEKDAY_G : DINNER_SIRLOIN_WEEKEND_G,
          "g",
          TOP_SIRLOIN_PER_100G_COOKED,
          scaleFactor
        )
      : row(
          "Salmon, Atlantic, raw",
          "salmon",
          breakfastKind === "standard" ? DINNER_SALMON_WEEKDAY_G : DINNER_SALMON_WEEKEND_G,
          "g",
          SALMON_PER_100G_RAW,
          scaleFactor
        );
  return [
    protein,
    row("Protein pasta, dry", "pasta", pastaG, "g", PASTA_PER_100G_DRY, scaleFactor),
    row("Rao's tomato sauce", "sauce", DINNER_SAUCE_G, "g", RAO_SAUCE_PER_100G, scaleFactor),
  ];
}

function sumMacros(items: MacroItem[][]) {
  let proteinG = 0,
    carbG = 0,
    fatG = 0;
  for (const group of items) {
    for (const it of group) {
      proteinG += it.proteinG;
      carbG += it.carbG;
      fatG += it.fatG;
    }
  }
  const calories = Math.round(proteinG * 4 + carbG * 4 + fatG * 9);
  return { proteinG, carbG, fatG, calories };
}

export function getMealPlan(scaleFactor: number) {
  return WEEKLY_MEAL_PLAN.map(({ day, breakfast, lunch, dinner }) => {
    const breakfastRows = breakfastItems(breakfast, scaleFactor);
    const lunchRows = lunchItems(lunch, scaleFactor);
    const dinnerRows = dinnerItems(dinner, breakfast, scaleFactor);
    return {
      day,
      breakfast: breakfastRows,
      lunch: lunchRows,
      lunchNote: "+ assorted vegetables (not tracked)",
      dinner: dinnerRows,
      total: sumMacros([breakfastRows, lunchRows, dinnerRows]),
    };
  });
}

// Raw purchase weight needs cooked weight ÷ yield for these three; every
// other grocery item is tracked at the same weight it's eaten.
const GROCERY_DISPLAY: Record<string, { label: string; cookingYield?: number }> = {
  chickenThigh: { label: "Chicken thigh, boneless skinless (raw)", cookingYield: CHICKEN_THIGH_COOKING_YIELD },
  groundBeef: { label: "Ground beef, 93/7 (raw)", cookingYield: GROUND_BEEF_COOKING_YIELD },
  sirloin: { label: "Top sirloin (raw)", cookingYield: TOP_SIRLOIN_COOKING_YIELD },
  salmon: { label: "Salmon, Atlantic, raw" },
  rice: { label: "Basmati rice, raw" },
  pasta: { label: "Protein pasta, dry" },
  sauce: { label: "Rao's tomato sauce" },
  yogurt: { label: "Greek yogurt (Oikos Triple Zero Vanilla)" },
  granola: { label: "Granola" },
  fruit: { label: "Mixed fruit" },
  eggs: { label: "Eggs" },
  toast: { label: "Bread, toast" },
  avocado: { label: "Avocado" },
};

const GROCERY_ORDER = Object.keys(GROCERY_DISPLAY);

/** Weekly grocery list — summed straight from the locked meal plan, so it can never drift out of sync with it. */
export function getGroceryList(scaleFactor: number) {
  const totals = new Map<string, { amount: number; proteinG: number; carbG: number; fatG: number }>();
  for (const day of getMealPlan(1)) {
    for (const it of [...day.breakfast, ...day.lunch, ...day.dinner]) {
      const existing = totals.get(it.groceryId) ?? { amount: 0, proteinG: 0, carbG: 0, fatG: 0 };
      existing.amount += it.amount;
      existing.proteinG += it.proteinG;
      existing.carbG += it.carbG;
      existing.fatG += it.fatG;
      totals.set(it.groceryId, existing);
    }
  }

  return GROCERY_ORDER.map((groceryId) => {
    const t = totals.get(groceryId);
    if (!t) return null;
    const display = GROCERY_DISPLAY[groceryId];
    const rawAmount = display.cookingYield ? t.amount / display.cookingYield : t.amount;
    return {
      item: display.label,
      amount: Math.round(rawAmount * scaleFactor),
      unit: "g",
      proteinG: Math.round(t.proteinG * scaleFactor),
      carbG: Math.round(t.carbG * scaleFactor),
      fatG: Math.round(t.fatG * scaleFactor),
    };
  }).filter((row): row is NonNullable<typeof row> => row != null);
}
