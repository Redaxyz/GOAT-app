export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * "Today" rolls over at noon (local time), not midnight — logging stays on
 * the previous calendar day until noon of the next one. Stringified from
 * local date parts (not toDateInputValue's UTC conversion), since checking
 * local hours but formatting in UTC would disagree near timezone edges.
 */
export function today(): string {
  const now = new Date();
  if (now.getHours() < 12) now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date);
}

export function dayOfWeekIndex(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
}

export function isSunday(isoDate: string): boolean {
  return dayOfWeekIndex(isoDate) === 0;
}
