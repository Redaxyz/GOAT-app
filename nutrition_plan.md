# Weekly Nutrition Plan (locked, 2026-08 revision)

## Philosophy shift
The plan is no longer solved to hit a fixed daily target. Every amount below
is either a food the user specified directly (rice, pasta, sauce) or sized to
match the protein of a "known-manageable" reference portion — whatever
calories/fat fall out of that is the real number. The old `180p/195c/56f/2000cal`
target (`BASELINE_TARGETS` in `lib/nutrition.ts`) is kept only as a legacy
reference point; this plan runs well above it most days, mainly on fat and
calories, because both lunch and dinner now carry a fat-bearing protein (no
more zero-fat tuna at lunch balancing things out).

## The two anchors
- **Lunch protein anchor:** the protein in 400g of cooked chicken breast
  (≈124g protein). Whichever lunch protein is used (chicken thigh or ground
  beef) is dosed to match that same protein amount — not the breast itself,
  which never appears in the actual plan.
- **Dinner protein anchor:** the protein in 400g of cooked chicken thigh
  (≈100g protein). Applied to both dinner proteins (top sirloin and salmon)
  for the same reason — one fixed reference instead of guessing per protein.

## Fixed amounts (same every day)
- Lunch: 70g raw basmati rice + assorted vegetables (not tracked)
- Dinner: 100g dry protein pasta + 125g Rao's tomato sauce (~1/2 cup)
- Breakfast (Mon–Fri): 200g Greek yogurt, 40g granola, 200g mixed fruit
- Breakfast (Sat–Sun): 2 eggs, 1 slice toast, 1/2 avocado

## Ground beef: 93/7 over 90/10
The user left this as an open choice ("93/7 if that makes proportions
better"). At the lunch protein anchor (124g protein), 93/7 needs ~440g cooked
beef for ~35g fat, vs. 90/10 needing ~464g cooked beef for ~52g fat — 93/7
gets the same protein for meaningfully less fat, so it's the one used.

## Macro Data Used

| Food | Protein (g) | Carbs (g) | Fat (g) | Basis |
|---|---|---|---|---|
| Chicken breast, cooked | 31 | 0 | 3.6 | per 100g cooked — reference only, sizes the lunch anchor |
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

| Day | Breakfast | Lunch | Dinner |
|---|---|---|---|
| Monday | Yogurt (standard) | Chicken thigh (~496g cooked) + rice + veggies | Top sirloin (~345g cooked) + pasta + Rao's |
| Tuesday | Yogurt (standard) | Ground beef 93/7 (~440g cooked) + rice + veggies | Salmon (~493g raw) + pasta + Rao's |
| Wednesday | Yogurt (standard) | Chicken thigh (~496g cooked) + rice + veggies | Top sirloin (~345g cooked) + pasta + Rao's |
| Thursday | Yogurt (standard) | Ground beef 93/7 (~440g cooked) + rice + veggies | Salmon (~493g raw) + pasta + Rao's |
| Friday | Yogurt (standard) | Chicken thigh (~496g cooked) + rice + veggies | Top sirloin (~345g cooked) + pasta + Rao's |
| Saturday | Egg + toast + avocado | Ground beef 93/7 (~440g cooked) + rice + veggies | Salmon (~493g raw) + pasta + Rao's |
| Sunday | Egg + toast + avocado | Ground beef 93/7 (~440g cooked) + rice + veggies | Top sirloin (~345g cooked) + pasta + Rao's |

Exact per-item and per-day totals (protein/carb/fat/calories) are computed in
`lib/nutrition.ts` (`getMealPlan`) and shown on the Grocery page — they scale
with `FRIEND_FACTOR` the same way the grocery list does.

## Weekly Grocery List (see `lib/nutrition.ts` for exact numbers)
- Chicken thigh, boneless skinless (raw) — 3 lunches
- Ground beef, 93/7 (raw) — 4 lunches
- Top sirloin (raw) — 4 dinners
- Salmon, Atlantic, raw — 3 dinners
- Basmati rice, raw — every day
- Protein pasta, dry — every dinner
- Rao's tomato sauce — every dinner
- Greek yogurt, granola, mixed fruit — 5 breakfasts (Mon–Fri)
- Eggs, toast, avocado — 2 breakfasts (Sat–Sun)
