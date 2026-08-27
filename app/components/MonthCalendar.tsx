"use client";

import { useState } from "react";
import { setScheduleOverride, clearScheduleOverride } from "@/app/actions";
import { SCHEDULE_TYPE_LABEL, type ScheduleDayType } from "@/lib/schedule";
import SubmitButton from "@/app/components/SubmitButton";

export type CalendarCell = {
  date: string; // "YYYY-MM-DD"
  day: number;
  type: ScheduleDayType;
  customLabel: string | null;
  isToday: boolean;
  isOverridden: boolean;
};

const TYPE_STYLE: Record<ScheduleDayType, string> = {
  GYM: "bg-theme-accent text-theme-own",
  RUN: "bg-theme-accent/35",
  BIKE: "bg-theme-accent/15",
  ROW: "bg-theme-accent/50",
  SWIM: "bg-theme-accent/25",
  REST: "bg-transparent opacity-40",
  OTHER: "bg-theme-accent/60 text-theme-own",
};

const TYPE_ABBR: Record<ScheduleDayType, string> = {
  GYM: "G",
  RUN: "R",
  BIKE: "B",
  ROW: "Rw",
  SWIM: "Sw",
  REST: "–",
  OTHER: "O",
};

// "Other" is edited via its own text field below, not a plain type button.
const EDITABLE_TYPES: ScheduleDayType[] = ["GYM", "RUN", "BIKE", "ROW", "SWIM", "REST"];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Clicking today or any future day opens an inline editor below the grid to
 * swap that date's schedule type — reuses setScheduleOverride/
 * clearScheduleOverride, the same actions the Fitness tab's own "Today"
 * swap buttons use.
 */
export default function MonthCalendar({
  monthLabel,
  cells,
  leadingBlanks,
  todayStr,
}: {
  monthLabel: string;
  cells: CalendarCell[];
  leadingBlanks: number;
  todayStr: string;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const openCell = cells.find((c) => c.date === openDate) ?? null;

  function toggle(date: string) {
    setOtherOpen(false);
    setOpenDate((prev) => (prev === date ? null : date));
  }

  return (
    <div className="mb-8">
      <div className="text-sm font-extrabold mb-2">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-bold opacity-40">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {cells.map((cell) => {
          const editable = cell.date >= todayStr;
          const abbr = cell.type === "OTHER" ? cell.customLabel?.trim()?.[0]?.toUpperCase() || "O" : TYPE_ABBR[cell.type];
          const title = `${cell.date} — ${cell.type === "OTHER" ? cell.customLabel || "Other" : cell.type}${cell.isOverridden ? " (swapped)" : ""}`;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!editable}
              onClick={() => toggle(cell.date)}
              title={title}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-extrabold transition ${TYPE_STYLE[cell.type]} ${
                cell.isToday ? "ring-2 ring-theme-accent" : ""
              } ${openDate === cell.date ? "ring-2 ring-theme-own" : ""} ${
                editable ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"
              }`}
            >
              <span>{cell.day}</span>
              <span className="opacity-70 leading-none">{abbr}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {EDITABLE_TYPES.map((t) => (
          <div key={t} className="flex items-center gap-1 text-[10px] font-bold opacity-60">
            <span className={`w-3 h-3 rounded ${TYPE_STYLE[t]}`} />
            {SCHEDULE_TYPE_LABEL[t]}
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
          <span className={`w-3 h-3 rounded ${TYPE_STYLE.OTHER}`} />
          Other
        </div>
      </div>

      {openCell && (
        <div className="mt-3 p-4 rounded-2xl border-2 border-theme-accent/30 bg-theme-accent/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-extrabold">{openCell.date}</span>
            <button type="button" onClick={() => setOpenDate(null)} className="text-xs font-bold opacity-50 hover:opacity-80 transition">
              Close
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {EDITABLE_TYPES.map((t) => (
              <form key={t} action={setScheduleOverride} onSubmit={() => setOpenDate(null)}>
                <input type="hidden" name="date" value={openCell.date} />
                <input type="hidden" name="dayType" value={t} />
                <button
                  type="submit"
                  disabled={t === openCell.type}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition active:scale-95 ${
                    t === openCell.type ? "bg-theme-accent text-theme-own" : "bg-theme-accent/10 hover:bg-theme-accent/20"
                  }`}
                >
                  {SCHEDULE_TYPE_LABEL[t]}
                </button>
              </form>
            ))}
            <button
              type="button"
              onClick={() => setOtherOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition active:scale-95 ${
                openCell.type === "OTHER" ? "bg-theme-accent text-theme-own" : "bg-theme-accent/10 hover:bg-theme-accent/20"
              }`}
            >
              Other
            </button>
            {openCell.isOverridden && (
              <form action={clearScheduleOverride} onSubmit={() => setOpenDate(null)}>
                <input type="hidden" name="date" value={openCell.date} />
                <button type="submit" className="px-3 py-1.5 rounded-full text-xs font-bold opacity-50 hover:opacity-80 transition underline">
                  Reset
                </button>
              </form>
            )}
          </div>

          {(otherOpen || openCell.type === "OTHER") && (
            <form action={setScheduleOverride} onSubmit={() => setOpenDate(null)} className="flex items-center gap-2 mt-3">
              <input type="hidden" name="date" value={openCell.date} />
              <input type="hidden" name="dayType" value="OTHER" />
              <input
                type="text"
                name="customLabel"
                defaultValue={openCell.customLabel ?? ""}
                placeholder="e.g. Swim"
                required
                className="flex-1 text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              <SubmitButton className="px-3 py-1.5 rounded-full bg-theme-accent text-theme-own text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
                Save
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
