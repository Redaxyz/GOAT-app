"use client";

import { useState } from "react";
import { submitCheckIn } from "@/app/actions";
import { formatDateLabel, dateOnly } from "@/lib/date";
import { NumberRow, YesNoRow } from "@/app/components/CheckInFields";
import SubmitButton from "@/app/components/SubmitButton";

type ExistingCheckIn = { bmrReadingKcal: number | null; stuckToFitnessPlan: boolean; stuckToMealPlan: boolean } | null;

/**
 * The quick "how did yesterday go" recap at the top of Home. Collapses to a
 * one-line "Yesterday complete" pill once submitted — the checkmark from
 * SubmitButton's own saved-state gets a moment on screen (via onSettled)
 * before the card shrinks down.
 */
export default function YesterdayCard({ dateStr, existing }: { dateStr: string; existing: ExistingCheckIn }) {
  const [collapsed, setCollapsed] = useState(existing != null);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-5 py-4 rounded-3xl border-2 border-theme-accent/30 bg-theme-accent/5 mb-8">
        <span className="text-base font-extrabold">Yesterday complete</span>
      </div>
    );
  }

  return (
    <div className="border-2 border-theme-accent rounded-3xl p-5 mb-8 bg-theme-accent/5">
      <div className="text-xs font-bold uppercase tracking-wide text-theme-accent mb-1">Yesterday — {formatDateLabel(dateOnly(dateStr))}</div>
      <form action={submitCheckIn}>
        <input type="hidden" name="date" value={dateStr} />
        <NumberRow name="bmrReadingKcal" label="Calories burned" defaultValue={existing?.bmrReadingKcal} />
        <YesNoRow name="stuckToFitnessPlan" label="Completed fitness?" value={existing?.stuckToFitnessPlan} />
        <YesNoRow name="stuckToMealPlan" label="Completed food?" value={existing?.stuckToMealPlan} />
        <SubmitButton
          onSettled={() => setTimeout(() => setCollapsed(true), 1500)}
          className="w-full mt-4 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition"
        >
          Submit
        </SubmitButton>
      </form>
    </div>
  );
}
