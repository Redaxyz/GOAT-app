import { NextResponse } from "next/server";
import { requireActiveProfile } from "@/lib/session";
import { getAuthUrl } from "@/lib/googleCalendar";

/** Kicks off the Google OAuth consent flow for the active profile. */
export async function GET() {
  await requireActiveProfile(); // redirects to "/" if no profile is active
  return NextResponse.redirect(getAuthUrl());
}
