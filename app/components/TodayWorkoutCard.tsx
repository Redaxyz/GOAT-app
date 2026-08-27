import { submitLift, submitCardio, setScheduleOverride, clearScheduleOverride } from "@/app/actions";
import { suggestNextLift, summarizeLiftSession, MAX_LIFT_SETS } from "@/lib/overload";
import { SCHEDULE_TYPE_LABEL, type ScheduleDayType } from "@/lib/schedule";
import { formatDateLabel, dateOnly } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import type { LiftSetEntry } from "@/lib/types";
import type { FitnessData } from "@/lib/fitnessData";
import { resolveDayEntry } from "@/lib/fitnessData";
import SubmitButton from "@/app/components/SubmitButton";

export function liftSets(lift: { sets: unknown }): LiftSetEntry[] {
  return lift.sets as LiftSetEntry[];
}

export function formatSetsLb(sets: LiftSetEntry[]): string {
  return sets.map((s) => `${kgToLb(s.weightKg)}lb×${s.reps}`).join(", ");
}

/**
 * The "what's scheduled today, and let me log it right here" card — shared
 * between Home (today only) and the Fitness tab's own Today card, so the
 * two never drift apart.
 */
export default function TodayWorkoutCard({ data, dateStr, label = "Today" }: { data: FitnessData; dateStr: string; label?: string }) {
  const info = resolveDayEntry(data, dateStr);

  return (
    <div className="border-2 border-theme-accent rounded-3xl p-5 mb-8 bg-theme-accent/5">
      <div className="text-xs font-bold uppercase tracking-wide text-theme-accent mb-1">
        {label} — {formatDateLabel(dateOnly(dateStr))}
      </div>
      <h2 className="text-xl font-extrabold mb-1">
        {info.liftDay
          ? info.liftDay.label
          : info.isRunDay
          ? "Run day"
          : info.isBikeDay
          ? "Bike day"
          : info.isRowDay
          ? "Row day"
          : info.isSwimDay
          ? "Swim day"
          : info.isGenericGymDay
          ? "Gym day"
          : info.entry.type === "OTHER"
          ? info.entry.customLabel || "Other"
          : "Rest day"}
      </h2>

      <SwapDayControls dateStr={dateStr} activeType={info.entry.type} isOverridden={info.override != null} />

      {info.liftDay &&
        info.liftDay.exercises.map((name) => (
          <LiftRow
            key={name}
            name={name}
            lastLog={data.latestByExercise.get(name) ?? null}
            isToday
            doneToday={info.loggedToday(name)}
            incrementLb={info.incrementLb(name)}
            logForm
            dateStr={dateStr}
          />
        ))}

      {info.isGenericGymDay && <p className="text-base font-bold opacity-60 mt-2">No preset exercise list for today — log any lift below.</p>}

      {info.isRunDay && (
        <CardioRow
          label="Run"
          isToday
          doneToday={info.ranToday}
          lastLog={data.latestRun}
          suggestion={data.runSuggestion}
          logForm
          dateStr={dateStr}
          cardioType="RUN"
        />
      )}

      {info.isBikeDay && (
        <CardioRow
          label="Bike"
          isToday
          doneToday={info.bikedToday}
          lastLog={data.latestBike}
          suggestion={data.bikeSuggestion}
          logForm
          dateStr={dateStr}
          cardioType="BIKE"
        />
      )}

      {info.isRowDay && (
        <CardioRow
          label="Row"
          isToday
          doneToday={info.rowedToday}
          lastLog={data.latestRow}
          suggestion={data.rowSuggestion}
          logForm
          dateStr={dateStr}
          cardioType="ROW"
        />
      )}

      {info.isSwimDay && (
        <CardioRow
          label="Swim"
          isToday
          doneToday={info.swamToday}
          lastLog={data.latestSwim}
          suggestion={data.swimSuggestion}
          logForm
          dateStr={dateStr}
          cardioType="SWIM"
        />
      )}

      {!info.liftDay &&
        !info.isRunDay &&
        !info.isBikeDay &&
        !info.isRowDay &&
        !info.isSwimDay &&
        !info.isGenericGymDay &&
        info.entry.type !== "OTHER" && <p className="text-base font-bold opacity-60 mt-2">Rest day.</p>}
    </div>
  );
}

const SWAP_TYPES: ScheduleDayType[] = ["GYM", "RUN", "BIKE", "ROW", "SWIM", "REST"];

/** Lets a date's schedule type be swapped on the fly — tap a different type to override, tap "Reset" to go back to the two-week default. */
export function SwapDayControls({ dateStr, activeType, isOverridden }: { dateStr: string; activeType: ScheduleDayType; isOverridden: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 mt-1">
      {SWAP_TYPES.map((t) => (
        <form key={t} action={setScheduleOverride}>
          <input type="hidden" name="date" value={dateStr} />
          <input type="hidden" name="dayType" value={t} />
          <button
            type="submit"
            disabled={t === activeType}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition active:scale-95 ${
              t === activeType ? "bg-theme-accent text-theme-own" : "bg-theme-accent/10 hover:bg-theme-accent/20"
            }`}
          >
            {SCHEDULE_TYPE_LABEL[t]}
          </button>
        </form>
      ))}
      {isOverridden && (
        <form action={clearScheduleOverride}>
          <input type="hidden" name="date" value={dateStr} />
          <button type="submit" className="px-3 py-1.5 rounded-full text-xs font-bold opacity-50 hover:opacity-80 transition underline">
            Reset
          </button>
        </form>
      )}
    </div>
  );
}

export function LiftRow({
  name,
  lastLog,
  isToday,
  doneToday,
  incrementLb,
  logForm = false,
  dateStr,
}: {
  name: string;
  lastLog: { sets: unknown } | null;
  isToday: boolean;
  doneToday: boolean;
  incrementLb: number;
  logForm?: boolean;
  dateStr?: string;
}) {
  const lastSets = lastLog ? liftSets(lastLog) : null;
  const suggestion = lastSets
    ? suggestNextLift(
        summarizeLiftSession(lastSets.map((s) => ({ weightLb: kgToLb(s.weightKg), reps: s.reps }))),
        incrementLb
      )
    : null;
  // Once today's set is already logged, the suggestion is for the *next*
  // session — showing it as "today's target" would misleadingly imply
  // today's set still needs to happen.
  const targetLabel = isToday && !doneToday ? "Today's target" : "Next target";
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-extrabold mb-1">{name}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">Last</div>
          {lastSets ? (
            <div className="font-bold opacity-70">{formatSetsLb(lastSets)}</div>
          ) : (
            <div className="font-bold opacity-50">Not logged yet</div>
          )}
        </div>
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">{targetLabel}</div>
          {suggestion ? (
            <div className="font-bold opacity-70">
              {suggestion.weightLb}lb × {suggestion.reps} × {suggestion.sets}
            </div>
          ) : (
            <div className="font-bold opacity-50">Log a set first</div>
          )}
        </div>
      </div>

      {logForm && dateStr && (
        <form action={submitLift} className="mt-3">
          <input type="hidden" name="date" value={dateStr} />
          <input type="hidden" name="exerciseName" value={name} />
          <div className="flex flex-col gap-2">
            {Array.from({ length: MAX_LIFT_SETS }, (_, i) => i + 1).map((setNum) => (
              <div key={setNum} className="flex items-end gap-2 flex-wrap">
                <span className="text-[10px] font-bold opacity-40 uppercase tracking-wide w-10">Set {setNum}</span>
                <InlineNumberField
                  label="lb"
                  name={`setWeightLb${setNum}`}
                  step="0.5"
                  required={setNum === 1}
                  defaultValue={suggestion && setNum <= suggestion.sets ? suggestion.weightLb : undefined}
                />
                <InlineNumberField
                  label="reps"
                  name={`setReps${setNum}`}
                  required={setNum === 1}
                  defaultValue={suggestion && setNum <= suggestion.sets ? suggestion.reps : undefined}
                />
              </div>
            ))}
          </div>
          <SubmitButton className="px-4 py-2 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition mt-2">
            Log
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

export function CardioRow({
  label,
  isToday,
  doneToday,
  lastLog,
  suggestion,
  logForm = false,
  dateStr,
  cardioType,
}: {
  label: string;
  isToday: boolean;
  doneToday: boolean;
  lastLog: { distanceKm: number } | null;
  suggestion: { distanceKm: number; rationale: string };
  logForm?: boolean;
  dateStr?: string;
  cardioType?: "RUN" | "BIKE" | "ROW" | "SWIM";
}) {
  // Once today's scheduled session is already logged, the suggestion is for
  // the *next* session — showing it as "today's target" would misleadingly
  // imply today's run/ride still needs to happen.
  const targetLabel = isToday && !doneToday ? "Today's target" : "Next target";
  // Row/swim are tracked in meters, not km (see lib/overload.ts).
  const unit = cardioType === "ROW" || cardioType === "SWIM" ? "m" : "km";
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-extrabold mb-1">
        {label}
        {isToday && <span className="ml-2 text-xs font-bold opacity-60 normal-case">• {doneToday ? "Done today" : "Today"}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">Last</div>
          <div className="font-bold opacity-70">{lastLog ? `${lastLog.distanceKm}${unit}` : "Not logged yet"}</div>
        </div>
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">{targetLabel}</div>
          <div className="font-bold opacity-70">{suggestion.distanceKm}{unit}</div>
        </div>
      </div>
      <div className="text-sm font-semibold opacity-50 mt-1">{suggestion.rationale}</div>

      {logForm && dateStr && cardioType && (
        <form action={submitCardio} className="flex items-end gap-2 flex-wrap mt-3">
          <input type="hidden" name="date" value={dateStr} />
          <input type="hidden" name="type" value={cardioType} />
          <InlineNumberField label={unit} name="distanceKm" step={unit === "m" ? "1" : "0.1"} defaultValue={suggestion.distanceKm} />
          <InlineNumberField label="min" name="durationMin" step="1" required={false} />
          <SubmitButton className="px-4 py-2 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Log
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

export function InlineNumberField({
  label,
  name,
  defaultValue,
  step,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col text-[10px] font-bold opacity-50 uppercase tracking-wide">
      {label}
      <input
        type="number"
        name={name}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-16 text-center text-base font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mt-0.5"
      />
    </label>
  );
}
