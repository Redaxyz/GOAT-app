import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitWeight, updateProfileSettings } from "@/app/actions";
import { computePace } from "@/lib/progress";
import { today, toDateInputValue, addDays, daysBetween, mondayOfWeek, weekdayName, dateOnly } from "@/lib/date";
import { cmToFeetInches, kgToLb } from "@/lib/units";
import { getMealPlan, buildOverrideMap, buildMealPlanSwapMap, buildFoodSwapMap, applyDailyModifications, type MealKey } from "@/lib/nutrition";
import { buildFoodLogMap, getLoggedItems, sumLoggedMacros } from "@/lib/foodLog";
import WeightChart from "@/app/components/WeightChart";
import BmiCalculator from "@/app/components/BmiCalculator";
import Row from "@/app/components/Row";
import SubmitButton from "@/app/components/SubmitButton";

function toInputDate(date: Date | null): string {
  return date ? toDateInputValue(date) : "";
}

export default async function ProgressPage() {
  const profile = await requireActiveProfile();

  const todayStr = today();
  const monday = mondayOfWeek(todayStr);

  const [logs, checkIns, overrideRows, weekFoodLogRows, weekdaySwapRows, weekDateSwapRows, customFoodItems, extraItemRows, weekDateExtraRows, weekRemovalRows] =
    await Promise.all([
      prisma.weightLog.findMany({
        where: { profileId: profile.id },
        orderBy: { date: "asc" },
      }),
      prisma.dailyCheckIn.findMany({
        where: { profileId: profile.id },
        select: { date: true, stuckToFitnessPlan: true, stuckToMealPlan: true, bmrReadingKcal: true },
      }),
      prisma.mealPlanItemOverride.findMany({ where: { profileId: profile.id } }),
      prisma.foodLog.findMany({ where: { profileId: profile.id, date: { gte: dateOnly(monday), lte: dateOnly(todayStr) } } }),
      prisma.mealPlanItemSwap.findMany({ where: { profileId: profile.id } }),
      prisma.foodItemSwap.findMany({ where: { profileId: profile.id, date: { gte: dateOnly(monday), lte: dateOnly(todayStr) } } }),
      prisma.customFoodItem.findMany({ where: { profileId: profile.id } }),
      prisma.mealPlanExtraItem.findMany({ where: { profileId: profile.id }, include: { customFoodItem: true } }),
      prisma.foodItemExtra.findMany({ where: { profileId: profile.id, date: { gte: dateOnly(monday), lte: dateOnly(todayStr) } } }),
      prisma.foodItemRemoval.findMany({ where: { profileId: profile.id, date: { gte: dateOnly(monday), lte: dateOnly(todayStr) } } }),
    ]);

  const totalDays = checkIns.length;
  const fitnessSuccessDays = checkIns.filter((c) => c.stuckToFitnessPlan).length;
  const dietSuccessDays = checkIns.filter((c) => c.stuckToMealPlan).length;

  const avgKcal = (rows: { bmrReadingKcal: number | null }[]): number | null => {
    const values = rows.map((r) => r.bmrReadingKcal).filter((v): v is number => v != null);
    return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
  };
  const sevenDaysAgo = addDays(todayStr, -6); // 7-day window inclusive of today
  const avgCaloriesAllTime = avgKcal(checkIns);
  const avgCaloriesLast7Days = avgKcal(checkIns.filter((c) => toDateInputValue(c.date) >= sevenDaysAgo));

  // Weekly deficit: burned (from check-ins) minus eaten (from the food log),
  // summed Monday->today, resetting each Monday. A day only counts once it
  // has both a burned reading and at least one logged food item.
  const overrides = buildOverrideMap(overrideRows);
  const weekdaySwaps = buildMealPlanSwapMap(weekdaySwapRows);
  const mealPlanByDay = new Map<string, ReturnType<typeof getMealPlan>[number]>(
    getMealPlan(overrides, weekdaySwaps, customFoodItems, extraItemRows).map((d) => [d.day, d])
  );
  const burnedByDate = new Map(checkIns.map((c) => [toDateInputValue(c.date), c.bmrReadingKcal]));

  let weeklyDeficit = 0;
  let daysCounted = 0;
  for (let d = monday; d <= todayStr; d = addDays(d, 1)) {
    const burned = burnedByDate.get(d);
    const dayPlan = mealPlanByDay.get(weekdayName(d));
    if (burned == null || !dayPlan) continue;

    // That date's own swap/add/remove customizations layer on top of the
    // standing weekday plan above, same as Home — otherwise a logged,
    // swapped item wouldn't match any item in the plan and would silently
    // drop out of the sum.
    const dateSwaps = buildFoodSwapMap(
      dayPlan.day,
      weekDateSwapRows.filter((r) => toDateInputValue(r.date) === d)
    );
    const dateExtras = weekDateExtraRows.filter((r) => toDateInputValue(r.date) === d);
    const dateRemovals = weekRemovalRows.filter((r) => toDateInputValue(r.date) === d);
    const foodLogMap = buildFoodLogMap(weekFoodLogRows.filter((r) => toDateInputValue(r.date) === d));
    const mealGroups: { meal: MealKey; items: typeof dayPlan.breakfast }[] = (["breakfast", "lunch", "dinner"] as const).map((meal) => ({
      meal,
      items: applyDailyModifications(dayPlan[meal], meal, dayPlan.day, dateSwaps, overrides, customFoodItems, dateExtras, dateRemovals),
    }));
    const eaten = sumLoggedMacros(getLoggedItems(mealGroups, foodLogMap));

    // Added items have no separate "logged" state (see FoodItemExtra) — their amount always counts.
    const addedItems = mealGroups.flatMap((g) => g.items.filter((it) => it.extraItemId));
    const addedCalories = Math.round(addedItems.reduce((sum, it) => sum + it.proteinG * 4 + it.carbG * 4 + it.fatG * 9, 0));
    if (eaten.itemsLogged === 0 && addedItems.length === 0) continue;

    weeklyDeficit += burned - (eaten.calories + addedCalories);
    daysCounted++;
  }

  const pace = computePace(profile, logs);
  const height = cmToFeetInches(profile.heightCm);
  const chartPoints = logs.map((l) => ({ id: l.id, date: l.date, weightLb: kgToLb(l.weightKg) }));
  const currentWeightLb =
    pace.actualWeightKg != null ? kgToLb(pace.actualWeightKg) : profile.startWeightKg != null ? kgToLb(profile.startWeightKg) : 0;

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

        <div className="grid grid-cols-2 gap-y-4 mb-2">
          <Stat label="Avg. calorie burn (all time)" value={avgCaloriesAllTime != null ? `${avgCaloriesAllTime} kcal` : "—"} />
          <Stat label="Avg. calorie burn (7 days)" value={avgCaloriesLast7Days != null ? `${avgCaloriesLast7Days} kcal` : "—"} />
        </div>

        <div className="mb-6">
          <Stat label="Weekly deficit (Mon–today)" value={daysCounted > 0 ? `${weeklyDeficit} kcal` : "—"} />
          <p className="text-xs font-semibold opacity-50 mt-0.5">
            Burned minus eaten, {daysCounted} of {daysBetween(monday, todayStr) + 1} days logged this week. Resets every Monday.
          </p>
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
        <h2 className="text-lg font-extrabold mb-3">BMI calculator</h2>
        <BmiCalculator initialFeet={height.feet} initialInches={height.inches} initialWeightLb={currentWeightLb} />
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
                max={11.5}
                step={0.5}
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
