import { requireActiveProfile } from "@/lib/session";
import { BASELINE_TARGETS, getFriendTargets, getGroceryList, getMealPlan, type MacroTargets } from "@/lib/nutrition";

export default async function GroceryPage() {
  const profile = await requireActiveProfile();

  const meTargets: MacroTargets = { ...BASELINE_TARGETS, scaleFactor: 1 };
  const targets = profile.slug === "ME" ? meTargets : getFriendTargets(meTargets);
  const groceryList = getGroceryList(targets.scaleFactor);
  const mealPlan = getMealPlan(targets.scaleFactor);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold mb-5">Grocery list</h1>

        <div className="grid grid-cols-2 gap-y-4 mb-8">
          <Stat label="Calories" value={`${targets.calories}`} />
          <Stat label="Protein" value={`${targets.proteinG}g`} />
          <Stat label="Carbs" value={`${targets.carbsG}g`} />
          <Stat label="Fat" value={`${targets.fatG}g`} />
        </div>

        <div>
          {groceryList.map((row) => (
            <div
              key={row.item}
              className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15 text-lg font-bold"
            >
              <span>{row.item}</span>
              <span className="font-extrabold">
                {row.amount} {row.unit}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-1">Daily meal plan</h2>
        <p className="text-sm font-semibold opacity-70 mb-4">
          Lunch is always tuna &amp; rice, dinner alternates chicken and salmon with protein pasta. Dinner is always the
          bigger meal — every day hits the same 180p/195c/56f target exactly.
        </p>
        <div className="space-y-8">
          {mealPlan.map((day) => (
            <div key={day.day}>
              <div className="text-base font-extrabold mb-2">{day.day}</div>
              <MealBlock label="Breakfast" items={day.breakfast} />
              <MealBlock label="Lunch" items={day.lunch} />
              <MealBlock label="Dinner" items={day.dinner} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MealBlock({ label, items }: { label: string; items: { item: string; amount: number; unit: string }[] }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-bold opacity-60 mb-1">{label}</div>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-2 border-b-2 border-theme-accent/15 text-base font-bold"
        >
          <span>{item.item}</span>
          <span className="font-extrabold">
            {item.amount} {item.unit}
          </span>
        </div>
      ))}
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
