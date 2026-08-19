"use client";

import { useState } from "react";

const CATEGORIES: { max: number; label: string }[] = [
  { max: 18.5, label: "Underweight" },
  { max: 25, label: "Normal weight" },
  { max: 30, label: "Overweight" },
  { max: Infinity, label: "Obese" },
];

function categoryFor(bmi: number): string {
  return CATEGORIES.find((c) => bmi < c.max)?.label ?? "Obese";
}

export default function BmiCalculator({
  initialFeet,
  initialInches,
  initialWeightLb,
}: {
  initialFeet: number;
  initialInches: number;
  initialWeightLb: number;
}) {
  const [feet, setFeet] = useState(initialFeet);
  const [inches, setInches] = useState(initialInches);
  const [weightLb, setWeightLb] = useState(initialWeightLb);

  const totalInches = feet * 12 + inches;
  // BMI = 703 * lb / in^2 — the US-units form of weightKg / heightM^2.
  const bmi = totalInches > 0 && weightLb > 0 ? (703 * weightLb) / (totalInches * totalInches) : null;

  return (
    <div className="border-2 border-theme-accent/20 rounded-3xl p-5">
      <div className="flex items-end gap-4 flex-wrap mb-4">
        <label className="flex flex-col text-[10px] font-bold opacity-50 uppercase tracking-wide">
          Feet
          <input
            type="number"
            min={0}
            value={feet}
            onChange={(e) => setFeet(Number(e.target.value) || 0)}
            className="w-16 text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mt-0.5"
          />
        </label>
        <label className="flex flex-col text-[10px] font-bold opacity-50 uppercase tracking-wide">
          Inches
          <input
            type="number"
            min={0}
            max={11.5}
            step={0.5}
            value={inches}
            onChange={(e) => setInches(Number(e.target.value) || 0)}
            className="w-16 text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mt-0.5"
          />
        </label>
        <label className="flex flex-col text-[10px] font-bold opacity-50 uppercase tracking-wide">
          Weight (lb)
          <input
            type="number"
            min={0}
            step={0.1}
            value={weightLb}
            onChange={(e) => setWeightLb(Number(e.target.value) || 0)}
            className="w-20 text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mt-0.5"
          />
        </label>
      </div>

      {bmi != null ? (
        <div>
          <div className="text-3xl font-extrabold">{bmi.toFixed(1)}</div>
          <div className="text-sm font-bold opacity-60">{categoryFor(bmi)}</div>
        </div>
      ) : (
        <div className="text-sm font-bold opacity-50">Enter height and weight.</div>
      )}
    </div>
  );
}
