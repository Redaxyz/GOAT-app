"use client";

import { useState } from "react";
import { setScheduleOverride, clearScheduleOverride, setScheduleExtra, clearScheduleExtra } from "@/app/actions";
import { SCHEDULE_TYPE_LABEL, RUN_VARIANT_LABEL, type ScheduleDayType, type RunVariant, type LiftDayDef } from "@/lib/schedule";
import { liftDayAbbr } from "@/lib/liftFormat";
import SubmitButton from "@/app/components/SubmitButton";

export type CalendarCell = {
  date: string; // "YYYY-MM-DD"
  day: number;
  type: ScheduleDayType;
  dayKey: string | null;
  runVariant: RunVariant | null;
  customLabel: string | null;
  /** Overrides the abbreviation — "R(s)"/distance for a RUN cell (short/long), or "G - B2" for a GYM cell. */
  note?: string | null;
  isToday: boolean;
  isOverridden: boolean;
  /** A second, additive workout for this date (added via the "+" below) — the day renders as a diagonal split of both colors when this is set. */
  secondary?: { type: ScheduleDayType; dayKey: string | null; runVariant: RunVariant | null; label: string } | null;
};

// Color-coded by activity so the calendar reads at a glance: gym black, run
// white, swim blue, row green, bike purple.
const TYPE_STYLE: Record<ScheduleDayType, string> = {
  GYM: "bg-black text-white",
  RUN: "bg-white text-black border-2 border-black/15",
  BIKE: "bg-purple-500 text-white",
  ROW: "bg-green-500 text-white",
  SWIM: "bg-blue-500 text-white",
  REST: "bg-red-500/80 text-white",
  OTHER: "bg-theme-accent/60 text-theme-own",
};

// Concrete color values for the two-workout diagonal-split gradient — same
// palette as TYPE_STYLE above, just as CSS colors instead of Tailwind classes
// (a dynamic per-cell gradient needs an inline style, not a static utility class).
const TYPE_COLOR_HEX: Record<ScheduleDayType, string> = {
  GYM: "#000000",
  RUN: "#ffffff",
  BIKE: "#a855f7",
  ROW: "#22c55e",
  SWIM: "#3b82f6",
  REST: "#ef4444",
  OTHER: "#6b7280",
};

// A visibly different shade per type, used for the *second* half of a split
// day whenever both workouts share the same type (e.g. two lift sessions) —
// otherwise the gradient would be the same color on both sides and the split
// would be invisible.
const TYPE_COLOR_HEX_SECONDARY: Record<ScheduleDayType, string> = {
  GYM: "#525252", // gray-600, vs. GYM's black
  RUN: "#d4d4d4", // gray-300, vs. RUN's white
  BIKE: "#6b21a8", // purple-800, vs. BIKE's purple-500
  ROW: "#15803d", // green-700, vs. ROW's green-500
  SWIM: "#1d4ed8", // blue-700, vs. SWIM's blue-500
  REST: "#b91c1c", // red-700 — unused in practice (Rest is excluded from the secondary picker)
  OTHER: "#374151", // gray-700 — unused in practice (Other is excluded from the secondary picker)
};

const TYPE_ABBR: Record<ScheduleDayType, string> = {
  GYM: "G",
  RUN: "R",
  BIKE: "Bike",
  ROW: "Row",
  SWIM: "Swim",
  REST: "–",
  OTHER: "O",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** One selectable option in the day-editor picker — a specific lift day, a specific run variant, or a plain type. */
type PickerOption = { key: string; label: string; dayType: ScheduleDayType; dayKey?: string; runVariant?: RunVariant };

function buildBaseOptions(liftDays: LiftDayDef[]): PickerOption[] {
  return [
    ...liftDays.map((d) => ({ key: `gym-${d.dayKey}`, label: liftDayAbbr(d.label), dayType: "GYM" as const, dayKey: d.dayKey })),
    { key: "run-long", label: RUN_VARIANT_LABEL.LONG, dayType: "RUN" as const, runVariant: "LONG" as const },
    { key: "run-short", label: RUN_VARIANT_LABEL.SHORT, dayType: "RUN" as const, runVariant: "SHORT" as const },
    { key: "bike", label: "Bike", dayType: "BIKE" as const },
    { key: "row", label: "Row", dayType: "ROW" as const },
    { key: "swim", label: "Swim", dayType: "SWIM" as const },
  ];
}

function optionMatches(option: PickerOption, type: ScheduleDayType, dayKey: string | null, runVariant: RunVariant | null): boolean {
  if (option.dayType !== type) return false;
  if (option.dayType === "GYM") return (option.dayKey ?? null) === dayKey;
  if (option.dayType === "RUN") return (option.runVariant ?? null) === runVariant;
  return true;
}

/** One picker button — a form that submits date + dayType (+ dayKey/runVariant when the option is a specific lift day or run variant) to whichever action it's given. */
function OptionButton({
  action,
  date,
  option,
  active,
  onSubmit,
}: {
  action: (formData: FormData) => void;
  date: string;
  option: PickerOption;
  active: boolean;
  onSubmit: () => void;
}) {
  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="dayType" value={option.dayType} />
      {option.dayKey && <input type="hidden" name="dayKey" value={option.dayKey} />}
      {option.runVariant && <input type="hidden" name="runVariant" value={option.runVariant} />}
      <button
        type="submit"
        disabled={active}
        className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition active:scale-95 ${
          active ? "bg-theme-accent text-theme-own" : "bg-theme-accent/10 hover:bg-theme-accent/20"
        }`}
      >
        {option.label}
      </button>
    </form>
  );
}

/**
 * Clicking today or any future day opens an inline editor below the grid:
 * pick exactly which lift day / run variant / other activity that date
 * should be (reusing setScheduleOverride/clearScheduleOverride), and
 * optionally add a second, additive workout for the same date via "+"
 * (setScheduleExtra/clearScheduleExtra) — for the rare day with two separate
 * sessions. A day with both renders as a diagonal split of the two colors.
 */
export default function MonthCalendar({
  monthLabel,
  cells,
  leadingBlanks,
  todayStr,
  liftDays,
}: {
  monthLabel: string;
  cells: CalendarCell[];
  leadingBlanks: number;
  todayStr: string;
  liftDays: LiftDayDef[];
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const openCell = cells.find((c) => c.date === openDate) ?? null;
  const baseOptions = buildBaseOptions(liftDays);
  const primaryOptions: PickerOption[] = [...baseOptions, { key: "rest", label: "Rest", dayType: "REST" }];

  function toggle(date: string) {
    setOtherOpen(false);
    setAddOpen(false);
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
          const abbr = cell.type === "OTHER" ? cell.customLabel?.trim()?.[0]?.toUpperCase() || "O" : cell.note ?? TYPE_ABBR[cell.type];
          const label = `${cell.customLabel || SCHEDULE_TYPE_LABEL[cell.type]}${cell.secondary ? ` + ${cell.secondary.label}` : ""}`;
          const title = `${cell.date} — ${label}${cell.isOverridden ? " (swapped)" : ""}`;
          const split = cell.secondary;
          // Same type on both halves (e.g. two lift sessions) would otherwise
          // gradient into itself and look like a plain, unsplit day.
          const secondaryColor = split && (split.type === cell.type ? TYPE_COLOR_HEX_SECONDARY[split.type] : TYPE_COLOR_HEX[split.type]);
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!editable}
              onClick={() => toggle(cell.date)}
              title={title}
              style={split ? { backgroundImage: `linear-gradient(120deg, ${TYPE_COLOR_HEX[cell.type]} 50%, ${secondaryColor} 50%)` } : undefined}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-extrabold transition ${
                split ? "" : TYPE_STYLE[cell.type]
              } ${cell.isToday ? "ring-2 ring-theme-accent" : ""} ${openDate === cell.date ? "ring-2 ring-theme-own" : ""} ${
                editable ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"
              }`}
            >
              {split ? (
                <span className="px-1 rounded bg-white/80 text-black leading-none">{cell.day}</span>
              ) : (
                <>
                  <span>{cell.day}</span>
                  <span className={`opacity-70 leading-none whitespace-nowrap ${abbr.length > 2 ? "text-[8px]" : ""}`}>{abbr}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {(["GYM", "RUN", "BIKE", "ROW", "SWIM", "REST"] as ScheduleDayType[]).map((t) => (
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
            {primaryOptions.map((option) => (
              <OptionButton
                key={option.key}
                action={setScheduleOverride}
                date={openCell.date}
                option={option}
                active={optionMatches(option, openCell.type, openCell.dayKey, openCell.runVariant)}
                onSubmit={() => setOpenDate(null)}
              />
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
                placeholder="e.g. Hike"
                required
                className="flex-1 text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              <SubmitButton className="px-3 py-1.5 rounded-full bg-theme-accent text-theme-own text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
                Save
              </SubmitButton>
            </form>
          )}

          <div className="mt-4 pt-3 border-t-2 border-theme-accent/15">
            {openCell.secondary ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold opacity-70">Second workout: {openCell.secondary.label}</span>
                <form action={clearScheduleExtra} onSubmit={() => setOpenDate(null)}>
                  <input type="hidden" name="date" value={openCell.date} />
                  <button type="submit" className="px-3 py-1.5 rounded-full text-xs font-bold opacity-50 hover:opacity-80 transition underline">
                    Remove
                  </button>
                </form>
              </div>
            ) : addOpen ? (
              <div className="flex items-center gap-2 flex-wrap">
                {baseOptions.map((option) => (
                  <OptionButton
                    key={option.key}
                    action={setScheduleExtra}
                    date={openCell.date}
                    option={option}
                    active={false}
                    onSubmit={() => setOpenDate(null)}
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label="Add a second workout"
                title="Add a second workout"
                className="w-8 h-8 rounded-full bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent text-lg font-extrabold transition active:scale-95"
              >
                +
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
