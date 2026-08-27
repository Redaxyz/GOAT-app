"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, setActiveProfileCookie, clearActiveProfileCookie, ensureProfilesSeeded } from "@/lib/session";
import { feetInchesToCm, lbToKg, kgToLb } from "@/lib/units";
import { DEFAULT_LIFT_DAYS, DEFAULT_CYCLE_TYPE_TEMPLATE, parseExercisesText, type ScheduleDayType } from "@/lib/schedule";
import { MAX_LIFT_SETS } from "@/lib/overload";
import { allFoodOptions, macroGrams, type MealKey } from "@/lib/nutrition";
import { dateOnly } from "@/lib/date";
import type { ProfileSlug, CardioType, LiftSetEntry } from "@/lib/types";

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function selectProfile(slug: ProfileSlug) {
  await ensureProfilesSeeded();
  await setActiveProfileCookie(slug);
  revalidatePath("/");
  redirect("/");
}

export async function switchProfile() {
  await clearActiveProfileCookie();
  revalidatePath("/");
  redirect("/");
}

export async function submitCheckIn(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));
  const stuckToMealPlan = formData.get("stuckToMealPlan") === "yes";
  const stuckToFitnessPlan = formData.get("stuckToFitnessPlan") === "yes";

  await prisma.dailyCheckIn.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    update: {
      stuckToMealPlan,
      stuckToFitnessPlan,
      bmrReadingKcal: optionalNumber(formData, "bmrReadingKcal"),
      notes: (formData.get("notes") as string) || null,
    },
    create: {
      profileId: profile.id,
      date,
      stuckToMealPlan,
      stuckToFitnessPlan,
      bmrReadingKcal: optionalNumber(formData, "bmrReadingKcal"),
      notes: (formData.get("notes") as string) || null,
    },
  });

  const weightLb = optionalNumber(formData, "weightLb");
  if (weightLb != null) {
    const weightKg = lbToKg(weightLb);
    await prisma.weightLog.upsert({
      where: { profileId_date: { profileId: profile.id, date } },
      update: { weightKg },
      create: { profileId: profile.id, date, weightKg },
    });
    revalidatePath("/progress");
  }

  revalidatePath("/");
  revalidatePath("/grocery");
}

export async function submitWeight(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));
  const weightKg = lbToKg(Number(requireString(formData, "weightLb")));

  await prisma.weightLog.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    update: { weightKg },
    create: { profileId: profile.id, date, weightKg },
  });

  revalidatePath("/progress");
}

/** Ownership check shared by edit/delete — a WeightLog id only belongs to the caller if it matches their active profile. */
async function requireOwnedWeightLog(id: string, profileId: string) {
  const existing = await prisma.weightLog.findUnique({ where: { id } });
  if (!existing || existing.profileId !== profileId) throw new Error("Weight entry not found");
  return existing;
}

export async function updateWeightEntry(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const id = requireString(formData, "id");
  await requireOwnedWeightLog(id, profile.id);

  const weightKg = lbToKg(Number(requireString(formData, "weightLb")));
  await prisma.weightLog.update({ where: { id }, data: { weightKg } });

  revalidatePath("/progress");
}

export async function deleteWeightEntry(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const id = requireString(formData, "id");
  await requireOwnedWeightLog(id, profile.id);

  await prisma.weightLog.delete({ where: { id } });
  revalidatePath("/progress");
}

export async function submitLift(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const exerciseName = requireString(formData, "exerciseName");
  const date = dateOnly(requireString(formData, "date"));

  const sets: LiftSetEntry[] = [];
  for (let i = 1; i <= MAX_LIFT_SETS; i++) {
    const weightLb = optionalNumber(formData, `setWeightLb${i}`);
    const reps = optionalNumber(formData, `setReps${i}`);
    if (weightLb != null && reps != null) sets.push({ weightKg: lbToKg(weightLb), reps });
  }
  if (sets.length === 0) throw new Error("At least one set is required");

  const previous = await prisma.liftLog.findFirst({
    where: { profileId: profile.id, exerciseName },
    orderBy: { date: "desc" },
  });

  await prisma.liftLog.create({
    data: { profileId: profile.id, date, exerciseName, sets },
  });

  // A weight increase over the last logged session's top set for this
  // exercise defines the increment used for future suggestions, replacing
  // the 5lb default.
  if (previous) {
    const prevSets = previous.sets as unknown as LiftSetEntry[];
    const prevTopLb = Math.max(...prevSets.map((s) => kgToLb(s.weightKg)));
    const newTopLb = Math.max(...sets.map((s) => kgToLb(s.weightKg)));
    const deltaLb = Math.round((newTopLb - prevTopLb) * 10) / 10;
    if (deltaLb > 0) {
      await prisma.exerciseIncrement.upsert({
        where: { profileId_exerciseName: { profileId: profile.id, exerciseName } },
        update: { incrementLb: deltaLb },
        create: { profileId: profile.id, exerciseName, incrementLb: deltaLb },
      });
    }
  }

  revalidatePath("/fitness");
}

export async function submitCardio(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  await prisma.cardioLog.create({
    data: {
      profileId: profile.id,
      date: dateOnly(requireString(formData, "date")),
      type: requireString(formData, "type") as CardioType,
      distanceKm: Number(requireString(formData, "distanceKm")),
      durationMin: optionalNumber(formData, "durationMin"),
    },
  });

  revalidatePath("/fitness");
}

/** Swap a specific date's schedule type (gym/run/bike/rest/other) on the fly. customLabel only applies when dayType is "OTHER". */
export async function setScheduleOverride(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));
  const dayType = requireString(formData, "dayType") as ScheduleDayType;
  const customLabel = dayType === "OTHER" ? requireString(formData, "customLabel") : null;

  await prisma.scheduleOverride.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    update: { dayType, customLabel },
    create: { profileId: profile.id, date, dayType, customLabel },
  });

  revalidatePath("/fitness");
  revalidatePath("/");
}

/** Revert a date back to its default two-week-cycle schedule. */
export async function clearScheduleOverride(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));

  await prisma.scheduleOverride.deleteMany({ where: { profileId: profile.id, date } });

  revalidatePath("/fitness");
  revalidatePath("/");
}

/** Rearranges the two-week gym/run/bike cycle slot by slot. */
export async function updateScheduleTemplate(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  await Promise.all(
    DEFAULT_CYCLE_TYPE_TEMPLATE.map((_, slotIndex) => {
      const dayType = requireString(formData, `slot__${slotIndex}`) as ScheduleDayType;
      return prisma.scheduleTemplate.upsert({
        where: { profileId_slotIndex: { profileId: profile.id, slotIndex } },
        update: { dayType },
        create: { profileId: profile.id, slotIndex, dayType },
      });
    })
  );

  revalidatePath("/fitness");
  redirect("/fitness");
}

/** Overrides one meal-plan item's serving size — its P/C/F, the day's totals, and the grocery list all recompute from this. */
export async function setMealPlanItemAmount(day: string, meal: MealKey, groceryId: string, amountG: number) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  if (!Number.isFinite(amountG) || amountG < 0) {
    throw new Error("Serving size must be a non-negative number");
  }

  await prisma.mealPlanItemOverride.upsert({
    where: { profileId_day_meal_groceryId: { profileId: profile.id, day, meal, groceryId } },
    update: { amountG },
    create: { profileId: profile.id, day, meal, groceryId, amountG },
  });

  // The standing plan this overrides is also what Home's target total and
  // Progress's weekly deficit read for that weekday — revalidate both so an
  // edit made while today happens to be that weekday shows up immediately,
  // not just next time the weekday comes around.
  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

/**
 * Logs the actual amount eaten of one meal-plan item on one specific date —
 * distinct from setMealPlanItemAmount above, which adjusts the standing plan
 * instead. Pass null to un-log it (the field was cleared back to empty).
 */
export async function logFoodItem(date: string, meal: MealKey, groceryId: string, amountG: number | null) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const where = { profileId_date_meal_groceryId: { profileId: profile.id, date: dateOnly(date), meal, groceryId } };

  if (amountG == null) {
    await prisma.foodLog.deleteMany({ where: { profileId: profile.id, date: dateOnly(date), meal, groceryId } });
  } else {
    if (!Number.isFinite(amountG) || amountG < 0) throw new Error("Amount must be a non-negative number");
    await prisma.foodLog.upsert({ where, update: { amountG }, create: { profileId: profile.id, date: dateOnly(date), meal, groceryId, amountG } });
  }

  revalidatePath("/");
  revalidatePath("/progress");
}

/** Swaps one meal-slot's item for an alternative on one specific date (e.g. lunch's meat, chicken thigh -> salmon) — the amount carries over, so its P/C/F and the day's total recompute from that. */
export async function setFoodItemSwap(date: string, meal: MealKey, slot: string, groceryId: string) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  await prisma.foodItemSwap.upsert({
    where: { profileId_date_meal_slot: { profileId: profile.id, date: dateOnly(date), meal, slot } },
    update: { groceryId },
    create: { profileId: profile.id, date: dateOnly(date), meal, slot, groceryId },
  });

  revalidatePath("/");
  revalidatePath("/progress");
}

/** Swaps one meal-slot's item for an alternative on the STANDING plan for a weekday going forward — the weekday counterpart to setFoodItemSwap below, so it feeds the grocery list and becomes that weekday's default everywhere. */
export async function setMealPlanItemSwap(day: string, meal: MealKey, slot: string, groceryId: string) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  await prisma.mealPlanItemSwap.upsert({
    where: { profileId_day_meal_slot: { profileId: profile.id, day, meal, slot } },
    update: { groceryId },
    create: { profileId: profile.id, day, meal, slot, groceryId },
  });

  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

/** Adds a user-defined food to the Grocery page's personal food list — P/F/C given for one reference weight, raw or cooked. A "protein"/"carb" category also joins that food to the lunch/dinner meat/carb swap dropdowns everywhere (see lib/nutrition.ts). */
export async function addCustomFoodItem(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const name = requireString(formData, "name");
  const amountG = Number(requireString(formData, "amountG"));
  const proteinG = Number(requireString(formData, "proteinG"));
  const carbG = Number(requireString(formData, "carbG"));
  const fatG = Number(requireString(formData, "fatG"));
  const state = requireString(formData, "state");
  const category = requireString(formData, "category");

  if (![amountG, proteinG, carbG, fatG].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error("Weight and macros must be non-negative numbers");
  }
  if (state !== "raw" && state !== "cooked") throw new Error("State must be raw or cooked");
  if (!["protein", "carb", "other"].includes(category)) throw new Error("Category must be protein, carb, or other");

  await prisma.customFoodItem.create({
    data: { profileId: profile.id, name, amountG, proteinG, carbG, fatG, state, category },
  });

  // A new protein/carb food should show up in the meat/carb dropdowns
  // immediately — those are read on Home and Progress too, not just Grocery.
  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

async function requireOwnedCustomFoodItem(id: string, profileId: string) {
  const existing = await prisma.customFoodItem.findUnique({ where: { id } });
  if (!existing || existing.profileId !== profileId) throw new Error("Food item not found");
  return existing;
}

export async function deleteCustomFoodItem(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const id = requireString(formData, "id");
  await requireOwnedCustomFoodItem(id, profile.id);

  // Cascades to any MealPlanExtraItem rows using this food (see schema).
  await prisma.customFoodItem.delete({ where: { id } });
  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

/** Adds a saved custom food as an extra row on the STANDING plan for a weekday's meal — on top of the fixed plan items, not replacing any of them (that's setMealPlanItemSwap's job). */
export async function addMealPlanExtraItem(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const day = requireString(formData, "day");
  const meal = requireString(formData, "meal");
  const customFoodItemId = requireString(formData, "customFoodItemId");
  const amountG = Number(requireString(formData, "amountG"));
  if (!Number.isFinite(amountG) || amountG < 0) throw new Error("Amount must be a non-negative number");

  const food = await prisma.customFoodItem.findUnique({ where: { id: customFoodItemId } });
  if (!food || food.profileId !== profile.id) throw new Error("Food item not found");

  await prisma.mealPlanExtraItem.upsert({
    where: { profileId_day_meal_customFoodItemId: { profileId: profile.id, day, meal, customFoodItemId } },
    update: { amountG },
    create: { profileId: profile.id, day, meal, customFoodItemId, amountG },
  });

  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

/** Live amount edits on an already-added extra item — called imperatively (like setFoodItemSwap), not through a plain form. */
export async function updateMealPlanExtraItemAmount(id: string, amountG: number) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");
  if (!Number.isFinite(amountG) || amountG < 0) throw new Error("Amount must be a non-negative number");

  const existing = await prisma.mealPlanExtraItem.findUnique({ where: { id } });
  if (!existing || existing.profileId !== profile.id) throw new Error("Item not found");

  await prisma.mealPlanExtraItem.update({ where: { id }, data: { amountG } });

  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

export async function deleteMealPlanExtraItem(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const id = requireString(formData, "id");
  const existing = await prisma.mealPlanExtraItem.findUnique({ where: { id } });
  if (!existing || existing.profileId !== profile.id) throw new Error("Item not found");

  await prisma.mealPlanExtraItem.delete({ where: { id } });

  revalidatePath("/grocery");
  revalidatePath("/");
  revalidatePath("/progress");
}

/**
 * Logs one ad-hoc snack for a specific date — distinct from logFoodItem
 * above, which only logs amounts against the fixed plan's existing slots.
 * `source` picks how the macros are resolved: "catalog" looks up a food (a
 * plan item or a saved custom food — allFoodOptions covers both) by
 * groceryId and computes P/C/F from its per100g rate; "other" takes the
 * macros as typed, with no weight/rate at all.
 */
export async function addSnack(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));
  const source = requireString(formData, "source");

  let label: string;
  let amountG: number | null = null;
  let proteinG: number;
  let carbG: number;
  let fatG: number;

  if (source === "catalog") {
    const groceryId = requireString(formData, "groceryId");
    const customFoods = await prisma.customFoodItem.findMany({ where: { profileId: profile.id } });
    const option = allFoodOptions(customFoods).find((o) => o.groceryId === groceryId);
    if (!option) throw new Error("Unknown food");
    amountG = Number(requireString(formData, "amountG"));
    if (!Number.isFinite(amountG) || amountG < 0) throw new Error("Amount must be a non-negative number");
    label = option.item;
    ({ proteinG, carbG, fatG } = macroGrams(amountG, option.per100g));
  } else if (source === "other") {
    label = requireString(formData, "label");
    proteinG = Number(requireString(formData, "proteinG"));
    carbG = Number(requireString(formData, "carbG"));
    fatG = Number(requireString(formData, "fatG"));
    if (![proteinG, carbG, fatG].every((n) => Number.isFinite(n) && n >= 0)) {
      throw new Error("Macros must be non-negative numbers");
    }
  } else {
    throw new Error("Unknown snack source");
  }

  await prisma.snackLog.create({
    data: { profileId: profile.id, date, label, amountG, proteinG, carbG, fatG },
  });

  revalidatePath("/");
  revalidatePath("/progress");
}

async function requireOwnedSnackLog(id: string, profileId: string) {
  const existing = await prisma.snackLog.findUnique({ where: { id } });
  if (!existing || existing.profileId !== profileId) throw new Error("Snack not found");
  return existing;
}

export async function deleteSnack(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const id = requireString(formData, "id");
  await requireOwnedSnackLog(id, profile.id);

  await prisma.snackLog.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/progress");
}

/** Marks (or un-marks) a date's food logging as done — a simple presence flag shown as a checkmark on Home, deliberately independent of DailyCheckIn (see schema comment). */
export async function markFoodLogComplete(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));

  await prisma.dailyFoodLogComplete.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    update: {},
    create: { profileId: profile.id, date },
  });

  revalidatePath("/");
}

export async function clearFoodLogComplete(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));

  await prisma.dailyFoodLogComplete.deleteMany({ where: { profileId: profile.id, date } });

  revalidatePath("/");
}

export async function updateProfileSettings(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const birthDateRaw = formData.get("birthDate");
  const goalDateRaw = formData.get("goalDate");
  const heightFeet = optionalNumber(formData, "heightFeet");
  const heightInches = optionalNumber(formData, "heightInches");
  const heightCm = heightFeet != null || heightInches != null ? feetInchesToCm(heightFeet ?? 0, heightInches ?? 0) : null;
  const startWeightLb = optionalNumber(formData, "startWeightLb");
  const goalWeightLb = optionalNumber(formData, "goalWeightLb");

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      heightCm,
      startWeightKg: startWeightLb != null ? lbToKg(startWeightLb) : null,
      goalWeightKg: goalWeightLb != null ? lbToKg(goalWeightLb) : null,
      birthDate: typeof birthDateRaw === "string" && birthDateRaw ? dateOnly(birthDateRaw) : null,
      goalDate: typeof goalDateRaw === "string" && goalDateRaw ? dateOnly(goalDateRaw) : null,
    },
  });

  revalidatePath("/progress");
  revalidatePath("/");
}

export async function updateWorkoutDayPlans(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const dayKeys = requireString(formData, "dayKeys")
    .split(",")
    .filter(Boolean);

  await Promise.all(
    dayKeys.map((dayKey, index) => {
      const label = ((formData.get(`label__${dayKey}`) as string) || "").trim() || `Day ${index + 1}`;
      const exercises = parseExercisesText((formData.get(`exercises__${dayKey}`) as string) || "").join("\n");
      return prisma.workoutDayPlan.upsert({
        where: { profileId_dayKey: { profileId: profile.id, dayKey } },
        update: { label, exercises, sortOrder: index },
        create: { profileId: profile.id, dayKey, label, exercises, sortOrder: index },
      });
    })
  );

  revalidatePath("/fitness");
  redirect("/fitness");
}

/** Adds a new, blank gym-day variant to the end of the profile's list — seeding the built-in defaults first if this is the profile's first-ever edit. */
export async function addWorkoutDay() {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const existing = await prisma.workoutDayPlan.findMany({ where: { profileId: profile.id } });

  if (existing.length === 0) {
    await prisma.workoutDayPlan.createMany({
      data: DEFAULT_LIFT_DAYS.map((d, index) => ({
        profileId: profile.id,
        dayKey: d.dayKey,
        label: d.label,
        exercises: d.exercises.join("\n"),
        sortOrder: index,
      })),
    });
  }

  const nextSortOrder = (existing.length === 0 ? DEFAULT_LIFT_DAYS.length - 1 : Math.max(...existing.map((r) => r.sortOrder))) + 1;

  await prisma.workoutDayPlan.create({
    data: {
      profileId: profile.id,
      dayKey: `day-${Date.now()}`,
      label: `Day ${nextSortOrder + 1}`,
      exercises: "",
      sortOrder: nextSortOrder,
    },
  });

  revalidatePath("/fitness");
  redirect("/fitness?edit=1");
}
