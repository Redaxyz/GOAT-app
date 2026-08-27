import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getGroceryList, getMealPlan, buildOverrideMap, buildMealPlanSwapMap } from "@/lib/nutrition";
import { addCustomFoodItem, deleteCustomFoodItem } from "@/app/actions";
import EditableMealPlan from "@/app/components/EditableMealPlan";
import SubmitButton from "@/app/components/SubmitButton";

export default async function GroceryPage() {
  const profile = await requireActiveProfile();

  const [overrideRows, swapRows, customFoodItems, extraItemRows] = await Promise.all([
    prisma.mealPlanItemOverride.findMany({ where: { profileId: profile.id } }),
    prisma.mealPlanItemSwap.findMany({ where: { profileId: profile.id } }),
    prisma.customFoodItem.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
    prisma.mealPlanExtraItem.findMany({ where: { profileId: profile.id }, include: { customFoodItem: true } }),
  ]);
  const overrides = buildOverrideMap(overrideRows);
  const swaps = buildMealPlanSwapMap(swapRows);

  const groceryList = getGroceryList(overrides, swaps, customFoodItems, extraItemRows);
  const mealPlan = getMealPlan(overrides, swaps, customFoodItems, extraItemRows);

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
          Add any food with its own P/F/C for a given weight — raw or cooked, for your own reference.
        </p>

        <form action={addCustomFoodItem} className="space-y-3 mb-6">
          <input
            name="name"
            placeholder="Food name"
            required
            className="w-full text-base font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm font-bold opacity-70">
              <input
                name="amountG"
                type="number"
                min="0"
                step="1"
                required
                placeholder="Weight"
                className="w-20 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              g
            </label>
            <select
              name="state"
              defaultValue="raw"
              className="text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            >
              <option value="raw">Raw</option>
              <option value="cooked">Cooked</option>
            </select>
            <select
              name="category"
              defaultValue="other"
              className="text-sm font-bold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
            >
              <option value="protein">Protein</option>
              <option value="carb">Carb</option>
              <option value="other">Other</option>
            </select>
          </div>
          <p className="text-xs font-semibold opacity-50">
            Protein/carb foods also join the lunch and dinner swap dropdowns; other just adds it here and to the full food list.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm font-bold opacity-70">
              <input
                name="proteinG"
                type="number"
                min="0"
                step="0.1"
                required
                placeholder="0"
                className="w-16 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              P
            </label>
            <label className="flex items-center gap-1 text-sm font-bold opacity-70">
              <input
                name="carbG"
                type="number"
                min="0"
                step="0.1"
                required
                placeholder="0"
                className="w-16 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              C
            </label>
            <label className="flex items-center gap-1 text-sm font-bold opacity-70">
              <input
                name="fatG"
                type="number"
                min="0"
                step="0.1"
                required
                placeholder="0"
                className="w-16 text-right font-extrabold bg-transparent border-b-2 border-theme-accent/30 focus:border-theme-accent outline-none py-1"
              />
              F
            </label>
          </div>
          <SubmitButton className="px-5 py-2.5 rounded-full bg-theme-accent text-theme-own text-sm font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition">
            Add food
          </SubmitButton>
        </form>

        {customFoodItems.map((food) => {
          const calories = Math.round(food.proteinG * 4 + food.carbG * 4 + food.fatG * 9);
          return (
            <div key={food.id} className="flex items-center justify-between gap-3 py-3 border-b-2 border-theme-accent/15">
              <div className="min-w-0">
                <div className="font-extrabold truncate">{food.name}</div>
                <div className="text-xs font-semibold opacity-60">
                  {food.amountG}g ({food.state}, {food.category}) — {calories} cal — {food.proteinG}P {food.carbG}C {food.fatG}F
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
