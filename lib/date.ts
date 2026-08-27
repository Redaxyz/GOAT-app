export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses an ISO date string ("YYYY-MM-DD") as UTC midnight — the shape every date column is stored/compared in. */
export function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

// timeZone: "UTC" matters here — `date` is always a dateOnly() UTC-midnight
// value, and formatting it in the server's own local zone (the default)
// would shift the displayed day whenever that zone isn't UTC.
export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * "Today" is always the current Eastern-time calendar date, regardless of
 * the server's own timezone (Vercel runs in UTC) — so it rolls over at
 * midnight Eastern, not midnight UTC. "en-CA" is just the locale whose
 * built-in date format happens to be YYYY-MM-DD; America/New_York handles
 * the EST/EDT switch automatically.
 */
export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function addDays(isoDate: string, days: number): string {
  const date = dateOnly(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date);
}

export function dayOfWeekIndex(isoDate: string): number {
  return dateOnly(isoDate).getUTCDay();
}

/** Whole days from `from` to `to` (positive if `to` is later). Both are "YYYY-MM-DD". */
export function daysBetween(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / msPerDay);
}

export function isSunday(isoDate: string): boolean {
  return dayOfWeekIndex(isoDate) === 0;
}

/** Full weekday name ("Monday".."Sunday") — matches the day keys used in the locked meal plan (lib/nutrition.ts). */
export function weekdayName(isoDate: string): string {
  return dateOnly(isoDate).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
}
