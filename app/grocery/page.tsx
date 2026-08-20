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

        <p className="text-xs font-semibold opacity-50 mb-2">Daily ceiling the locked plan solves against — weekdays land right on it, see each day&apos;s real total below.</p>
        <div className="grid grid-cols-2 gap-y-4 mb-8">
          <Stat label="Calories" value={`${targets.calories}`} />
          <Stat label="Protein" value={`${targets.proteinG}g`} />
          <Stat label="Carbs" value={`${targets.carbsG}g`} />
          <Stat label="Fat" value={`${targets.fatG}g`} />
        </div>

        <div>
          <MacroHeaderRow />
          {groceryList.map((row) => (
            <MacroRow key={row.item} item={row.item} amount={row.amount} unit={row.unit} carbG={row.carbG} proteinG={row.proteinG} fatG={row.fatG} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-1">Daily meal plan</h2>
        <p className="text-sm font-semibold opacity-70 mb-4">
          Locked plan — same meals every week. Lunch is a fixed, real portion (350g chicken thigh, or ground beef at the
          same protein) with basmati rice; dinner (top sirloin or salmon, with protein pasta and Rao&apos;s tomato sauce) is
          solved per day to use up what&apos;s left of the day&apos;s protein/fat budget without exceeding it. Each day&apos;s
          real total is shown below it.
        </p>
        <div className="space-y-8">
          {mealPlan.map((day) => (
            <div key={day.day}>
              <div className="text-base font-extrabold mb-2">{day.day}</div>
              <MealBlock label="Breakfast" items={day.breakfast} />
              <MealBlock label="Lunch" items={day.lunch} note={day.lunchNote} />
              <MealBlock label="Dinner" items={day.dinner} />
              <div className="flex items-center justify-between text-sm font-extrabold pt-1">
                <span className="opacity-60">Day total</span>
                <span>
                  {day.total.calories} cal — {day.total.proteinG}P {day.total.carbG}C {day.total.fatG}F
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type MacroItem = { item: string; amount: number; unit: string; proteinG: number; carbG: number; fatG: number };

function MealBlock({ label, items, note }: { label: string; items: MacroItem[]; note?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-bold opacity-60 mb-1">{label}</div>
      <MacroHeaderRow small />
      {items.map((item, i) => (
        <MacroRow
          key={i}
          item={item.item}
          amount={item.amount}
          unit={item.unit}
          carbG={item.carbG}
          proteinG={item.proteinG}
          fatG={item.fatG}
          small
        />
      ))}
      {note && <div className="text-xs font-semibold opacity-50 pt-1">{note}</div>}
    </div>
  );
}

const GRID_COLS = "grid-cols-[1fr_4.5rem_2.25rem_2.25rem_2.25rem]";

function MacroHeaderRow({ small = false }: { small?: boolean }) {
  return (
    <div className={`grid ${GRID_COLS} items-center gap-2 ${small ? "pb-1" : "pb-2"} text-[10px] font-bold uppercase tracking-wide opacity-50`}>
      <span />
      <span className="text-right">Wt</span>
      <span className="text-right">C</span>
      <span className="text-right">P</span>
      <span className="text-right">F</span>
    </div>
  );
}

function MacroRow({
  item,
  amount,
  unit,
  carbG,
  proteinG,
  fatG,
  small = false,
}: {
  item: string;
  amount: number;
  unit: string;
  carbG: number;
  proteinG: number;
  fatG: number;
  small?: boolean;
}) {
  return (
    <div
      className={`grid ${GRID_COLS} items-center gap-2 ${small ? "py-2 text-base" : "py-3.5 text-lg"} border-b-2 border-theme-accent/15 font-bold`}
    >
      <span className="truncate">{item}</span>
      <span className="text-right font-extrabold whitespace-nowrap">
        {amount} {unit}
      </span>
      <span className="text-right text-sm opacity-70">{carbG}C</span>
      <span className="text-right text-sm opacity-70">{proteinG}P</span>
      <span className="text-right text-sm opacity-70">{fatG}F</span>
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
