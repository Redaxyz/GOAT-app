import Link from "next/link";
import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  submitLift,
  submitCardio,
  updateWorkoutDayPlans,
  addWorkoutDay,
  setScheduleOverride,
  clearScheduleOverride,
  updateScheduleTemplate,
} from "@/app/actions";
import { suggestNextLift, suggestNextRun, suggestNextBike, DEFAULT_WEIGHT_INCREMENT_LB } from "@/lib/overload";
import {
  resolveLiftDays,
  resolveCycleTemplate,
  effectiveEntryForDate,
  cycleSlotLabel,
  SCHEDULE_TYPE_LABEL,
  type LiftDayDef,
  type ScheduleDayType,
} from "@/lib/schedule";
import { today, formatDateLabel, toDateInputValue, dateOnly, addDays } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import { PencilIcon } from "@/app/components/icons";
import Row from "@/app/components/Row";
import SubmitButton from "@/app/components/SubmitButton";
import MonthCalendar, { type CalendarCell } from "@/app/components/MonthCalendar";

export default async function FitnessPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const profile = await requireActiveProfile();
  const { edit } = await searchParams;

  const [lifts, cardio, dayPlanRows, incrementRows, scheduleOverrideRows, scheduleTemplateRows] = await Promise.all([
    prisma.liftLog.findMany({ where: { profileId: profile.id }, orderBy: { date: "desc" } }),
    prisma.cardioLog.findMany({ where: { profileId: profile.id }, orderBy: { date: "desc" } }),
    prisma.workoutDayPlan.findMany({ where: { profileId: profile.id } }),
    prisma.exerciseIncrement.findMany({ where: { profileId: profile.id } }),
    prisma.scheduleOverride.findMany({ where: { profileId: profile.id } }),
    prisma.scheduleTemplate.findMany({ where: { profileId: profile.id } }),
  ]);

  const incrementByExercise = new Map(incrementRows.map((row) => [row.exerciseName, row.incrementLb]));

  const liftDays = resolveLiftDays(dayPlanRows);
  const cycleTemplate = resolveCycleTemplate(scheduleTemplateRows);

  if (edit === "1") {
    return <EditView liftDays={liftDays} cycleTemplate={cycleTemplate} />;
  }

  const scheduleOverrideByDate = new Map<string, ScheduleDayType>();
  for (const row of scheduleOverrideRows) {
    scheduleOverrideByDate.set(toDateInputValue(row.date), row.dayType as ScheduleDayType);
  }

  const latestByExercise = new Map<string, (typeof lifts)[number]>();
  for (const lift of lifts) {
    if (!latestByExercise.has(lift.exerciseName)) latestByExercise.set(lift.exerciseName, lift);
  }

  const latestRun = cardio.find((c) => c.type === "RUN") ?? null;
  const bikeLogs = cardio.filter((c) => c.type === "BIKE");
  const latestBike = bikeLogs[0] ?? null;
  const runSuggestion = suggestNextRun(latestRun);
  const bikeSuggestion = suggestNextBike(bikeLogs);

  const todayStr = today();
  const allExercises = Array.from(new Set(liftDays.flatMap((d) => d.exercises)));

  // Once today's session is already logged, the suggestion is for the *next*
  // session, not today's — otherwise a just-logged run shows its own
  // incremented follow-up target mislabeled as "today's target".
  const ranToday = latestRun != null && toDateInputValue(latestRun.date) === todayStr;
  const bikedToday = latestBike != null && toDateInputValue(latestBike.date) === todayStr;
  const loggedToday = (name: string) => {
    const log = latestByExercise.get(name);
    return log != null && toDateInputValue(log.date) === todayStr;
  };

  const todayOverride = scheduleOverrideByDate.get(todayStr) ?? null;
  const todayEntry = effectiveEntryForDate(todayStr, todayOverride, liftDays, cycleTemplate);
  const todayLiftDay = todayEntry.dayKey ? liftDays.find((d) => d.dayKey === todayEntry.dayKey) ?? null : null;
  const isRunDay = todayEntry.type === "RUN";
  const isBikeDay = todayEntry.type === "BIKE";
  const isGenericGymDay = todayEntry.type === "GYM" && !todayLiftDay;
  const otherLiftDays = liftDays.filter((d) => d.dayKey !== todayEntry.dayKey);

  const calendarMonth = dateOnly(todayStr);
  const year = calendarMonth.getUTCFullYear();
  const month = calendarMonth.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const leadingBlanks = dateOnly(firstOfMonthStr).getUTCDay();
  const calendarCells: CalendarCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDays(firstOfMonthStr, i);
    const override = scheduleOverrideByDate.get(date) ?? null;
    const entry = effectiveEntryForDate(date, override, liftDays, cycleTemplate);
    return { date, day: i + 1, type: entry.type, isToday: date === todayStr, isOverridden: override != null };
  });
  const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold">Fitness</h1>
          <Link
            href="/fitness?edit=1"
            aria-label="Edit workout days"
            title="Edit workout days"
            className="p-2 rounded-full hover:bg-theme-accent/10 active:scale-95 transition"
          >
            <PencilIcon className="w-5 h-5" />
          </Link>
        </div>

        <MonthCalendar monthLabel={monthLabel} cells={calendarCells} leadingBlanks={leadingBlanks} />

        <div className="border-2 border-theme-accent rounded-3xl p-5 mb-8 bg-theme-accent/5">
          <div className="text-xs font-bold uppercase tracking-wide text-theme-accent mb-1">
            Today — {formatDateLabel(dateOnly(todayStr))}
          </div>
          <h2 className="text-xl font-extrabold mb-1">
            {todayLiftDay ? todayLiftDay.label : isRunDay ? "Run day" : isBikeDay ? "Bike day" : isGenericGymDay ? "Gym day" : "Rest day"}
          </h2>

          <SwapDayControls todayStr={todayStr} activeType={todayEntry.type} isOverridden={todayOverride != null} />

          {todayLiftDay &&
            todayLiftDay.exercises.map((name) => (
              <LiftRow
                key={name}
                name={name}
                lastLog={latestByExercise.get(name) ?? null}
                isToday
                doneToday={loggedToday(name)}
                incrementLb={incrementByExercise.get(name) ?? DEFAULT_WEIGHT_INCREMENT_LB}
                logForm
                todayStr={todayStr}
              />
            ))}

          {isGenericGymDay && (
            <p className="text-base font-bold opacity-60 mt-2">No preset exercise list for today — log any lift below.</p>
          )}

          {isRunDay && (
            <CardioRow
              label="Run"
              isToday
              doneToday={ranToday}
              lastLog={latestRun}
              suggestion={runSuggestion}
              logForm
              todayStr={todayStr}
              cardioType="RUN"
            />
          )}

          {isBikeDay && (
            <CardioRow
              label="Bike"
              isToday
              doneToday={bikedToday}
              lastLog={latestBike}
              suggestion={bikeSuggestion}
              logForm
              todayStr={todayStr}
              cardioType="BIKE"
            />
          )}

          {!todayLiftDay && !isRunDay && !isBikeDay && !isGenericGymDay && <p className="text-base font-bold opacity-60 mt-2">Rest day.</p>}
        </div>

        <h2 className="text-lg font-extrabold mb-3">Suggested next targets</h2>
        {otherLiftDays.map((day) => (
          <div key={day.dayKey} className="mb-5">
            <div className="text-sm font-bold opacity-60 uppercase tracking-wide mb-1">{day.label}</div>
            {day.exercises.map((name) => (
              <LiftRow
                key={name}
                name={name}
                lastLog={latestByExercise.get(name) ?? null}
                isToday={false}
                doneToday={false}
                incrementLb={incrementByExercise.get(name) ?? DEFAULT_WEIGHT_INCREMENT_LB}
              />
            ))}
          </div>
        ))}

        {!isRunDay && <CardioRow label="Run" isToday={false} doneToday={false} lastLog={latestRun} suggestion={runSuggestion} />}
        {!isBikeDay && <CardioRow label="Bike" isToday={false} doneToday={false} lastLog={latestBike} suggestion={bikeSuggestion} />}
      </section>

      <section className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
        <div>
          <h2 className="text-lg font-extrabold mb-3">Log a lift</h2>
          <form action={submitLift}>
            <Row>
              <label htmlFor="exerciseName" className="text-lg font-bold opacity-70">
                Exercise
              </label>
              <select
                id="exerciseName"
                name="exerciseName"
                required
                defaultValue=""
                className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              >
                <option value="" disabled>
                  Select exercise
                </option>
                {liftDays.map((day) => (
                  <optgroup key={day.dayKey} label={day.label}>
                    {day.exercises.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Row>
            <Row>
              <label htmlFor="lift-date" className="text-lg font-bold opacity-70">
                Date
              </label>
              <input
                id="lift-date"
                type="date"
                name="date"
                defaultValue={today()}
                max={today()}
                className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <Row>
              <label htmlFor="lift-weight" className="text-lg font-bold opacity-70">
                Weight (lb)
              </label>
              <input
                id="lift-weight"
                type="number"
                step="0.5"
                name="weightLb"
                required
                className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <Row>
              <label htmlFor="reps" className="text-lg font-bold opacity-70">
                Reps
              </label>
              <input
                id="reps"
                type="number"
                name="reps"
                required
                className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <Row>
              <label htmlFor="sets" className="text-lg font-bold opacity-70">
                Sets
              </label>
              <input
                id="sets"
                type="number"
                name="sets"
                required
                className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <SubmitButton className="w-full mt-6 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
              Log lift
            </SubmitButton>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-extrabold mb-3">Log a run / bike</h2>
          <form action={submitCardio}>
            <Row>
              <label htmlFor="type" className="text-lg font-bold opacity-70">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              >
                <option value="RUN">Run</option>
                <option value="BIKE">Bike</option>
              </select>
            </Row>
            <Row>
              <label htmlFor="cardio-date" className="text-lg font-bold opacity-70">
                Date
              </label>
              <input
                id="cardio-date"
                type="date"
                name="date"
                defaultValue={today()}
                max={today()}
                className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <Row>
              <label htmlFor="distanceKm" className="text-lg font-bold opacity-70">
                Distance (km)
              </label>
              <input
                id="distanceKm"
                type="number"
                step="0.1"
                name="distanceKm"
                required
                className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <Row>
              <label htmlFor="durationMin" className="text-lg font-bold opacity-70">
                Duration (min)
              </label>
              <input
                id="durationMin"
                type="number"
                step="1"
                name="durationMin"
                className="w-24 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
            </Row>
            <SubmitButton className="w-full mt-6 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
              Log cardio
            </SubmitButton>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-3">Every logged lift</h2>
        {lifts.length === 0 && <p className="text-lg font-bold opacity-70">No lifts logged yet.</p>}
        {allExercises
          .filter((name) => latestByExercise.has(name))
          .map((name) => (
            <div key={name} className="py-3.5 border-b-2 border-theme-accent/15">
              <div className="text-lg font-extrabold mb-1">{name}</div>
              {lifts
                .filter((l) => l.exerciseName === name)
                .map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-4 text-sm font-bold opacity-70">
                    <span>{formatDateLabel(l.date)}</span>
                    <span>
                      {kgToLb(l.weightKg)}lb × {l.reps} × {l.sets}
                    </span>
                  </div>
                ))}
            </div>
          ))}
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-3">Every logged run / bike</h2>
        {cardio.length === 0 && <p className="text-lg font-bold opacity-70">No runs or rides logged yet.</p>}
        {cardio.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15 text-lg font-bold">
            <span>{c.type === "RUN" ? "Run" : "Bike"}</span>
            <span className="font-extrabold opacity-80">
              {formatDateLabel(c.date)} — {c.distanceKm}km{c.durationMin ? ` in ${c.durationMin}min` : ""}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function EditView({ liftDays, cycleTemplate }: { liftDays: LiftDayDef[]; cycleTemplate: ScheduleDayType[] }) {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold">Edit fitness</h1>
        <Link href="/fitness" className="text-sm font-bold underline underline-offset-4">
          Cancel
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-extrabold mb-1">Two-week calendar</h2>
        <p className="text-xs font-semibold opacity-60 mb-4">
          Rearrange which days are gym/run/bike/rest. Which specific gym-day variant lands on a given gym slot still
          rotates automatically through your workout days below.
        </p>
        <form action={updateScheduleTemplate} className="space-y-2">
          {cycleTemplate.map((type, slotIndex) => (
            <Row key={slotIndex}>
              <label htmlFor={`slot__${slotIndex}`} className="text-base font-bold opacity-70">
                {cycleSlotLabel(slotIndex)}
              </label>
              <select
                id={`slot__${slotIndex}`}
                name={`slot__${slotIndex}`}
                defaultValue={type}
                className="text-right text-base font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              >
                {(Object.keys(SCHEDULE_TYPE_LABEL) as ScheduleDayType[]).map((t) => (
                  <option key={t} value={t}>
                    {SCHEDULE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Row>
          ))}
          <SubmitButton className="w-full mt-4 px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Save calendar
          </SubmitButton>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-extrabold mb-4">Workout days</h2>
        <form action={updateWorkoutDayPlans} className="space-y-6">
          <input type="hidden" name="dayKeys" value={liftDays.map((d) => d.dayKey).join(",")} />
          {liftDays.map((day) => (
            <div key={day.dayKey}>
              <label htmlFor={`label__${day.dayKey}`} className="block text-xs font-bold uppercase tracking-wide opacity-50 mb-1">
                Day name
              </label>
              <input
                id={`label__${day.dayKey}`}
                name={`label__${day.dayKey}`}
                type="text"
                defaultValue={day.label}
                className="w-full text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1 mb-2"
              />
              <p className="text-xs font-semibold opacity-60 mb-2">One exercise per line.</p>
              <textarea
                id={`exercises__${day.dayKey}`}
                name={`exercises__${day.dayKey}`}
                rows={6}
                defaultValue={day.exercises.join("\n")}
                className="w-full text-base font-semibold bg-transparent border-2 border-theme-accent/20 rounded-2xl px-3 py-2 focus:border-theme-accent outline-none"
              />
            </div>
          ))}
          <SubmitButton className="w-full px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Save workout days
          </SubmitButton>
        </form>
        <form action={addWorkoutDay} className="mt-4">
          <SubmitButton className="w-full px-6 py-3.5 rounded-full border-2 border-theme-accent/30 text-theme-accent text-base font-extrabold hover:bg-theme-accent/10 active:scale-95 transition">
            + Add a workout day
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

const SWAP_TYPES: ScheduleDayType[] = ["GYM", "RUN", "BIKE", "REST"];

/** Lets today's schedule type be swapped on the fly — tap a different type to override, tap "Reset" to go back to the two-week default. */
function SwapDayControls({ todayStr, activeType, isOverridden }: { todayStr: string; activeType: ScheduleDayType; isOverridden: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 mt-1">
      {SWAP_TYPES.map((t) => (
        <form key={t} action={setScheduleOverride}>
          <input type="hidden" name="date" value={todayStr} />
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
          <input type="hidden" name="date" value={todayStr} />
          <button type="submit" className="px-3 py-1.5 rounded-full text-xs font-bold opacity-50 hover:opacity-80 transition underline">
            Reset
          </button>
        </form>
      )}
    </div>
  );
}

function LiftRow({
  name,
  lastLog,
  isToday,
  doneToday,
  incrementLb,
  logForm = false,
  todayStr,
}: {
  name: string;
  lastLog: { weightKg: number; reps: number; sets: number } | null;
  isToday: boolean;
  doneToday: boolean;
  incrementLb: number;
  logForm?: boolean;
  todayStr?: string;
}) {
  const suggestion = lastLog
    ? suggestNextLift({ weightLb: kgToLb(lastLog.weightKg), reps: lastLog.reps, sets: lastLog.sets }, incrementLb)
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
          {lastLog ? (
            <div className="font-bold opacity-70">
              {kgToLb(lastLog.weightKg)}lb × {lastLog.reps} × {lastLog.sets}
            </div>
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

      {logForm && todayStr && (
        <form action={submitLift} className="flex items-end gap-2 flex-wrap mt-3">
          <input type="hidden" name="date" value={todayStr} />
          <input type="hidden" name="exerciseName" value={name} />
          <InlineNumberField label="lb" name="weightLb" step="0.5" defaultValue={suggestion?.weightLb} />
          <InlineNumberField label="reps" name="reps" defaultValue={suggestion?.reps} />
          <InlineNumberField label="sets" name="sets" defaultValue={suggestion?.sets} />
          <SubmitButton className="px-4 py-2 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Log
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

function CardioRow({
  label,
  isToday,
  doneToday,
  lastLog,
  suggestion,
  logForm = false,
  todayStr,
  cardioType,
}: {
  label: string;
  isToday: boolean;
  doneToday: boolean;
  lastLog: { distanceKm: number } | null;
  suggestion: { distanceKm: number; rationale: string };
  logForm?: boolean;
  todayStr?: string;
  cardioType?: "RUN" | "BIKE";
}) {
  // Once today's scheduled session is already logged, the suggestion is for
  // the *next* session — showing it as "today's target" would misleadingly
  // imply today's run/ride still needs to happen.
  const targetLabel = isToday && !doneToday ? "Today's target" : "Next target";
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-extrabold mb-1">
        {label}
        {isToday && <span className="ml-2 text-xs font-bold opacity-60 normal-case">• {doneToday ? "Done today" : "Today"}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">Last</div>
          <div className="font-bold opacity-70">{lastLog ? `${lastLog.distanceKm}km` : "Not logged yet"}</div>
        </div>
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">{targetLabel}</div>
          <div className="font-bold opacity-70">{suggestion.distanceKm}km</div>
        </div>
      </div>
      <div className="text-sm font-semibold opacity-50 mt-1">{suggestion.rationale}</div>

      {logForm && todayStr && cardioType && (
        <form action={submitCardio} className="flex items-end gap-2 flex-wrap mt-3">
          <input type="hidden" name="date" value={todayStr} />
          <input type="hidden" name="type" value={cardioType} />
          <InlineNumberField label="km" name="distanceKm" step="0.1" defaultValue={suggestion.distanceKm} />
          <InlineNumberField label="min" name="durationMin" step="1" required={false} />
          <SubmitButton className="px-4 py-2 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Log
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

function InlineNumberField({
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
