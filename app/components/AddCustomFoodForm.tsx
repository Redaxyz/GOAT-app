"use client";

import { useState } from "react";
import { addCustomFoodItem } from "@/app/actions";
import SubmitButton from "@/app/components/SubmitButton";

const fieldClass = "text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1";
const macroClass = "w-16 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1";

/**
 * "My foods" add form. A food is measured either by weight (macros given for
 * a reference weight in grams — raw or cooked) or by units (macros given for
 * ONE unit, tracked as a count afterward — e.g. running gels).
 */
export default function AddCustomFoodForm() {
  const [measure, setMeasure] = useState<"weight" | "units">("weight");
  const [unitName, setUnitName] = useState("");

  return (
    <form action={addCustomFoodItem} className="space-y-3 mb-6">
      <input type="hidden" name="measure" value={measure} />
      <input name="name" placeholder="Food name" required className={`w-full text-base font-extrabold ${fieldClass}`} />

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={measure}
          onChange={(e) => setMeasure(e.target.value as typeof measure)}
          aria-label="Measure by"
          className={fieldClass}
        >
          <option value="weight">Measure by weight</option>
          <option value="units">Measure by units</option>
        </select>

        {measure === "weight" ? (
          <>
            <label className="flex items-center gap-1 text-sm font-bold opacity-70">
              <input name="amountG" type="number" min="0" step="1" required placeholder="Weight" className={`w-20 text-right font-extrabold ${fieldClass}`} />g
            </label>
            <select name="state" defaultValue="raw" className={fieldClass}>
              <option value="raw">Raw</option>
              <option value="cooked">Cooked</option>
            </select>
          </>
        ) : (
          <label className="flex items-center gap-1 text-sm font-bold opacity-70">
            Unit name
            <input
              name="unit"
              required
              maxLength={20}
              placeholder="gel"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className={`w-24 font-extrabold ${fieldClass}`}
            />
          </label>
        )}

        <select name="category" defaultValue="other" className={fieldClass}>
          <option value="protein">Protein</option>
          <option value="carb">Carb</option>
          <option value="other">Other</option>
        </select>
      </div>

      <p className="text-xs font-semibold opacity-50">
        {measure === "units"
          ? `Enter the macros for ONE ${unitName.trim() || "unit"} — you'll log it as a number of ${unitName.trim() || "units"} instead of grams. `
          : ""}
        Protein/carb foods also join the lunch and dinner swap dropdowns; other just adds it here and to the full food list.
      </p>

      <div className="flex items-center gap-3">
        {(["proteinG", "carbG", "fatG"] as const).map((field) => (
          <label key={field} className="flex items-center gap-1 text-sm font-bold opacity-70">
            <input name={field} type="number" min="0" step="0.1" required placeholder="0" className={macroClass} />
            {field === "proteinG" ? "P" : field === "carbG" ? "C" : "F"}
          </label>
        ))}
      </div>
      <SubmitButton className="px-5 py-2.5 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
        Add food
      </SubmitButton>
    </form>
  );
}
