import Link from "next/link";
import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitLift, submitCardio, updateWorkoutDayPlans } from "@/app/actions";
import { suggestNextLift, suggestNextRun, suggestNextBike, DEFAULT_WEIGHT_INCREMENT_LB } from "@/lib/overload";
import { mergeLiftDays, RUN_WEEKDAYS, BIKE_WEEKDAY, type DayKey, type LiftDayDef } from "@/lib/schedule";
import { today, formatDateLabel, dayOfWeekIndex } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import { PencilIcon } from "@/app/components/icons";

export default async function FitnessPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const profile = await requireActiveProfile();
  const { edit } = await searchParams;

  const [lifts, cardio, dayPlanRows, incrementRows] = await Promise.all([
    prisma.liftLog.findMany({ where: { profileId: profile.id }, orderBy: { date: "desc" } }),
    prisma.cardioLog.findMany({ where: { profileId: profile.id }, orderBy: { date: "desc" } }),
    prisma.workoutDayPlan.findMany({ where: { profileId: profile.id } }),
    prisma.exerciseIncrement.findMany({ where: { profileId: profile.id } }),
  ]);

  const incrementByExercise = new Map(incrementRows.map((row) => [row.exerciseName, row.incrementLb]));

  const overrides = new Map<DayKey, string[]>();
  for (const row of dayPlanRows) {
    overrides.set(row.dayKey as DayKey, row.exercises.split("\n").filter(Boolean));
  }
  const liftDays = mergeLiftDays(overrides);

  if (edit === "1") {
    return <EditView liftDays={liftDays} />;
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

  const todayWeekday = dayOfWeekIndex(today());
  const allExercises = Array.from(new Set(liftDays.flatMap((d) => d.exercises)));

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

        <h2 className="text-lg font-extrabold mb-3">Suggested next targets</h2>
        {liftDays.map((day) => (
          <div key={day.dayKey} className="mb-5">
            <div className="text-sm font-bold opacity-60 uppercase tracking-wide mb-1">
              {day.label}
              {day.weekday === todayWeekday && <span className="ml-2 normal-case opacity-100">• Today</span>}
            </div>
            {day.exercises.map((name) => (
              <LiftRow
                key={name}
                name={name}
                lastLog={latestByExercise.get(name) ?? null}
                isToday={day.weekday === todayWeekday}
                incrementLb={incrementByExercise.get(name) ?? DEFAULT_WEIGHT_INCREMENT_LB}
              />
            ))}
          </div>
        ))}

        <CardioRow label="Run" isToday={RUN_WEEKDAYS.includes(todayWeekday)} lastLog={latestRun} suggestion={runSuggestion} />
        <CardioRow label="Bike" isToday={todayWeekday === BIKE_WEEKDAY} lastLog={latestBike} suggestion={bikeSuggestion} />
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
            <button
              type="submit"
              className="w-full mt-6 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Log lift
            </button>
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
            <button
              type="submit"
              className="w-full mt-6 px-6 py-3.5 rounded-full bg-theme-accent text-theme-own text-base font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Log cardio
            </button>
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

function EditView({ liftDays }: { liftDays: LiftDayDef[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold">Edit workout days</h1>
        <Link href="/fitness" className="text-sm font-bold underline underline-offset-4">
          Cancel
        </Link>
      </div>
      <form action={updateWorkoutDayPlans} className="space-y-6">
        {liftDays.map((day) => (
          <div key={day.dayKey}>
            <label htmlFor={day.dayKey} className="block text-lg font-extrabold mb-1">
              {day.label}
            </label>
            <p className="text-xs font-semibold opacity-60 mb-2">One exercise per line.</p>
            <textarea
              id={day.dayKey}
              name={day.dayKey}
              rows={6}
              defaultValue={day.exercises.join("\n")}
              className="w-full text-base font-semibold bg-transparent border-2 border-theme-accent/20 rounded-2xl px-3 py-2 focus:border-theme-accent outline-none"
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-full px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition"
        >
          Save workout days
        </button>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15">{children}</div>;
}

function LiftRow({
  name,
  lastLog,
  isToday,
  incrementLb,
}: {
  name: string;
  lastLog: { weightKg: number; reps: number; sets: number } | null;
  isToday: boolean;
  incrementLb: number;
}) {
  const suggestion = lastLog
    ? suggestNextLift({ weightLb: kgToLb(lastLog.weightKg), reps: lastLog.reps, sets: lastLog.sets }, incrementLb)
    : null;
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
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">{isToday ? "Today's target" : "Next target"}</div>
          {suggestion ? (
            <div className="font-bold opacity-70">
              {suggestion.weightLb}lb × {suggestion.reps} × {suggestion.sets}
            </div>
          ) : (
            <div className="font-bold opacity-50">Log a set first</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardioRow({
  label,
  isToday,
  lastLog,
  suggestion,
}: {
  label: string;
  isToday: boolean;
  lastLog: { distanceKm: number } | null;
  suggestion: { distanceKm: number; rationale: string };
}) {
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-extrabold mb-1">
        {label}
        {isToday && <span className="ml-2 text-xs font-bold opacity-60 normal-case">• Today</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">Last</div>
          <div className="font-bold opacity-70">{lastLog ? `${lastLog.distanceKm}km` : "Not logged yet"}</div>
        </div>
        <div>
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide">{isToday ? "Today's target" : "Next target"}</div>
          <div className="font-bold opacity-70">{suggestion.distanceKm}km</div>
        </div>
      </div>
      <div className="text-sm font-semibold opacity-50 mt-1">{suggestion.rationale}</div>
    </div>
  );
}
