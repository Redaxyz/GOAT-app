"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { setMealPlanItemAmount, setMealPlanItemSwap, addMealPlanExtraItem, updateMealPlanExtraItemAmount, deleteMealPlanExtraItem } from "@/app/actions";
import {
  applyFoodSwaps,
  buildOverrideMap,
  foodSwapKey,
  groupFoodOptions,
  customFoodToOption,
  macroGrams,
  sumMacros,
  type CustomFoodRow,
  type MacroItem,
  type MealKey,
} from "@/lib/nutrition";
import SubmitButton from "@/app/components/SubmitButton";

type DayPlan = {
  day: string;
  breakfast: MacroItem[];
  lunch: MacroItem[];
  lunchNote: string;
  dinner: MacroItem[];
};

type OverrideRow = { day: string; meal: string; groceryId: string; amountG: number };

function amountKey(day: string, meal: MealKey, groceryId: string): string {
  return `${day}|${meal}|${groceryId}`;
}

/**
 * Editable version of the daily meal plan — changing a serving size, or
 * swapping an item for one of its alternatives, recomputes that item's
 * P/C/F, the day's totals, and (after a short save) the grocery list above,
 * live. Persisted to the STANDING plan for that weekday going forward, not
 * just today (see setMealPlanItemAmount / setMealPlanItemSwap). Each meal
 * also has an "+ Add" row to pull in anything from My Foods as an extra
 * item (see addMealPlanExtraItem), on top of the fixed plan.
 */
export default function EditableMealPlan({
  days,
  overrideRows,
  customFoodItems,
}: {
  days: DayPlan[];
  overrideRows: OverrideRow[];
  customFoodItems: CustomFoodRow[];
}) {
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of days) {
      for (const meal of ["breakfast", "lunch", "dinner"] as const) {
        for (const it of d[meal]) init[amountKey(d.day, meal, it.groceryId)] = it.amount;
      }
    }
    return init;
  });
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const router = useRouter();
  const [, startTransition] = useTransition();
  // One save timer per field, keyed the same as `amounts` — so editing
  // several items in a row debounces each independently instead of a single
  // shared timer dropping all but the last-touched field.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const overrides = buildOverrideMap(overrideRows);
  const swapsMap = new Map(Object.entries(swaps));

  function liveItem(day: string, meal: MealKey, it: MacroItem): MacroItem {
    const amount = amounts[amountKey(day, meal, it.groceryId)] ?? it.amount;
    return { ...it, amount, ...macroGrams(amount, it.per100g) };
  }

  /** Live amounts -> live swaps (identity + the pasta/rice sauce row) -> live amounts again, so a freshly-swapped-in item still picks up its own pending edit. */
  function liveMealItems(day: string, meal: MealKey, baseItems: MacroItem[]): MacroItem[] {
    const withAmounts = baseItems.map((it) => liveItem(day, meal, it));
    const swapped = applyFoodSwaps(withAmounts, day, meal, swapsMap, overrides);
    return swapped.map((it) => liveItem(day, meal, it));
  }

  function handleChange(day: string, meal: MealKey, it: MacroItem, value: string) {
    const amount = value === "" ? 0 : Number(value);
    if (!Number.isFinite(amount)) return;
    const key = amountKey(day, meal, it.groceryId);
    setAmounts((prev) => ({ ...prev, [key]: amount }));

    // Debounced instead of saving on every keystroke/blur — that was
    // refreshing the whole page (and jumping the scroll position) while
    // still mid-edit.
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      startTransition(async () => {
        if (it.extraItemId) await updateMealPlanExtraItemAmount(it.extraItemId, amount);
        else await setMealPlanItemAmount(day, meal, it.groceryId, amount);
        router.refresh();
      });
    }, 900);
  }

  function handleSwapChange(day: string, meal: MealKey, slot: string, groceryId: string) {
    setSwaps((prev) => ({ ...prev, [foodSwapKey(day, meal, slot)]: groceryId }));
    startTransition(async () => {
      await setMealPlanItemSwap(day, meal, slot, groceryId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {days.map((d) => {
        const breakfast = liveMealItems(d.day, "breakfast", d.breakfast);
        const lunch = liveMealItems(d.day, "lunch", d.lunch);
        const dinner = liveMealItems(d.day, "dinner", d.dinner);
        const total = sumMacros([breakfast, lunch, dinner]);
        return (
          <div key={d.day}>
            <div className="text-base font-extrabold mb-2">{d.day}</div>
            <EditableMealBlock
              label="Breakfast"
              day={d.day}
              meal="breakfast"
              items={breakfast}
              customFoodItems={customFoodItems}
              onChange={handleChange}
              onSwapChange={handleSwapChange}
            />
            <EditableMealBlock
              label="Lunch"
              day={d.day}
              meal="lunch"
              items={lunch}
              note={d.lunchNote}
              customFoodItems={customFoodItems}
              onChange={handleChange}
              onSwapChange={handleSwapChange}
            />
            <EditableMealBlock
              label="Dinner"
              day={d.day}
              meal="dinner"
              items={dinner}
              customFoodItems={customFoodItems}
              onChange={handleChange}
              onSwapChange={handleSwapChange}
            />
            <div className="flex items-center justify-between text-sm font-extrabold pt-1">
              <span className="opacity-60">Day total</span>
              <span>
                {total.calories} cal — {total.proteinG}P {total.carbG}C {total.fatG}F
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const GRID_COLS = "grid-cols-[1fr_4.5rem_2.25rem_2.25rem_2.25rem]";

function EditableMealBlock({
  label,
  day,
  meal,
  items,
  note,
  customFoodItems,
  onChange,
  onSwapChange,
}: {
  label: string;
  day: string;
  meal: MealKey;
  items: MacroItem[];
  note?: string;
  customFoodItems: CustomFoodRow[];
  onChange: (day: string, meal: MealKey, it: MacroItem, value: string) => void;
  onSwapChange: (day: string, meal: MealKey, slot: string, groceryId: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mb-3">
      <div className="text-sm font-bold opacity-60 mb-1">{label}</div>
      <div className={`grid ${GRID_COLS} items-center gap-2 pb-1 text-[10px] font-bold uppercase tracking-wide opacity-50`}>
        <span />
        <span className="text-right">Wt</span>
        <span className="text-right">C</span>
        <span className="text-right">P</span>
        <span className="text-right">F</span>
      </div>
      {items.map((it) => (
        <div key={it.groceryId} className={`grid ${GRID_COLS} items-center gap-2 py-2 text-base border-b-2 border-theme-accent/15 font-bold`}>
          {it.alternatives && it.slot ? (
            <select
              value={it.groceryId}
              onChange={(e) => onSwapChange(day, meal, it.slot as string, e.target.value)}
              className="truncate bg-transparent border-b-2 border-dotted border-theme-accent/40 outline-none font-bold"
            >
              {it.alternatives.map((alt) => (
                <option key={alt.groceryId} value={alt.groceryId}>
                  {alt.item}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex items-center gap-1 min-w-0">
              <span className="truncate">{it.item}</span>
              {it.extraItemId && (
                <form action={deleteMealPlanExtraItem}>
                  <input type="hidden" name="id" value={it.extraItemId} />
                  <button type="submit" className="text-base font-bold opacity-40 hover:opacity-80 transition leading-none shrink-0" aria-label={`Remove ${it.item}`}>
                    ×
                  </button>
                </form>
              )}
            </span>
          )}
          <span className="flex items-center justify-end gap-1 whitespace-nowrap">
            <input
              type="number"
              min="0"
              step="1"
              value={it.amount}
              onChange={(e) => onChange(day, meal, it, e.target.value)}
              className="w-14 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none"
            />
            {it.unit}
          </span>
          <span className="text-right text-sm opacity-70">{it.carbG}C</span>
          <span className="text-right text-sm opacity-70">{it.proteinG}P</span>
          <span className="text-right text-sm opacity-70">{it.fatG}F</span>
        </div>
      ))}
      {note && <div className="text-xs font-semibold opacity-50 pt-1">{note}</div>}

      {adding ? (
        <AddExtraItemForm day={day} meal={meal} customFoodItems={customFoodItems} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-bold text-theme-accent underline underline-offset-4 mt-1">
          + Add
        </button>
      )}
    </div>
  );
}

function AddExtraItemForm({
  day,
  meal,
  customFoodItems,
  onDone,
}: {
  day: string;
  meal: MealKey;
  customFoodItems: CustomFoodRow[];
  onDone: () => void;
}) {
  const groups = groupFoodOptions(customFoodItems.map(customFoodToOption));

  if (customFoodItems.length === 0) {
    return (
      <div className="mt-2 p-2 rounded-xl border-2 border-theme-accent/20 bg-theme-accent/5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold opacity-60">No saved foods yet — add one under My foods below first.</span>
        <button type="button" onClick={onDone} className="text-xs font-bold opacity-50 hover:opacity-80 transition shrink-0">
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      action={addMealPlanExtraItem}
      onSubmit={onDone}
      className="mt-2 p-2 rounded-xl border-2 border-theme-accent/20 bg-theme-accent/5 flex items-center gap-2 flex-wrap"
    >
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <select
        name="customFoodItemId"
        required
        className="flex-1 min-w-[9rem] truncate text-xs font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
      >
        {groups.map((g) => (
          <optgroup key={g.category} label={g.label}>
            {g.options.map((o) => (
              <option key={o.groceryId} value={o.groceryId}>
                {o.item}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        type="number"
        name="amountG"
        min="0"
        step="1"
        required
        placeholder="g"
        className="w-14 text-right text-xs font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
      />
      <SubmitButton className="px-3 py-1 rounded-full bg-theme-accent text-theme-own text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
        Add
      </SubmitButton>
      <button type="button" onClick={onDone} className="text-xs font-bold opacity-50 hover:opacity-80 transition">
        Cancel
      </button>
    </form>
  );
}
