import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getGroceryList, getMealPlan, buildOverrideMap, buildMealPlanSwapMap } from "@/lib/nutrition";
import { deleteCustomFoodItem } from "@/app/actions";
import EditableMealPlan from "@/app/components/EditableMealPlan";
import AddCustomFoodForm from "@/app/components/AddCustomFoodForm";
import SubmitButton from "@/app/components/SubmitButton";

export default async function GroceryPage() {
  const profile = await requireActiveProfile();

  const [overrideRows, swapRows, customFoodItems, extraItemRows, removalRows] = await Promise.all([
    prisma.mealPlanItemOverride.findMany({ where: { profileId: profile.id } }),
    prisma.mealPlanItemSwap.findMany({ where: { profileId: profile.id } }),
    prisma.customFoodItem.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
    prisma.mealPlanExtraItem.findMany({ where: { profileId: profile.id }, include: { customFoodItem: true } }),
    prisma.mealPlanItemRemoval.findMany({ where: { profileId: profile.id } }),
  ]);
  const overrides = buildOverrideMap(overrideRows);
  const swaps = buildMealPlanSwapMap(swapRows);

  const groceryList = getGroceryList(overrides, swaps, customFoodItems, extraItemRows, removalRows);
  const mealPlan = getMealPlan(overrides, swaps, customFoodItems, extraItemRows, removalRows);

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
        <EditableMealPlan days={mealPlan} overrideRows={overrideRows} customFoodItems={customFoodItems} />
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-1">My foods</h2>
        <p className="text-sm font-semibold opacity-70 mb-4">
          Add any food with its own P/F/C — per a given weight (raw or cooked), or per unit if you&apos;d rather count it
          (like running gels).
        </p>

        <AddCustomFoodForm />

        {customFoodItems.map((food) => {
          const calories = Math.round(food.proteinG * 4 + food.carbG * 4 + food.fatG * 9);
          return (
            <div key={food.id} className="flex items-center justify-between gap-3 py-3 border-b-2 border-theme-accent/15">
              <div className="min-w-0">
                <div className="font-extrabold truncate">{food.name}</div>
                <div className="text-xs font-semibold opacity-60">
                  {food.unit === "g" ? `${food.amountG}g (${food.state}, ${food.category})` : `1 ${food.unit} (${food.category})`} — {calories} cal —{" "}
                  {food.proteinG}P {food.carbG}C {food.fatG}F
                </div>
              </div>
              <form action={deleteCustomFoodItem}>
                <input type="hidden" name="id" value={food.id} />
                <SubmitButton
                  pendingLabel="Deleting…"
                  savedLabel="Deleted"
                  className="shrink-0 px-3 py-1.5 rounded-full border-2 border-red-500/40 text-red-500 text-xs font-extrabold hover:bg-red-500/10 active:scale-95 transition"
                >
                  Delete
                </SubmitButton>
              </form>
            </div>
          );
        })}
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
