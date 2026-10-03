import { getActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitCheckIn, markFoodLogComplete, clearFoodLogComplete } from "@/app/actions";
import { today, addDays, isSunday, weekdayName, dateOnly, formatDateLabel } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import { getFitnessData } from "@/lib/fitnessData";
import { getMealPlan, buildOverrideMap, buildFoodSwapMap, buildMealPlanSwapMap, applyDailyModifications, sumMacros, type MealKey } from "@/lib/nutrition";
import { foodLogKey } from "@/lib/foodLog";
import type { ProfileSlug } from "@/lib/types";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import { DisplayRow, NumberRow, YesNoRow, NotesRow, NotesDisplayRow } from "@/app/components/CheckInFields";
import YesterdayCard from "@/app/components/YesterdayCard";
import TodayWorkoutCard from "@/app/components/TodayWorkoutCard";
import FoodLogSection from "@/app/components/FoodLogSection";
import SubmitButton from "@/app/components/SubmitButton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edit?: string }>;
}) {
  const profile = await getActiveProfile();
  if (!profile) return null;

  const { date: dateParam, edit } = await searchParams;
  const selectedDate = dateParam || today();
  const isToday = selectedDate === today();
  const prevDate = addDays(selectedDate, -1);
  const nextDate = addDays(selectedDate, 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/?date=${prevDate}`}
          aria-label="Previous day"
          className="p-3 rounded-full hover:bg-theme-accent/10 active:scale-95 transition"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </Link>

        <div className="text-center">
          <div className="text-2xl font-extrabold">{formatDateLabel(dateOnly(selectedDate))}</div>
          {isToday && <div className="text-xs font-bold opacity-60 uppercase tracking-wide">Today</div>}
        </div>

        {isToday ? (
          <span className="p-3 w-12 h-12" aria-hidden />
        ) : (
          <Link
            href={`/?date=${nextDate}`}
            aria-label="Next day"
            className="p-3 rounded-full hover:bg-theme-accent/10 active:scale-95 transition"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </Link>
        )}
      </div>

      {isToday ? (
        <TodaySections profileId={profile.id} profileSlug={profile.slug as ProfileSlug} />
      ) : (
        <PastDaySections profileId={profile.id} profileSlug={profile.slug as ProfileSlug} selectedDate={selectedDate} edit={edit === "1"} />
      )}
    </div>
  );
}

/** The default view: a quick recap of yesterday, today's workout, and today's food log — all actionable right from Home. */
async function TodaySections({ profileId, profileSlug }: { profileId: string; profileSlug: ProfileSlug }) {
  const todayStr = today();
  const yesterday = addDays(todayStr, -1);

  const yesterdayCheckIn = await prisma.dailyCheckIn.findUnique({ where: { profileId_date: { profileId, date: dateOnly(yesterday) } } });

  return (
    <>
      <YesterdayCard dateStr={yesterday} existing={yesterdayCheckIn} />
      <FoodAndWorkoutSections profileId={profileId} profileSlug={profileSlug} dateStr={todayStr} isToday />
    </>
  );
}

/**
 * Food log + workout card for one date — shared by today (TodaySections
 * above) and any past date (PastDaySections below), so fixing a missed lift
 * or adjusting what was actually eaten works the same way browsing back as
 * it does today; only the "today's"/"Today" wording and the yesterday recap
 * differ by date.
 */
async function FoodAndWorkoutSections({
  profileId,
  profileSlug,
  dateStr,
  isToday,
}: {
  profileId: string;
  profileSlug: ProfileSlug;
  dateStr: string;
  isToday: boolean;
}) {
  const weekday = weekdayName(dateStr);

  const [
    fitnessData,
    overrideRows,
    foodLogRows,
    dateSwapRows,
    weekdaySwapRows,
    snackRows,
    customFoodItems,
    foodLogComplete,
    extraItemRows,
    dateExtraRows,
    removalRows,
    standingRemovalRows,
  ] = await Promise.all([
    getFitnessData(profileId, profileSlug),
    prisma.mealPlanItemOverride.findMany({ where: { profileId } }),
    prisma.foodLog.findMany({ where: { profileId, date: dateOnly(dateStr) } }),
    prisma.foodItemSwap.findMany({ where: { profileId, date: dateOnly(dateStr) } }),
    prisma.mealPlanItemSwap.findMany({ where: { profileId, day: weekday } }),
    prisma.snackLog.findMany({ where: { profileId, date: dateOnly(dateStr) }, orderBy: { createdAt: "asc" } }),
    prisma.customFoodItem.findMany({ where: { profileId }, orderBy: { name: "asc" } }),
    prisma.dailyFoodLogComplete.findUnique({ where: { profileId_date: { profileId, date: dateOnly(dateStr) } } }),
    prisma.mealPlanExtraItem.findMany({ where: { profileId, day: weekday }, include: { customFoodItem: true } }),
    prisma.foodItemExtra.findMany({ where: { profileId, date: dateOnly(dateStr) } }),
    prisma.foodItemRemoval.findMany({ where: { profileId, date: dateOnly(dateStr) } }),
    prisma.mealPlanItemRemoval.findMany({ where: { profileId, day: weekday } }),
  ]);

  const overrides = buildOverrideMap(overrideRows);
  const weekdaySwaps = buildMealPlanSwapMap(weekdaySwapRows);
  const dayPlan = getMealPlan(overrides, weekdaySwaps, customFoodItems, extraItemRows, standingRemovalRows).find((d) => d.day === weekday);

  const initialFoodLog: Record<string, number> = {};
  for (const row of foodLogRows) initialFoodLog[foodLogKey(row.meal as MealKey, row.groceryId)] = row.amountG;

  // That date's own swap layers on top of the standing weekday plan above
  // (e.g. eating pasta just that day despite Tuesday's standing carb being
  // rice), and every item is fully swappable/removable/addable — see
  // makeFullySwappable.
  const dateSwaps = buildFoodSwapMap(weekday, dateSwapRows);
  const breakfast = dayPlan
    ? applyDailyModifications(dayPlan.breakfast, "breakfast", weekday, dateSwaps, overrides, customFoodItems, dateExtraRows, removalRows, standingRemovalRows)
    : [];
  const lunch = dayPlan
    ? applyDailyModifications(dayPlan.lunch, "lunch", weekday, dateSwaps, overrides, customFoodItems, dateExtraRows, removalRows, standingRemovalRows)
    : [];
  const dinner = dayPlan
    ? applyDailyModifications(dayPlan.dinner, "dinner", weekday, dateSwaps, overrides, customFoodItems, dateExtraRows, removalRows, standingRemovalRows)
    : [];
  const dayTotal = sumMacros([breakfast, lunch, dinner]);

  return (
    <>
      {dayPlan && (
        <section>
          <h2 className="text-lg font-extrabold mb-1">{isToday ? "Today's meals" : "Meals"}</h2>
          <p className="text-sm font-semibold opacity-70 mb-4">Log what was actually eaten — the faint number in each box is the plan&apos;s suggestion.</p>
          <FoodLogSection
            dateStr={dateStr}
            mealGroups={[
              { meal: "breakfast", label: "Breakfast", items: breakfast },
              { meal: "lunch", label: "Lunch", items: lunch },
              { meal: "dinner", label: "Dinner", items: dinner },
            ]}
            initialFoodLog={initialFoodLog}
            targetTotal={dayTotal}
            initialSnacks={snackRows}
            customFoodItems={customFoodItems}
          />

          <form action={foodLogComplete ? clearFoodLogComplete : markFoodLogComplete} className="mt-4">
            <input type="hidden" name="date" value={dateStr} />
            <SubmitButton
              pendingLabel="Saving…"
              savedLabel="Saved ✓"
              className={`w-full px-6 py-3.5 rounded-full text-base font-extrabold shadow-sm active:scale-95 transition ${
                foodLogComplete
                  ? "border-2 border-theme-accent/30 text-theme-accent hover:bg-theme-accent/10"
                  : "bg-theme-accent text-theme-own hover:opacity-90"
              }`}
            >
              {foodLogComplete ? "✓ Food logged — tap to undo" : "Mark food as logged"}
            </SubmitButton>
          </form>
        </section>
      )}

      <TodayWorkoutCard data={fitnessData} dateStr={dateStr} label={isToday ? "Today" : "Workout"} />
    </>
  );
}

/**
 * Browsing a past date via the arrows: the same food log + workout card as
 * today (so a missed lift or meal can be fixed retroactively — see
 * FoodAndWorkoutSections), plus the check-in record (stuck to plan/calories
 * burned/weight), which still has its own explicit view/edit toggle since
 * those are simple point-in-time fields rather than something to fill in
 * live like the meals and workout are.
 */
async function PastDaySections({ profileId, profileSlug, selectedDate, edit }: { profileId: string; profileSlug: ProfileSlug; selectedDate: string; edit: boolean }) {
  const editMode = edit;
  const sunday = isSunday(selectedDate);
  const dateFilter = { profileId_date: { profileId, date: dateOnly(selectedDate) } };

  const [existing, weightLog] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: dateFilter }),
    sunday ? prisma.weightLog.findUnique({ where: dateFilter }) : Promise.resolve(null),
  ]);

  return (
    <>
      <FoodAndWorkoutSections profileId={profileId} profileSlug={profileSlug} dateStr={selectedDate} isToday={false} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">Check-in</h2>
          {editMode ? (
            <Link href={`/?date=${selectedDate}`} className="text-sm font-bold underline underline-offset-4">
              Done editing
            </Link>
          ) : (
            <Link
              href={`/?date=${selectedDate}&edit=1`}
              className="px-5 py-1.5 rounded-full bg-theme-accent text-theme-own text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Edit
            </Link>
          )}
        </div>

        {editMode ? (
          <form action={submitCheckIn}>
            <input type="hidden" name="date" value={selectedDate} />
            <YesNoRow name="stuckToMealPlan" label="Stuck to meal plan" value={existing?.stuckToMealPlan} />
            <YesNoRow name="stuckToFitnessPlan" label="Stuck to fitness plan" value={existing?.stuckToFitnessPlan} />
            <NumberRow name="bmrReadingKcal" label="Calories burned today" defaultValue={existing?.bmrReadingKcal} />
            {sunday && (
              <NumberRow
                name="weightLb"
                label="Weight (lb)"
                step="0.1"
                defaultValue={weightLog ? kgToLb(weightLog.weightKg) : undefined}
              />
            )}
            <NotesRow defaultValue={existing?.notes} />

            <SubmitButton className="w-full mt-8 px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
              Save check-in
            </SubmitButton>
          </form>
        ) : (
          <div>
            <DisplayRow label="Stuck to meal plan" value={existing ? (existing.stuckToMealPlan ? "Yes" : "No") : "—"} />
            <DisplayRow label="Stuck to fitness plan" value={existing ? (existing.stuckToFitnessPlan ? "Yes" : "No") : "—"} />
            <DisplayRow label="Calories burned today" value={existing?.bmrReadingKcal ?? "—"} />
            {sunday && <DisplayRow label="Weight (lb)" value={weightLog ? kgToLb(weightLog.weightKg) : "—"} />}
            <NotesDisplayRow value={existing?.notes || "—"} />
          </div>
        )}
      </section>
    </>
  );
}
