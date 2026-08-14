import { getActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { submitCheckIn } from "@/app/actions";
import { today, addDays, isSunday, formatDateLabel } from "@/lib/date";
import { kgToLb } from "@/lib/units";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";

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
  const editMode = isToday || edit === "1";
  const sunday = isSunday(selectedDate);
  const prevDate = addDays(selectedDate, -1);
  const nextDate = addDays(selectedDate, 1);

  const dateFilter = { profileId_date: { profileId: profile.id, date: new Date(`${selectedDate}T00:00:00.000Z`) } };

  const [existing, weightLog] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: dateFilter }),
    sunday ? prisma.weightLog.findUnique({ where: dateFilter }) : Promise.resolve(null),
  ]);

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
          <div className="text-2xl font-extrabold">{formatDateLabel(new Date(`${selectedDate}T00:00:00.000Z`))}</div>
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

      {!isToday && (
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
      )}

      <section>
        {editMode ? (
          <form action={submitCheckIn}>
            <input type="hidden" name="date" value={selectedDate} />
            <YesNoRow name="stuckToMealPlan" label="Stuck to meal plan" value={existing?.stuckToMealPlan} />
            <YesNoRow name="stuckToFitnessPlan" label="Stuck to fitness plan" value={existing?.stuckToFitnessPlan} />
            <NumberRow name="sleepScore" label="Sleep score" defaultValue={existing?.sleepScore} />
            <NumberRow name="recoveryScore" label="Recovery score" defaultValue={existing?.recoveryScore} />
            <NumberRow name="bmrReadingKcal" label="BMR reading (kcal)" defaultValue={existing?.bmrReadingKcal} />
            {sunday && (
              <NumberRow
                name="weightLb"
                label="Weight (lb)"
                step="0.1"
                defaultValue={weightLog ? kgToLb(weightLog.weightKg) : undefined}
              />
            )}
            <NotesRow defaultValue={existing?.notes} />

            <button
              type="submit"
              className="w-full mt-8 px-6 py-4 rounded-full bg-theme-accent text-theme-own text-lg font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Save check-in
            </button>
          </form>
        ) : (
          <div>
            <DisplayRow label="Stuck to meal plan" value={existing ? (existing.stuckToMealPlan ? "Yes" : "No") : "—"} />
            <DisplayRow label="Stuck to fitness plan" value={existing ? (existing.stuckToFitnessPlan ? "Yes" : "No") : "—"} />
            <DisplayRow label="Sleep score" value={existing?.sleepScore ?? "—"} />
            <DisplayRow label="Recovery score" value={existing?.recoveryScore ?? "—"} />
            <DisplayRow label="BMR reading (kcal)" value={existing?.bmrReadingKcal ?? "—"} />
            {sunday && <DisplayRow label="Weight (lb)" value={weightLog ? kgToLb(weightLog.weightKg) : "—"} />}
            <NotesDisplayRow value={existing?.notes || "—"} />
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15">{children}</div>;
}

function DisplayRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Row>
      <span className="text-lg font-bold opacity-70">{label}</span>
      <span className="text-lg font-extrabold">{value}</span>
    </Row>
  );
}

function NumberRow({
  name,
  label,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  defaultValue?: number | string | null;
  step?: string;
}) {
  return (
    <Row>
      <label htmlFor={name} className="text-lg font-bold opacity-70">
        {label}
      </label>
      <input
        id={name}
        type="number"
        name={name}
        step={step}
        defaultValue={defaultValue ?? ""}
        className="w-28 text-right text-lg font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
      />
    </Row>
  );
}

function YesNoRow({ name, label, value }: { name: string; label: string; value?: boolean | null }) {
  return (
    <Row>
      <span className="text-lg font-bold opacity-70">{label}</span>
      <div className="flex gap-2">
        <label className="px-4 py-1.5 rounded-full border-2 border-theme-accent/40 text-sm font-bold cursor-pointer has-[:checked]:bg-theme-accent has-[:checked]:text-theme-own has-[:checked]:border-theme-accent transition">
          <input type="radio" name={name} value="yes" defaultChecked={value === true} className="sr-only" />
          Yes
        </label>
        <label className="px-4 py-1.5 rounded-full border-2 border-theme-accent/40 text-sm font-bold cursor-pointer has-[:checked]:bg-theme-accent has-[:checked]:text-theme-own has-[:checked]:border-theme-accent transition">
          <input type="radio" name={name} value="no" defaultChecked={value !== true} className="sr-only" />
          No
        </label>
      </div>
    </Row>
  );
}

function NotesRow({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <label htmlFor="notes" className="block text-lg font-bold opacity-70 mb-2">
        Notes
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={3}
        defaultValue={defaultValue ?? ""}
        className="w-full text-base font-semibold bg-transparent border-2 border-theme-accent/20 rounded-2xl px-3 py-2 focus:border-theme-accent outline-none"
      />
    </div>
  );
}

function NotesDisplayRow({ value }: { value: string }) {
  return (
    <div className="py-3.5 border-b-2 border-theme-accent/15">
      <div className="text-lg font-bold opacity-70 mb-1">Notes</div>
      <div className="text-lg font-extrabold whitespace-pre-wrap">{value}</div>
    </div>
  );
}
