// Thin REST wrappers around Google's OAuth2 token endpoint and the Calendar
// API v3. No `googleapis` dependency — this app has 5 runtime deps total and
// both APIs are plain JSON over HTTPS, so `fetch` is enough.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_CLIENT_ID is not set");
  return v;
}

function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET;
  if (!v) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return v;
}

function redirectUri(): string {
  const v = process.env.GOOGLE_REDIRECT_URI;
  if (!v) throw new Error("GOOGLE_REDIRECT_URI is not set");
  return v;
}

/** True once all three Google OAuth env vars are set — used to hide the "Connect" UI until they are. */
export function googleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenResult = { accessToken: string; refreshToken: string | null; expiresInSec: number };

export async function exchangeCodeForTokens(code: string): Promise<TokenResult> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresInSec: json.expires_in };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresInSec: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresInSec: json.expires_in };
}

export async function getCalendarTimeZone(accessToken: string, calendarId: string): Promise<string> {
  const res = await calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}`);
  const json = await res.json();
  return typeof json.timeZone === "string" ? json.timeZone : "America/New_York";
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 with offset
  endTime: string;
  timeZone: string;
};

async function calendarFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Google Calendar API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  return res;
}

function toEventBody(event: CalendarEventInput) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startTime, timeZone: event.timeZone },
    end: { dateTime: event.endTime, timeZone: event.timeZone },
  };
}

export async function createCalendarEvent(accessToken: string, calendarId: string, event: CalendarEventInput): Promise<string> {
  const res = await calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(toEventBody(event)),
  });
  const json = await res.json();
  return json.id as string;
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput
): Promise<void> {
  await calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(toEventBody(event)),
  });
}

export async function deleteCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404/410 means it's already gone on Google's side — fine, nothing left to clean up.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar API DELETE failed: ${res.status} ${await res.text()}`);
  }
}
