"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, setActiveProfileCookie, clearActiveProfileCookie, ensureProfilesSeeded } from "@/lib/session";
import { feetInchesToCm, lbToKg, kgToLb } from "@/lib/units";
import { DEFAULT_LIFT_DAYS, DEFAULT_CYCLE_TYPE_TEMPLATE, parseExercisesText, type ScheduleDayType } from "@/lib/schedule";
import { MAX_LIFT_SETS } from "@/lib/overload";
import type { MealKey } from "@/lib/nutrition";
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

/** Swap a specific date's schedule type (gym/run/bike/rest) on the fly. */
export async function setScheduleOverride(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));
  const dayType = requireString(formData, "dayType") as ScheduleDayType;

  await prisma.scheduleOverride.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    update: { dayType },
    create: { profileId: profile.id, date, dayType },
  });

  revalidatePath("/fitness");
}

/** Revert a date back to its default two-week-cycle schedule. */
export async function clearScheduleOverride(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  const date = dateOnly(requireString(formData, "date"));

  await prisma.scheduleOverride.deleteMany({ where: { profileId: profile.id, date } });

  revalidatePath("/fitness");
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

  revalidatePath("/grocery");
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
