import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ProfileSlug } from "@/lib/types";

const COOKIE_NAME = "goat_profile";

export async function getActiveProfileSlug(): Promise<ProfileSlug | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value === "ME" || value === "FRIEND" ? value : null;
}

export async function getActiveProfile() {
  const slug = await getActiveProfileSlug();
  if (!slug) return null;
  return prisma.profile.findUnique({ where: { slug } });
}

/** For pages that require a profile to be picked first; bounces back to "/" otherwise. */
export async function requireActiveProfile() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/");
  return profile;
}

export async function setActiveProfileCookie(slug: ProfileSlug) {
  const store = await cookies();
  store.set(COOKIE_NAME, slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // No maxAge: session cookie, cleared when the browser closes so the login
    // screen shows again next time instead of staying signed in indefinitely.
  });
}

export async function clearActiveProfileCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Ensures the two fixed profiles (Me / Friend) exist. Safe to call repeatedly. */
export async function ensureProfilesSeeded() {
  await prisma.profile.upsert({
    where: { slug: "ME" },
    update: { name: "Reda" },
    create: { slug: "ME", name: "Reda" },
  });
  await prisma.profile.upsert({
    where: { slug: "FRIEND" },
    update: { name: "Jack" },
    create: { slug: "FRIEND", name: "Jack" },
  });
}
