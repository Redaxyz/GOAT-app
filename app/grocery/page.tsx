import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMeTargets, getFriendTargets, getGroceryList, getMealPlan } from "@/lib/nutrition";

export default async function GroceryPage() {
  const profile = await requireActiveProfile();

  const meProfile = await prisma.profile.findUnique({ where: { slug: "ME" } });
  if (!meProfile) {
    return <p className="text-lg font-bold opacity-70">Setup incomplete — no &quot;Me&quot; profile found yet.</p>;
  }

  const meTargets = await getMeTargets(meProfile.id);
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
        <h2 className="text-lg font-extrabold mb-3">Breakfast — every day</h2>
        <div>
          {mealPlan.breakfast.map((row) => (
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
        <h2 className="text-lg font-extrabold mb-1">Daily meal portions</h2>
        <p className="text-sm font-semibold opacity-70 mb-4">
          Both meals, every day, also include: {mealPlan.perMealAddons.map((r) => `${r.amount}${r.unit === "count" ? "" : r.unit} ${r.item}`).join(", ")}.
        </p>
        <div className="space-y-6">
          {mealPlan.days.map((day) => (
            <div key={day.day}>
              <div className="text-base font-extrabold mb-1">{day.day}</div>
              {day.meals.map((meal, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3.5 border-b-2 border-theme-accent/15 text-lg font-bold"
                >
                  <span>{meal.protein}</span>
                  <span className="font-extrabold">{meal.amount}g</span>
                </div>
              ))}
            </div>
          ))}
        </div>
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
