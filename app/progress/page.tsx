import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitWeight, updateProfileSettings } from "@/app/actions";
import { computePace } from "@/lib/progress";
import { today, toDateInputValue } from "@/lib/date";
import { cmToFeetInches, kgToLb } from "@/lib/units";
import WeightChart from "@/app/components/WeightChart";
import Row from "@/app/components/Row";
import SubmitButton from "@/app/components/SubmitButton";

function toInputDate(date: Date | null): string {
  return date ? toDateInputValue(date) : "";
}

export default async function ProgressPage() {
  const profile = await requireActiveProfile();

  const [logs, checkIns] = await Promise.all([
    prisma.weightLog.findMany({
      where: { profileId: profile.id },
      orderBy: { date: "asc" },
    }),
    prisma.dailyCheckIn.findMany({
      where: { profileId: profile.id },
      select: { stuckToFitnessPlan: true, stuckToMealPlan: true },
    }),
  ]);

  const totalDays = checkIns.length;
  const fitnessSuccessDays = checkIns.filter((c) => c.stuckToFitnessPlan).length;
  const dietSuccessDays = checkIns.filter((c) => c.stuckToMealPlan).length;

  const pace = computePace(profile, logs);
  const height = cmToFeetInches(profile.heightCm);
  const chartPoints = logs.map((l) => ({ date: l.date, weightLb: kgToLb(l.weightKg) }));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold mb-5">Progress</h1>

        <div className="mb-6 space-y-1">
          <div className="text-lg font-bold">
            Successful fitness days: <span className="font-extrabold">{fitnessSuccessDays}</span>/{totalDays}
          </div>
          <div className="text-lg font-bold">
            Successful diet days: <span className="font-extrabold">{dietSuccessDays}</span>/{totalDays}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 mb-6">
          <Stat label="Days to trip" value={pace.daysRemaining != null ? `${pace.daysRemaining}` : "—"} />
          <Stat label="Current weight" value={pace.actualWeightKg != null ? `${kgToLb(pace.actualWeightKg)}lb` : "—"} />
          <Stat label="Expected weight" value={pace.expectedWeightKg != null ? `${kgToLb(pace.expectedWeightKg)}lb` : "—"} />
          <Stat
            label="Pace"
            value={
              pace.status === "unknown"
                ? "Set goal below"
                : pace.status === "on-track"
                ? "On track"
                : pace.status === "ahead"
                ? `Ahead by ${kgToLb(Math.abs(pace.deltaKg ?? 0))}lb`
                : `Behind by ${kgToLb(Math.abs(pace.deltaKg ?? 0))}lb`
            }
          />
        </div>

        <WeightChart points={chartPoints} />
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-3">Weekly weigh-in</h2>
        <form action={submitWeight}>
          <Row>
            <label htmlFor="w-date" className="text-lg font-bold opacity-70">
              Date
            </label>
            <input
              id="w-date"
              type="date"
              name="date"
              defaultValue={today()}
              max={today()}
              className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <Row>
            <label htmlFor="w-lb" className="text-lg font-bold opacity-70">
              Weight (lb)
            </label>
            <input
              id="w-lb"
              type="number"
              step="0.1"
              name="weightLb"
              required
              className="w-28 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <SubmitButton className="w-full mt-6 px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Log weight
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-3">Goal settings</h2>
        <form action={updateProfileSettings}>
          <Row>
            <span className="text-lg font-bold opacity-70">Height</span>
            <div className="flex items-center gap-2">
              <input
                id="heightFeet"
                type="number"
                name="heightFeet"
                min={0}
                defaultValue={height.feet || ""}
                className="w-14 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              <label htmlFor="heightFeet" className="text-sm font-bold opacity-70">
                ft
              </label>
              <input
                id="heightInches"
                type="number"
                name="heightInches"
                min={0}
                max={11}
                defaultValue={height.inches || ""}
                className="w-14 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              <label htmlFor="heightInches" className="text-sm font-bold opacity-70">
                in
              </label>
            </div>
          </Row>
          <Row>
            <label htmlFor="birthDate" className="text-lg font-bold opacity-70">
              Birth date
            </label>
            <input
              id="birthDate"
              type="date"
              name="birthDate"
              defaultValue={toInputDate(profile.birthDate)}
              className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <Row>
            <label htmlFor="startWeightLb" className="text-lg font-bold opacity-70">
              Start weight (lb)
            </label>
            <input
              id="startWeightLb"
              type="number"
              step="0.1"
              name="startWeightLb"
              defaultValue={profile.startWeightKg != null ? kgToLb(profile.startWeightKg) : ""}
              className="w-28 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <Row>
            <label htmlFor="goalWeightLb" className="text-lg font-bold opacity-70">
              Goal weight (lb)
            </label>
            <input
              id="goalWeightLb"
              type="number"
              step="0.1"
              name="goalWeightLb"
              defaultValue={profile.goalWeightKg != null ? kgToLb(profile.goalWeightKg) : ""}
              className="w-28 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <Row>
            <label htmlFor="goalDate" className="text-lg font-bold opacity-70">
              Trip / goal date
            </label>
            <input
              id="goalDate"
              type="date"
              name="goalDate"
              defaultValue={toInputDate(profile.goalDate) || "2027-03-01"}
              className="text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            />
          </Row>
          <SubmitButton className="w-full mt-6 px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Save goal settings
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold opacity-60 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
