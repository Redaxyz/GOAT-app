"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFoodItem, setFoodItemSwap, addSnack, deleteSnack } from "@/app/actions";
import { foodLogKey, getLoggedItems, sumLoggedMacros } from "@/lib/foodLog";
import { macroGrams, allFoodOptions, groupFoodOptions, type CustomFoodRow, type MacroItem, type MealKey } from "@/lib/nutrition";
import SubmitButton from "@/app/components/SubmitButton";

type MealGroup = { meal: MealKey; label: string; items: MacroItem[] };
type TargetTotal = { calories: number; proteinG: number; carbG: number; fatG: number };
type SnackEntry = { id: string; label: string; amountG: number | null; proteinG: number; carbG: number; fatG: number };

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
  initialSnacks,
  customFoodItems,
}: {
  dateStr: string;
  mealGroups: MealGroup[];
  initialFoodLog: Record<string, number>;
  targetTotal: TargetTotal;
  initialSnacks: SnackEntry[];
  customFoodItems: CustomFoodRow[];
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

  function handleSwapChange(meal: MealKey, slot: string, groceryId: string) {
    startTransition(async () => {
      await setFoodItemSwap(dateStr, meal, slot, groceryId);
      router.refresh();
    });
  }

  const loggedMap = new Map(Object.entries(amounts).filter((entry): entry is [string, number] => entry[1] != null));
  const mealTotal = sumLoggedMacros(getLoggedItems(mealGroups, loggedMap));
  const snackTotal = initialSnacks.reduce(
    (acc, s) => ({ proteinG: acc.proteinG + s.proteinG, carbG: acc.carbG + s.carbG, fatG: acc.fatG + s.fatG }),
    { proteinG: 0, carbG: 0, fatG: 0 }
  );
  const total = {
    proteinG: mealTotal.proteinG + snackTotal.proteinG,
    carbG: mealTotal.carbG + snackTotal.carbG,
    fatG: mealTotal.fatG + snackTotal.fatG,
    calories: mealTotal.calories + Math.round(snackTotal.proteinG * 4 + snackTotal.carbG * 4 + snackTotal.fatG * 9),
  };

  return (
    <div>
      {mealGroups.map((g) => (
        <MealBlock key={g.meal} label={g.label} meal={g.meal} items={g.items} amounts={amounts} onChange={handleChange} onSwapChange={handleSwapChange} />
      ))}
      <SnacksSection dateStr={dateStr} snacks={initialSnacks} customFoodItems={customFoodItems} />
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
  onSwapChange,
}: {
  label: string;
  meal: MealKey;
  items: MacroItem[];
  amounts: Record<string, number | null>;
  onChange: (meal: MealKey, groceryId: string, value: string) => void;
  onSwapChange: (meal: MealKey, slot: string, groceryId: string) => void;
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
            {it.alternatives && it.slot ? (
              <select
                value={it.groceryId}
                onChange={(e) => onSwapChange(meal, it.slot as string, e.target.value)}
                className="truncate bg-transparent border-b-2 border-dotted border-theme-accent/40 outline-none font-bold"
              >
                {it.alternatives.map((alt) => (
                  <option key={alt.groceryId} value={alt.groceryId}>
                    {alt.item}
                  </option>
                ))}
              </select>
            ) : (
              <span className="truncate">{it.item}</span>
            )}
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

/** Ad-hoc extras on top of the fixed plan above — pulled from the meal catalog, a saved custom food, or typed in free-hand. */
function SnacksSection({ dateStr, snacks, customFoodItems }: { dateStr: string; snacks: SnackEntry[]; customFoodItems: CustomFoodRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mb-3">
      <div className="text-sm font-bold opacity-60 mb-1">Snacks</div>
      {snacks.length === 0 && !adding && <div className="text-sm font-semibold opacity-40 pb-2">Nothing logged yet.</div>}
      {snacks.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-base border-b-2 border-theme-accent/15 font-bold">
          <span className="truncate flex-1">
            {s.label}
            {s.amountG != null && <span className="opacity-50 font-semibold"> ({s.amountG}g)</span>}
          </span>
          <span className="text-sm opacity-70 whitespace-nowrap">
            {s.carbG}C {s.proteinG}P {s.fatG}F
          </span>
          <form action={deleteSnack}>
            <input type="hidden" name="id" value={s.id} />
            <button type="submit" className="text-lg font-bold opacity-40 hover:opacity-80 transition leading-none px-1" aria-label={`Remove ${s.label}`}>
              ×
            </button>
          </form>
        </div>
      ))}

      {adding ? (
        <AddSnackForm dateStr={dateStr} customFoodItems={customFoodItems} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm font-bold text-theme-accent underline underline-offset-4 mt-1"
        >
          + Add snack
        </button>
      )}
    </div>
  );
}

const fieldClass =
  "text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1";

function AddSnackForm({ dateStr, customFoodItems, onDone }: { dateStr: string; customFoodItems: CustomFoodRow[]; onDone: () => void }) {
  const [source, setSource] = useState<"catalog" | "other">("catalog");
  const groups = groupFoodOptions(allFoodOptions(customFoodItems));

  return (
    <form action={addSnack} onSubmit={onDone} className="mt-2 p-3 rounded-2xl border-2 border-theme-accent/20 bg-theme-accent/5 space-y-2">
      <input type="hidden" name="date" value={dateStr} />
      <input type="hidden" name="source" value={source} />
      <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className={fieldClass}>
        <option value="catalog">From foods</option>
        <option value="other">Other</option>
      </select>

      {source === "catalog" && (
        <div className="flex items-center gap-2 flex-wrap">
          <select name="groceryId" required className={`flex-1 min-w-[9rem] truncate ${fieldClass}`}>
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
          <input type="number" name="amountG" min="0" step="1" required placeholder="g" className={`w-16 text-right ${fieldClass}`} />
        </div>
      )}

      {source === "other" && (
        <div className="space-y-2">
          <input type="text" name="label" required placeholder="Snack name" className={`w-full ${fieldClass}`} />
          <div className="flex items-center gap-2">
            <input type="number" name="proteinG" min="0" step="0.1" required placeholder="P" className={`w-14 text-right ${fieldClass}`} />
            <input type="number" name="carbG" min="0" step="0.1" required placeholder="C" className={`w-14 text-right ${fieldClass}`} />
            <input type="number" name="fatG" min="0" step="0.1" required placeholder="F" className={`w-14 text-right ${fieldClass}`} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton className="px-4 py-1.5 rounded-full bg-theme-accent text-theme-own text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
          Add
        </SubmitButton>
        <button type="button" onClick={onDone} className="text-xs font-bold opacity-50 hover:opacity-80 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
