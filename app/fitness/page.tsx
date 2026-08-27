import Link from "next/link";
import { requireActiveProfile } from "@/lib/session";
import { submitLift, submitCardio, updateWorkoutDayPlans, addWorkoutDay, updateScheduleTemplate } from "@/app/actions";
import { MAX_LIFT_SETS } from "@/lib/overload";
import { getFitnessData, resolveDayEntry } from "@/lib/fitnessData";
import {
  effectiveEntryForDate,
  cycleSlotLabel,
  SCHEDULE_TYPE_LABEL,
  type LiftDayDef,
  type ScheduleDayType,
} from "@/lib/schedule";
import { today, formatDateLabel, toDateInputValue, dateOnly, addDays } from "@/lib/date";
import { PencilIcon } from "@/app/components/icons";
import Row from "@/app/components/Row";
import SubmitButton from "@/app/components/SubmitButton";
import MonthCalendar, { type CalendarCell } from "@/app/components/MonthCalendar";
import TodayWorkoutCard, { LiftRow, CardioRow, liftSets, formatSetsLb } from "@/app/components/TodayWorkoutCard";

export default async function FitnessPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const profile = await requireActiveProfile();
  const { edit } = await searchParams;

  const data = await getFitnessData(profile.id);

  if (edit === "1") {
    return <EditView liftDays={data.liftDays} cycleTemplate={data.cycleTemplate} />;
  }

  const todayStr = today();
  const allExercises = Array.from(new Set(data.liftDays.flatMap((d) => d.exercises)));
  const info = resolveDayEntry(data, todayStr);
  const otherLiftDays = data.liftDays.filter((d) => d.dayKey !== info.entry.dayKey);

  const calendarMonth = dateOnly(todayStr);
  const year = calendarMonth.getUTCFullYear();
  const month = calendarMonth.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const leadingBlanks = dateOnly(firstOfMonthStr).getUTCDay();
  const calendarCells: CalendarCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDays(firstOfMonthStr, i);
    const override = data.scheduleOverrideByDate.get(date) ?? null;
    const entry = effectiveEntryForDate(date, override, data.liftDays, data.cycleTemplate);
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

        <TodayWorkoutCard data={data} dateStr={todayStr} />

        <h2 className="text-lg font-extrabold mb-3">Suggested next targets</h2>
        {otherLiftDays.map((day) => (
          <div key={day.dayKey} className="mb-5">
            <div className="text-sm font-bold opacity-60 uppercase tracking-wide mb-1">{day.label}</div>
            {day.exercises.map((name) => (
              <LiftRow
                key={name}
                name={name}
                lastLog={data.latestByExercise.get(name) ?? null}
                isToday={false}
                doneToday={false}
                incrementLb={info.incrementLb(name)}
              />
            ))}
          </div>
        ))}

        {!info.isRunDay && <CardioRow label="Run" isToday={false} doneToday={false} lastLog={data.latestRun} suggestion={data.runSuggestion} />}
        {!info.isBikeDay && <CardioRow label="Bike" isToday={false} doneToday={false} lastLog={data.latestBike} suggestion={data.bikeSuggestion} />}
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
                {data.liftDays.map((day) => (
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
            <p className="text-xs font-semibold opacity-60 mt-2 mb-1">Set 1 is required — leave the rest blank to skip them.</p>
            {Array.from({ length: MAX_LIFT_SETS }, (_, i) => i + 1).map((setNum) => (
              <Row key={setNum}>
                <span className="text-lg font-bold opacity-70">Set {setNum}</span>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Set ${setNum} weight (lb)`}
                    type="number"
                    step="0.5"
                    name={`setWeightLb${setNum}`}
                    required={setNum === 1}
                    placeholder="lb"
                    className="w-16 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
                  />
                  <input
                    aria-label={`Set ${setNum} reps`}
                    type="number"
                    name={`setReps${setNum}`}
                    required={setNum === 1}
                    placeholder="reps"
                    className="w-16 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
                  />
                </div>
              </Row>
            ))}
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
        {data.lifts.length === 0 && <p className="text-lg font-bold opacity-70">No lifts logged yet.</p>}
        {allExercises
          .filter((name) => data.latestByExercise.has(name))
          .map((name) => (
            <div key={name} className="py-3.5 border-b-2 border-theme-accent/15">
              <div className="text-lg font-extrabold mb-1">{name}</div>
              {data.lifts
                .filter((l) => l.exerciseName === name)
                .map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-4 text-sm font-bold opacity-70">
                    <span>{formatDateLabel(l.date)}</span>
                    <span>{formatSetsLb(liftSets(l))}</span>
                  </div>
                ))}
            </div>
          ))}
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-3">Every logged run / bike</h2>
        {data.cardio.length === 0 && <p className="text-lg font-bold opacity-70">No runs or rides logged yet.</p>}
        {data.cardio.map((c) => (
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
