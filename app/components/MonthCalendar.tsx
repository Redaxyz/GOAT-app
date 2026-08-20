import type { ScheduleDayType } from "@/lib/schedule";

export type CalendarCell = {
  date: string; // "YYYY-MM-DD"
  day: number;
  type: ScheduleDayType;
  isToday: boolean;
  isOverridden: boolean;
};

const TYPE_STYLE: Record<ScheduleDayType, string> = {
  GYM: "bg-theme-accent text-theme-own",
  RUN: "bg-theme-accent/35",
  BIKE: "bg-theme-accent/15",
  REST: "bg-transparent opacity-40",
};

const TYPE_ABBR: Record<ScheduleDayType, string> = {
  GYM: "G",
  RUN: "R",
  BIKE: "B",
  REST: "–",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthCalendar({ monthLabel, cells, leadingBlanks }: { monthLabel: string; cells: CalendarCell[]; leadingBlanks: number }) {
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
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-extrabold ${TYPE_STYLE[cell.type]} ${
              cell.isToday ? "ring-2 ring-theme-accent" : ""
            }`}
            title={`${cell.date} — ${cell.type}${cell.isOverridden ? " (swapped)" : ""}`}
          >
            <span>{cell.day}</span>
            <span className="opacity-70 leading-none">{TYPE_ABBR[cell.type]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {(Object.keys(TYPE_ABBR) as ScheduleDayType[]).map((t) => (
          <div key={t} className="flex items-center gap-1 text-[10px] font-bold opacity-60">
            <span className={`w-3 h-3 rounded ${TYPE_STYLE[t]}`} />
            {t === "GYM" ? "Gym" : t === "RUN" ? "Run" : t === "BIKE" ? "Bike" : "Rest"}
          </div>
        ))}
      </div>
    </div>
  );
}
