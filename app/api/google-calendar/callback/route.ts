import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireActiveProfile } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getCalendarTimeZone } from "@/lib/googleCalendar";
import { syncDateRange } from "@/lib/calendarSync";
import { today } from "@/lib/date";

export async function GET(request: NextRequest) {
  const profile = await requireActiveProfile();

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/fitness?edit=1&calendarError=missing_code", request.url));
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refreshToken) {
    // Google only returns a refresh token on the first consent, or when
    // prompt=consent forces re-consent (which getAuthUrl always sets) — if
    // it's still missing something unexpected happened upstream.
    return NextResponse.redirect(new URL("/fitness?edit=1&calendarError=no_refresh_token", request.url));
  }

  const calendarId = "primary";
  const timeZone = await getCalendarTimeZone(tokens.accessToken, calendarId);
  const tokenExpiry = new Date(Date.now() + tokens.expiresInSec * 1000);

  await prisma.googleCalendarConnection.upsert({
    where: { profileId: profile.id },
    update: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenExpiry, calendarId, timeZone },
    create: { profileId: profile.id, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenExpiry, calendarId, timeZone },
  });

  after(async () => {
    try {
      await syncDateRange(profile.id, today());
    } catch (err) {
      console.error("Initial calendar sync failed", err);
    }
  });

  return NextResponse.redirect(new URL("/fitness?edit=1&calendarConnected=1", request.url));
}
