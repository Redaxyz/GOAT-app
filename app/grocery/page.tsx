import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getGroceryList, getMealPlan, buildOverrideMap } from "@/lib/nutrition";
import EditableMealPlan from "@/app/components/EditableMealPlan";

export default async function GroceryPage() {
  const profile = await requireActiveProfile();

  const overrideRows = await prisma.mealPlanItemOverride.findMany({ where: { profileId: profile.id } });
  const overrides = buildOverrideMap(overrideRows);

  const groceryList = getGroceryList(overrides);
  const mealPlan = getMealPlan(overrides);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold mb-5">Grocery list</h1>

        <p className="text-xs font-semibold opacity-50 mb-2">Summed straight from the meal plan below — edit a serving size there and this updates too.</p>
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
          Tap any serving size to change it — its protein/carb/fat, the day&apos;s totals, and the grocery list above all
          update from that.
        </p>
        <EditableMealPlan days={mealPlan} />
      </section>
    </div>
  );
}

const GRID_COLS = "grid-cols-[1fr_4.5rem_2.25rem_2.25rem_2.25rem]";

function MacroHeaderRow() {
  return (
    <div className={`grid ${GRID_COLS} items-center gap-2 pb-2 text-[10px] font-bold uppercase tracking-wide opacity-50`}>
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
}: {
  item: string;
  amount: number;
  unit: string;
  carbG: number;
  proteinG: number;
  fatG: number;
}) {
  return (
    <div className={`grid ${GRID_COLS} items-center gap-2 py-3.5 text-lg border-b-2 border-theme-accent/15 font-bold`}>
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
