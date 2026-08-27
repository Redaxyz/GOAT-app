import { getActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitCheckIn } from "@/app/actions";
import { today, addDays, isSunday, weekdayName, dateOnly, formatDateLabel } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import { getFitnessData } from "@/lib/fitnessData";
import { getMealPlan, buildOverrideMap, type MealKey } from "@/lib/nutrition";
import { foodLogKey } from "@/lib/foodLog";
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
        <TodaySections profileId={profile.id} />
      ) : (
        <PastDaySections profileId={profile.id} selectedDate={selectedDate} edit={edit === "1"} />
      )}
    </div>
  );
}

/** The default view: a quick recap of yesterday, today's workout, and today's food log — all actionable right from Home. */
async function TodaySections({ profileId }: { profileId: string }) {
  const todayStr = today();
  const yesterday = addDays(todayStr, -1);

  const [yesterdayCheckIn, fitnessData, overrideRows, foodLogRows] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: { profileId_date: { profileId, date: dateOnly(yesterday) } } }),
    getFitnessData(profileId),
    prisma.mealPlanItemOverride.findMany({ where: { profileId } }),
    prisma.foodLog.findMany({ where: { profileId, date: dateOnly(todayStr) } }),
  ]);

  const overrides = buildOverrideMap(overrideRows);
  const todayPlan = getMealPlan(overrides).find((d) => d.day === weekdayName(todayStr));

  const initialFoodLog: Record<string, number> = {};
  for (const row of foodLogRows) initialFoodLog[foodLogKey(row.meal as MealKey, row.groceryId)] = row.amountG;

  return (
    <>
      <YesterdayCard dateStr={yesterday} existing={yesterdayCheckIn} />
      <TodayWorkoutCard data={fitnessData} dateStr={todayStr} />

      {todayPlan && (
        <section>
          <h2 className="text-lg font-extrabold mb-1">Today&apos;s meals</h2>
          <p className="text-sm font-semibold opacity-70 mb-4">Log what you actually ate — the faint number in each box is the plan&apos;s suggestion.</p>
          <FoodLogSection
            dateStr={todayStr}
            mealGroups={[
              { meal: "breakfast", label: "Breakfast", items: todayPlan.breakfast },
              { meal: "lunch", label: "Lunch", items: todayPlan.lunch },
              { meal: "dinner", label: "Dinner", items: todayPlan.dinner },
            ]}
            initialFoodLog={initialFoodLog}
            targetTotal={todayPlan.total}
          />
        </section>
      )}
    </>
  );
}

/** Browsing a past date via the arrows still uses the original read/edit check-in view. */
async function PastDaySections({ profileId, selectedDate, edit }: { profileId: string; selectedDate: string; edit: boolean }) {
  const editMode = edit;
  const sunday = isSunday(selectedDate);
  const dateFilter = { profileId_date: { profileId, date: dateOnly(selectedDate) } };

  const [existing, weightLog] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: dateFilter }),
    sunday ? prisma.weightLog.findUnique({ where: dateFilter }) : Promise.resolve(null),
  ]);

  return (
    <>
      <div className="flex justify-center">
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

      <section>
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
