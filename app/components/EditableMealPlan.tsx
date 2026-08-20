"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setMealPlanItemAmount } from "@/app/actions";
import { macroGrams, sumMacros, type MacroItem, type MealKey } from "@/lib/nutrition";

type DayPlan = {
  day: string;
  breakfast: MacroItem[];
  lunch: MacroItem[];
  lunchNote: string;
  dinner: MacroItem[];
};

function amountKey(day: string, meal: MealKey, groceryId: string): string {
  return `${day}|${meal}|${groceryId}`;
}

/** Editable version of the daily meal plan — changing a serving size recomputes that item's P/C/F, the day's totals, and (after a short save) the grocery list above, live. */
export default function EditableMealPlan({ days }: { days: DayPlan[] }) {
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const d of days) {
      for (const meal of ["breakfast", "lunch", "dinner"] as const) {
        for (const it of d[meal]) init[amountKey(d.day, meal, it.groceryId)] = it.amount;
      }
    }
    return init;
  });
  const router = useRouter();
  const [, startTransition] = useTransition();

  function liveItem(day: string, meal: MealKey, it: MacroItem): MacroItem {
    const amount = amounts[amountKey(day, meal, it.groceryId)] ?? it.amount;
    return { ...it, amount, ...macroGrams(amount, it.per100g) };
  }

  function handleChange(day: string, meal: MealKey, groceryId: string, value: string) {
    const amount = value === "" ? 0 : Number(value);
    if (!Number.isFinite(amount)) return;
    setAmounts((prev) => ({ ...prev, [amountKey(day, meal, groceryId)]: amount }));
  }

  function handleBlur(day: string, meal: MealKey, groceryId: string) {
    const amount = amounts[amountKey(day, meal, groceryId)];
    if (amount == null) return;
    startTransition(async () => {
      await setMealPlanItemAmount(day, meal, groceryId, amount);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {days.map((d) => {
        const breakfast = d.breakfast.map((it) => liveItem(d.day, "breakfast", it));
        const lunch = d.lunch.map((it) => liveItem(d.day, "lunch", it));
        const dinner = d.dinner.map((it) => liveItem(d.day, "dinner", it));
        const total = sumMacros([breakfast, lunch, dinner]);
        return (
          <div key={d.day}>
            <div className="text-base font-extrabold mb-2">{d.day}</div>
            <EditableMealBlock label="Breakfast" day={d.day} meal="breakfast" items={breakfast} onChange={handleChange} onBlur={handleBlur} />
            <EditableMealBlock
              label="Lunch"
              day={d.day}
              meal="lunch"
              items={lunch}
              note={d.lunchNote}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <EditableMealBlock label="Dinner" day={d.day} meal="dinner" items={dinner} onChange={handleChange} onBlur={handleBlur} />
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
  onChange,
  onBlur,
}: {
  label: string;
  day: string;
  meal: MealKey;
  items: MacroItem[];
  note?: string;
  onChange: (day: string, meal: MealKey, groceryId: string, value: string) => void;
  onBlur: (day: string, meal: MealKey, groceryId: string) => void;
}) {
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
          <span className="truncate">{it.item}</span>
          <span className="flex items-center justify-end gap-1 whitespace-nowrap">
            <input
              type="number"
              min="0"
              step="1"
              value={it.amount}
              onChange={(e) => onChange(day, meal, it.groceryId, e.target.value)}
              onBlur={() => onBlur(day, meal, it.groceryId)}
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
    </div>
  );
}
