// Locked, 7-day meal plan. Every item below has a baseline serving size,
// but any of them can be overridden per profile (see MealPlanItemOverride) —
// editing a serving size on the Grocery page recomputes that item's P/C/F
// live, which rolls up into the day's totals and the weekly grocery list.

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

// Alternatives a logged item can be swapped for on a given day (see
// MacroItem.slot/alternatives and FoodItemSwap) — same shape as a plan row's
// per100g rate, just not tied to a fixed baseline amount since the swap
// carries over whatever amount the original item already had.
const FAGE_YOGURT_PER_100G = { protein: 18 / 1.7, carb: 5 / 1.7, fat: 0 }; // Fage, 0F/18P/5C per 170g serving
const TUNA_PER_100G = { protein: 25.5, carb: 0, fat: 0.8 }; // canned in water, drained

export type MacroRate = { protein: number; carb: number; fat: number };
export type SwapOption = { groceryId: string; item: string; per100g: MacroRate };

const BREAKFAST_YOGURT_ALTERNATIVES: SwapOption[] = [
  { groceryId: "yogurt", item: "Greek yogurt (Oikos Triple Zero Vanilla)", per100g: YOGURT_PER_100G },
  { groceryId: "fageYogurt", item: "Fage Yogurt", per100g: FAGE_YOGURT_PER_100G },
];

// Shared by lunch and dinner — same slots, same options, since (per the
// user) they're "the same exact meals".
const MEAT_ALTERNATIVES: SwapOption[] = [
  { groceryId: "chickenThigh", item: "Chicken thigh, cooked", per100g: CHICKEN_THIGH_PER_100G_COOKED },
  { groceryId: "groundBeef", item: "Ground beef 93/7, cooked", per100g: GROUND_BEEF_93_7_PER_100G_COOKED },
  { groceryId: "salmon", item: "Salmon, Atlantic, raw", per100g: SALMON_PER_100G_RAW },
  { groceryId: "steak", item: "Top sirloin, cooked", per100g: TOP_SIRLOIN_PER_100G_COOKED },
  { groceryId: "tuna", item: "Tuna, canned in water", per100g: TUNA_PER_100G },
];

const CARB_ALTERNATIVES: SwapOption[] = [
  { groceryId: "rice", item: "Basmati rice, raw", per100g: BASMATI_RICE_PER_100G_RAW },
  { groceryId: "pasta", item: "Protein pasta, dry", per100g: PASTA_PER_100G_DRY },
];

// Every food in the plan catalog, flattened into one list — used for the
// Snacks picker on Home, so a snack can be logged as "more of" anything
// already in the plan without redefining its macro rate. "Fruit (any,
// average)" is FRUIT_PER_100G under a clearer name for this context: no
// single rate is exactly right for every fruit, but averaged across common
// ones (apple/banana/orange/berries/grapes all land within ~1g P, ~4g C,
// ~0.3g F of these per 100g) it's a reasonable stand-in when you don't want
// to pick a specific one.
export const ALL_FOOD_OPTIONS: SwapOption[] = [
  ...BREAKFAST_YOGURT_ALTERNATIVES,
  { groceryId: "granola", item: "Granola", per100g: GRANOLA_PER_100G },
  { groceryId: "fruit", item: "Fruit (any, average)", per100g: FRUIT_PER_100G },
  { groceryId: "eggs", item: "Eggs, cooked", per100g: EGG_PER_100G_COOKED },
  { groceryId: "toast", item: "Bread, toast", per100g: TOAST_PER_100G_BREAD },
  { groceryId: "avocado", item: "Avocado", per100g: AVOCADO_PER_100G },
  ...MEAT_ALTERNATIVES,
  ...CARB_ALTERNATIVES,
  { groceryId: "sauce", item: "Rao's tomato sauce", per100g: RAO_SAUCE_PER_100G },
];

/** Shared by both the server (initial render) and the client (live recompute as a serving size changes). */
export function macroGrams(amountG: number, per100g: MacroRate) {
  return {
    proteinG: Math.round((amountG / 100) * per100g.protein),
    carbG: Math.round((amountG / 100) * per100g.carb),
    fatG: Math.round((amountG / 100) * per100g.fat),
  };
}

// ---- Baseline serving sizes — the starting point before any per-item edit -
const YOGURT_DAILY = 200;
const GRANOLA_DAILY = 40;
const FRUIT_DAILY = 200;
const EGG_G = 100; // ~2 large eggs
const TOAST_G = 25; // 1 slice
const AVOCADO_G = 100; // ~1/2 avocado
const LUNCH_RICE_G = 70; // raw basmati
const SAUCE_G = 125; // Rao's tomato sauce, ~1/2 cup — pairs with pasta, whichever meal it's chosen for

// 350g chicken thigh + 70g rice is the user's actual established lunch.
// Ground beef's lunch amount matches it for protein (350g thigh = 87.5g
// protein; 310g of 93/7 ground beef carries the same 87.5g).
const LUNCH_CHICKEN_THIGH_G = 350; // Mon/Wed/Fri
const LUNCH_GROUND_BEEF_G = 310; // Tue/Thu/Sat/Sun

// Dinner baselines — solved once against a 180p/164c/70f day (weekday) and a
// relaxed weekend ceiling, back when this was still a fixed plan; now just
// the starting point every profile can adjust from.
const DINNER_SIRLOIN_WEEKDAY_G = 173; // Mon/Wed/Fri
const DINNER_SALMON_WEEKDAY_G = 229; // Tue/Thu
const DINNER_PASTA_WEEKDAY_G = 54;
const DINNER_SALMON_WEEKEND_G = 86; // Sat
const DINNER_SIRLOIN_WEEKEND_G = 132; // Sun
const DINNER_PASTA_WEEKEND_G = 118;

type BreakfastKind = "standard" | "eggToast";
type LunchKind = "chickenThigh" | "groundBeef";
type DinnerKind = "sirloin" | "salmon";
export type MealKey = "breakfast" | "lunch" | "dinner";

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

export type MacroItem = {
  item: string;
  groceryId: string;
  amount: number;
  unit: string;
  per100g: MacroRate;
  proteinG: number;
  carbG: number;
  fatG: number;
  /** Stable slot id ("yogurt" | "meat" | "carb") — present only on items that can be swapped for an alternative on a given day. */
  slot?: string;
  alternatives?: SwapOption[];
};

/** Key an item's saved override by day + meal + groceryId. */
export function overrideKey(day: string, meal: MealKey, groceryId: string): string {
  return `${day}|${meal}|${groceryId}`;
}

export function buildOverrideMap(rows: { day: string; meal: string; groceryId: string; amountG: number }[]): Map<string, number> {
  return new Map(rows.map((r) => [overrideKey(r.day, r.meal as MealKey, r.groceryId), r.amountG]));
}

function row(
  day: string,
  meal: MealKey,
  item: string,
  groceryId: string,
  baselineAmount: number,
  unit: string,
  per100g: MacroRate,
  overrides: Map<string, number>,
  swap?: { slot: string; alternatives: SwapOption[] }
): MacroItem {
  const amount = overrides.get(overrideKey(day, meal, groceryId)) ?? baselineAmount;
  return { item, groceryId, amount, unit, per100g, ...macroGrams(amount, per100g), ...(swap ?? {}) };
}

function breakfastItems(day: string, kind: BreakfastKind, overrides: Map<string, number>): MacroItem[] {
  if (kind === "standard") {
    return [
      row(day, "breakfast", "Greek yogurt (Oikos Triple Zero Vanilla)", "yogurt", YOGURT_DAILY, "g", YOGURT_PER_100G, overrides, {
        slot: "yogurt",
        alternatives: BREAKFAST_YOGURT_ALTERNATIVES,
      }),
      row(day, "breakfast", "Granola", "granola", GRANOLA_DAILY, "g", GRANOLA_PER_100G, overrides),
      row(day, "breakfast", "Mixed fruit", "fruit", FRUIT_DAILY, "g", FRUIT_PER_100G, overrides),
    ];
  }
  return [
    row(day, "breakfast", "Eggs (2)", "eggs", EGG_G, "g", EGG_PER_100G_COOKED, overrides),
    row(day, "breakfast", "Toast", "toast", TOAST_G, "g", TOAST_PER_100G_BREAD, overrides),
    row(day, "breakfast", "Avocado (1/2)", "avocado", AVOCADO_G, "g", AVOCADO_PER_100G, overrides),
  ];
}

function lunchItems(day: string, kind: LunchKind, overrides: Map<string, number>): MacroItem[] {
  const meatSwap = { slot: "meat", alternatives: MEAT_ALTERNATIVES };
  const protein =
    kind === "chickenThigh"
      ? row(day, "lunch", "Chicken thigh, cooked", "chickenThigh", LUNCH_CHICKEN_THIGH_G, "g", CHICKEN_THIGH_PER_100G_COOKED, overrides, meatSwap)
      : row(day, "lunch", "Ground beef 93/7, cooked", "groundBeef", LUNCH_GROUND_BEEF_G, "g", GROUND_BEEF_93_7_PER_100G_COOKED, overrides, meatSwap);
  const carb = row(day, "lunch", "Basmati rice, raw", "rice", LUNCH_RICE_G, "g", BASMATI_RICE_PER_100G_RAW, overrides, {
    slot: "carb",
    alternatives: CARB_ALTERNATIVES,
  });
  // Rice is lunch's default carb, so no sauce row by default — applyFoodSwaps
  // adds one (see sauceRow) when the carb slot is switched to pasta.
  return [protein, carb];
}

function dinnerItems(day: string, kind: DinnerKind, breakfastKind: BreakfastKind, overrides: Map<string, number>): MacroItem[] {
  const isWeekday = breakfastKind === "standard";
  const pastaG = isWeekday ? DINNER_PASTA_WEEKDAY_G : DINNER_PASTA_WEEKEND_G;
  const meatSwap = { slot: "meat", alternatives: MEAT_ALTERNATIVES };
  const protein =
    kind === "sirloin"
      ? row(
          day,
          "dinner",
          "Top sirloin, cooked",
          "sirloin",
          isWeekday ? DINNER_SIRLOIN_WEEKDAY_G : DINNER_SIRLOIN_WEEKEND_G,
          "g",
          TOP_SIRLOIN_PER_100G_COOKED,
          overrides,
          meatSwap
        )
      : row(
          day,
          "dinner",
          "Salmon, Atlantic, raw",
          "salmon",
          isWeekday ? DINNER_SALMON_WEEKDAY_G : DINNER_SALMON_WEEKEND_G,
          "g",
          SALMON_PER_100G_RAW,
          overrides,
          meatSwap
        );
  const carb = row(day, "dinner", "Protein pasta, dry", "pasta", pastaG, "g", PASTA_PER_100G_DRY, overrides, {
    slot: "carb",
    alternatives: CARB_ALTERNATIVES,
  });
  // Pasta is dinner's default carb, so the sauce row ships by default —
  // applyFoodSwaps removes it if the carb slot is switched to rice.
  return [protein, carb, sauceRow(day, "dinner", overrides)];
}

/** The pasta-pairing sauce row — present by default at dinner, added/removed at either meal by applyFoodSwaps as the carb slot's resolved choice changes. */
function sauceRow(day: string, meal: MealKey, overrides: Map<string, number>): MacroItem {
  return row(day, meal, "Rao's tomato sauce", "sauce", SAUCE_G, "g", RAO_SAUCE_PER_100G, overrides);
}

/** Key a saved swap by day + meal + slot — the slot id is stable regardless of which groceryId is the day's current default. */
export function foodSwapKey(day: string, meal: MealKey, slot: string): string {
  return `${day}|${meal}|${slot}`;
}

/** For FoodItemSwap rows — all scoped to one specific date, so `day` (the weekday name that date falls on) is passed once rather than read per-row. */
export function buildFoodSwapMap(day: string, rows: { meal: string; slot: string; groceryId: string }[]): Map<string, string> {
  return new Map(rows.map((r) => [foodSwapKey(day, r.meal as MealKey, r.slot), r.groceryId]));
}

/** For MealPlanItemSwap rows — the standing plan, so every row carries its own weekday. */
export function buildMealPlanSwapMap(rows: { day: string; meal: string; slot: string; groceryId: string }[]): Map<string, string> {
  return new Map(rows.map((r) => [foodSwapKey(r.day, r.meal as MealKey, r.slot), r.groceryId]));
}

/**
 * Applies any selected alternative to one meal's items, recomputing that
 * item's macros at its existing amount. Also keeps the pasta-pairing sauce
 * row in sync with the carb slot's resolved choice (lunch and dinner only):
 * added if it's missing and the carb is now pasta, removed if it's present
 * and the carb is now rice.
 */
export function applyFoodSwaps(items: MacroItem[], day: string, meal: MealKey, swaps: Map<string, string>, overrides: Map<string, number>): MacroItem[] {
  let result = items.map((it) => {
    if (!it.slot || !it.alternatives) return it;
    const selectedId = swaps.get(foodSwapKey(day, meal, it.slot));
    if (!selectedId || selectedId === it.groceryId) return it;
    const alt = it.alternatives.find((a) => a.groceryId === selectedId);
    if (!alt) return it;
    return { ...it, item: alt.item, groceryId: alt.groceryId, per100g: alt.per100g, ...macroGrams(it.amount, alt.per100g) };
  });

  const carbItem = result.find((it) => it.slot === "carb");
  if (carbItem) {
    const wantsSauce = carbItem.groceryId === "pasta";
    const hasSauce = result.some((it) => it.groceryId === "sauce");
    if (wantsSauce && !hasSauce) result = [...result, sauceRow(day, meal, overrides)];
    else if (!wantsSauce && hasSauce) result = result.filter((it) => it.groceryId !== "sauce");
  }

  return result;
}

export function sumMacros(items: MacroItem[][]) {
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

/** `swaps` — standing per-weekday swaps (see MealPlanItemSwap); a date-specific swap layers on top via a second applyFoodSwaps call. */
export function getMealPlan(overrides: Map<string, number>, swaps: Map<string, string> = new Map()) {
  return WEEKLY_MEAL_PLAN.map(({ day, breakfast, lunch, dinner }) => {
    const breakfastRows = applyFoodSwaps(breakfastItems(day, breakfast, overrides), day, "breakfast", swaps, overrides);
    const lunchRows = applyFoodSwaps(lunchItems(day, lunch, overrides), day, "lunch", swaps, overrides);
    const dinnerRows = applyFoodSwaps(dinnerItems(day, dinner, breakfast, overrides), day, "dinner", swaps, overrides);
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
  steak: { label: "Top sirloin (raw)", cookingYield: TOP_SIRLOIN_COOKING_YIELD }, // same cut as sirloin — tracked separately since it's picked via the meat swap rather than the default plan
  salmon: { label: "Salmon, Atlantic, raw" },
  tuna: { label: "Tuna, canned in water" },
  rice: { label: "Basmati rice, raw" },
  pasta: { label: "Protein pasta, dry" },
  sauce: { label: "Rao's tomato sauce" },
  yogurt: { label: "Greek yogurt (Oikos Triple Zero Vanilla)" },
  fageYogurt: { label: "Fage Yogurt" },
  granola: { label: "Granola" },
  fruit: { label: "Mixed fruit" },
  eggs: { label: "Eggs" },
  toast: { label: "Bread, toast" },
  avocado: { label: "Avocado" },
};

const GROCERY_ORDER = Object.keys(GROCERY_DISPLAY);

/** Weekly grocery list — summed straight from the locked meal plan (with any per-item edits and standing swaps applied), so it can never drift out of sync with it. */
export function getGroceryList(overrides: Map<string, number>, swaps: Map<string, string> = new Map()) {
  const totals = new Map<string, { amount: number; proteinG: number; carbG: number; fatG: number }>();
  for (const day of getMealPlan(overrides, swaps)) {
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
      amount: Math.round(rawAmount),
      unit: "g",
      proteinG: t.proteinG,
      carbG: t.carbG,
      fatG: t.fatG,
    };
  }).filter((row): row is NonNullable<typeof row> => row != null);
}
