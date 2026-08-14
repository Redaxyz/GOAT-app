"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, setActiveProfileCookie, clearActiveProfileCookie, ensureProfilesSeeded } from "@/lib/session";
import { feetInchesToCm, lbToKg } from "@/lib/units";
import { DEFAULT_LIFT_DAYS, parseExercisesText, type DayKey } from "@/lib/schedule";
import type { ProfileSlug, CardioType } from "@/lib/types";

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

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
      sleepScore: optionalNumber(formData, "sleepScore"),
      recoveryScore: optionalNumber(formData, "recoveryScore"),
      bmrReadingKcal: optionalNumber(formData, "bmrReadingKcal"),
      notes: (formData.get("notes") as string) || null,
    },
    create: {
      profileId: profile.id,
      date,
      stuckToMealPlan,
      stuckToFitnessPlan,
      sleepScore: optionalNumber(formData, "sleepScore"),
      recoveryScore: optionalNumber(formData, "recoveryScore"),
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

export async function submitLift(formData: FormData) {
  const profile = await getActiveProfile();
  if (!profile) throw new Error("No active profile");

  await prisma.liftLog.create({
    data: {
      profileId: profile.id,
      date: dateOnly(requireString(formData, "date")),
      exerciseName: requireString(formData, "exerciseName"),
      weightKg: lbToKg(Number(requireString(formData, "weightLb"))),
      reps: Number(requireString(formData, "reps")),
      sets: Number(requireString(formData, "sets")),
    },
  });

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

  await Promise.all(
    DEFAULT_LIFT_DAYS.map((day) => {
      const exercises = parseExercisesText((formData.get(day.dayKey) as string) || "").join("\n");
      return prisma.workoutDayPlan.upsert({
        where: { profileId_dayKey: { profileId: profile.id, dayKey: day.dayKey satisfies DayKey } },
        update: { exercises },
        create: { profileId: profile.id, dayKey: day.dayKey, exercises },
      });
    })
  );

  revalidatePath("/fitness");
  redirect("/fitness");
}
