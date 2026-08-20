# Weekly Nutrition Plan (locked, 2026-08 revision)

## How the goal cascades
The calorie goal is user-editable per profile (Grocery tab → pencil icon),
and everything else derives from it:
- **Protein** is clamped per person, not scaled: 180g for Reda, 171g for
  Jack, regardless of the calorie goal.
- **Fat** is always 25% of the calorie goal, in calories, converted to grams.
- **Carbs** get whatever calories are left after protein and fat.

Breakfast and lunch are real, fixed, validated portions — not solved, not
scaled by the calorie goal (350g chicken thigh + 70g rice has been eaten and
confirmed as the actual lunch). Dinner is what cascades: pasta is solved to
hit the day's carb target exactly, then dinner's protein source (sirloin or
salmon) is solved to use up whichever of {remaining protein, remaining fat}
is the tighter constraint — so it never exceeds either one, but isn't forced
to hit both exactly (usually impossible), and clamps to 0g rather than going
negative if breakfast + lunch alone already use up the target.

**Known edge cases, both a direct consequence of breakfast/lunch being
locked rather than solved:**
- At a low calorie goal, the fixed lunch (350g chicken thigh has ~39g fat
  alone) can eat most of the fat budget before dinner is even considered,
  shrinking dinner's protein source toward 0g. Raising the calorie goal (which
  raises the fat ceiling with it) gives dinner more room.
- On egg-breakfast days (Sat/Sun), breakfast + the fixed ground-beef lunch
  can together slightly exceed the fat target on their own at low calorie
  goals, before pasta or dinner protein are added — pasta still gets solved
  to hit the carb target exactly regardless, so it doesn't try to compensate.
  This clears up once the calorie goal is high enough that 25% of it covers
  breakfast + lunch's fixed fat load (roughly 2050+ calories, given the
  current breakfast/lunch fat totals).

## Fixed amounts (same every day)
- Lunch: 70g raw basmati rice + assorted vegetables (not tracked)
- Lunch protein: 350g cooked chicken thigh, or 310g cooked 93/7 ground beef
  (protein-equivalent to the chicken thigh portion)
- Dinner: 125g Rao's tomato sauce (~1/2 cup); pasta amount is solved (see above)
- Dinner protein: top sirloin or salmon, amount solved (see above)
- Breakfast (Mon–Fri): 200g Greek yogurt, 40g granola, 200g mixed fruit
- Breakfast (Sat–Sun): 2 eggs, 1 slice toast, 1/2 avocado

## Ground beef: 93/7 over 90/10
At the same protein amount as 350g chicken thigh, 93/7 needs meaningfully
less fat than 90/10 to deliver it, so it's the one used.

## Macro Data Used

| Food | Protein (g) | Carbs (g) | Fat (g) | Basis |
|---|---|---|---|---|
| Chicken thigh, boneless skinless, cooked | 25 | 0 | 11 | per 100g cooked |
| Ground beef, 93/7, cooked | 28.2 | 0 | 8.1 | per 100g cooked |
| Top sirloin, cooked | 29 | 0 | 8.5 | per 100g cooked |
| Salmon, Atlantic, raw | 20.3 | 0 | 13.1 | per 100g raw |
| Basmati rice, raw | 7.13 | 78.13 | 0.44 | per 100g raw |
| Protein pasta, dry | 17.637 | 67.022 | 1.7637 | per 100g dry |
| Rao's tomato sauce | 1.6 | 6.5 | 4.8 | per 100g (~90cal/2p/8c/6f per 1/2 cup label serving) |
| Greek yogurt (Oikos Triple Zero Vanilla) | 10 | 4.12 | 0 | per 100g |
| Granola | 10 | 64 | 15 | per 100g |
| Mixed fruit (avg) | 0.9 | 15.5 | 0.3 | per 100g |
| Egg, cooked | 12.6 | 1.2 | 9.6 | per 100g cooked (~2 large eggs) |
| Toast (sandwich bread) | 12 | 50 | 4 | per 100g (~25g/slice) |
| Avocado, raw | 2 | 8.5 | 14.7 | per 100g |

**Chicken thigh / ground beef / top sirloin cooking yield:** raw purchase
weight ≈ cooked weight ÷ 0.75, used only to size the weekly grocery list.
Salmon needs no such conversion — tracked at raw weight, same as it's eaten.

## Locked Daily Plan

| Day | Breakfast | Lunch | Dinner protein |
|---|---|---|---|
| Monday | Yogurt (standard) | Chicken thigh (350g cooked) + rice + veggies | Top sirloin |
| Tuesday | Yogurt (standard) | Ground beef 93/7 (310g cooked) + rice + veggies | Salmon |
| Wednesday | Yogurt (standard) | Chicken thigh (350g cooked) + rice + veggies | Top sirloin |
| Thursday | Yogurt (standard) | Ground beef 93/7 (310g cooked) + rice + veggies | Salmon |
| Friday | Yogurt (standard) | Chicken thigh (350g cooked) + rice + veggies | Top sirloin |
| Saturday | Egg + toast + avocado | Ground beef 93/7 (310g cooked) + rice + veggies | Salmon |
| Sunday | Egg + toast + avocado | Ground beef 93/7 (310g cooked) + rice + veggies | Top sirloin |

Dinner protein amounts, pasta amounts, and exact per-item/per-day totals
(protein/carb/fat/calories) are computed live in `lib/nutrition.ts`
(`getMealPlan`) from each profile's calorie goal, and shown on the Grocery
page.

## Weekly Grocery List
Computed by summing the meal plan above across all 7 days (see
`getGroceryList` in `lib/nutrition.ts`) — it can never drift out of sync with
what's actually in the daily plan:
- Chicken thigh, boneless skinless (raw) — 3 lunches
- Ground beef, 93/7 (raw) — 4 lunches
- Top sirloin (raw) — 4 dinners
- Salmon, Atlantic, raw — 3 dinners
- Basmati rice, raw — every day
- Protein pasta, dry — every dinner
- Rao's tomato sauce — every dinner
- Greek yogurt, granola, mixed fruit — 5 breakfasts (Mon–Fri)
- Eggs, toast, avocado — 2 breakfasts (Sat–Sun)
