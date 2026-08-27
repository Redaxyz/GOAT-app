import { macroGrams, type MacroItem, type MealKey } from "@/lib/nutrition";

export function foodLogKey(meal: MealKey, groceryId: string): string {
  return `${meal}|${groceryId}`;
}

export function buildFoodLogMap(rows: { meal: string; groceryId: string; amountG: number }[]): Map<string, number> {
  return new Map(rows.map((r) => [foodLogKey(r.meal as MealKey, r.groceryId), r.amountG]));
}

export type LoggedItem = MacroItem & {
  meal: MealKey;
  loggedAmountG: number | null;
  loggedProteinG: number;
  loggedCarbG: number;
  loggedFatG: number;
  loggedCalories: number;
};

/**
 * Pairs each of a day's planned items (target amount = whatever the standing
 * plan currently says for that item) with whatever's actually been logged
 * for it on one specific date — `loggedAmountG` is null when nothing's been
 * logged yet, which the UI shows as the target as a placeholder rather than
 * a real value.
 */
export function getLoggedItems(mealItems: { meal: MealKey; items: MacroItem[] }[], foodLog: Map<string, number>): LoggedItem[] {
  const out: LoggedItem[] = [];
  for (const { meal, items } of mealItems) {
    for (const it of items) {
      const loggedAmountG = foodLog.get(foodLogKey(meal, it.groceryId)) ?? null;
      const macros = loggedAmountG != null ? macroGrams(loggedAmountG, it.per100g) : { proteinG: 0, carbG: 0, fatG: 0 };
      const loggedCalories = Math.round(macros.proteinG * 4 + macros.carbG * 4 + macros.fatG * 9);
      out.push({
        ...it,
        meal,
        loggedAmountG,
        loggedProteinG: macros.proteinG,
        loggedCarbG: macros.carbG,
        loggedFatG: macros.fatG,
        loggedCalories,
      });
    }
  }
  return out;
}

/** Day total — only items that actually have a logged amount contribute; an unlogged item counts as neither eaten nor zero. */
export function sumLoggedMacros(items: LoggedItem[]) {
  const logged = items.filter((it) => it.loggedAmountG != null);
  const proteinG = logged.reduce((sum, it) => sum + it.loggedProteinG, 0);
  const carbG = logged.reduce((sum, it) => sum + it.loggedCarbG, 0);
  const fatG = logged.reduce((sum, it) => sum + it.loggedFatG, 0);
  const calories = logged.reduce((sum, it) => sum + it.loggedCalories, 0);
  return { proteinG, carbG, fatG, calories, itemsLogged: logged.length, itemsTotal: items.length };
}
