"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFoodItem } from "@/app/actions";
import { foodLogKey, getLoggedItems, sumLoggedMacros } from "@/lib/foodLog";
import { macroGrams, type MacroItem, type MealKey } from "@/lib/nutrition";

type MealGroup = { meal: MealKey; label: string; items: MacroItem[] };
type TargetTotal = { calories: number; proteinG: number; carbG: number; fatG: number };

/**
 * Today's meal plan, editable into an actual food log: each item's box shows
 * the plan's target amount as a faint placeholder — type a real amount and
 * it replaces the ghost number outright (native placeholder behavior), and
 * that item's macros switch from the plan's estimate to the logged actual.
 */
export default function FoodLogSection({
  dateStr,
  mealGroups,
  initialFoodLog,
  targetTotal,
}: {
  dateStr: string;
  mealGroups: MealGroup[];
  initialFoodLog: Record<string, number>;
  targetTotal: TargetTotal;
}) {
  const [amounts, setAmounts] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    for (const g of mealGroups) for (const it of g.items) init[foodLogKey(g.meal, it.groceryId)] = initialFoodLog[foodLogKey(g.meal, it.groceryId)] ?? null;
    return init;
  });
  const router = useRouter();
  const [, startTransition] = useTransition();
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function handleChange(meal: MealKey, groceryId: string, value: string) {
    const key = foodLogKey(meal, groceryId);
    const amount = value.trim() === "" ? null : Number(value);
    if (amount != null && !Number.isFinite(amount)) return;
    setAmounts((prev) => ({ ...prev, [key]: amount }));

    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      startTransition(async () => {
        await logFoodItem(dateStr, meal, groceryId, amount);
        router.refresh();
      });
    }, 900);
  }

  const loggedMap = new Map(Object.entries(amounts).filter((entry): entry is [string, number] => entry[1] != null));
  const total = sumLoggedMacros(getLoggedItems(mealGroups, loggedMap));

  return (
    <div>
      {mealGroups.map((g) => (
        <MealBlock key={g.meal} label={g.label} meal={g.meal} items={g.items} amounts={amounts} onChange={handleChange} />
      ))}
      <div className="flex items-center justify-between text-base font-extrabold pt-2 border-t-2 border-theme-accent/15 mt-2">
        <span className="opacity-70">Logged today</span>
        <span>
          {total.calories} / {targetTotal.calories} cal goal
        </span>
      </div>
      <div className="text-sm font-semibold opacity-60 text-right">
        {total.proteinG}P {total.carbG}C {total.fatG}F
      </div>
    </div>
  );
}

const GRID_COLS = "grid-cols-[1fr_4.5rem_2.25rem_2.25rem_2.25rem]";

function MealBlock({
  label,
  meal,
  items,
  amounts,
  onChange,
}: {
  label: string;
  meal: MealKey;
  items: MacroItem[];
  amounts: Record<string, number | null>;
  onChange: (meal: MealKey, groceryId: string, value: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="text-sm font-bold opacity-60 mb-1">{label}</div>
      <div className={`grid ${GRID_COLS} items-center gap-2 pb-1 text-[10px] font-bold uppercase tracking-wide opacity-50`}>
        <span />
        <span className="text-right">Amt</span>
        <span className="text-right">C</span>
        <span className="text-right">P</span>
        <span className="text-right">F</span>
      </div>
      {items.map((it) => {
        const loggedAmount = amounts[foodLogKey(meal, it.groceryId)] ?? null;
        const isLogged = loggedAmount != null;
        const macros = isLogged ? macroGrams(loggedAmount, it.per100g) : { proteinG: it.proteinG, carbG: it.carbG, fatG: it.fatG };
        return (
          <div key={it.groceryId} className={`grid ${GRID_COLS} items-center gap-2 py-2 text-base border-b-2 border-theme-accent/15 font-bold`}>
            <span className="truncate">{it.item}</span>
            <span className="flex items-center justify-end gap-1 whitespace-nowrap">
              <input
                type="number"
                min="0"
                step="1"
                value={loggedAmount ?? ""}
                placeholder={String(it.amount)}
                onChange={(e) => onChange(meal, it.groceryId, e.target.value)}
                className="w-14 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none placeholder:opacity-30 placeholder:font-bold"
              />
              {it.unit}
            </span>
            <span className={`text-right text-sm ${isLogged ? "opacity-70" : "opacity-30"}`}>{macros.carbG}C</span>
            <span className={`text-right text-sm ${isLogged ? "opacity-70" : "opacity-30"}`}>{macros.proteinG}P</span>
            <span className={`text-right text-sm ${isLogged ? "opacity-70" : "opacity-30"}`}>{macros.fatG}F</span>
          </div>
        );
      })}
    </div>
  );
}
