import type { ProfileSlug } from "@/lib/types";

export const JACK_BLUE = "#1c3f9c";
export const REDA_GOLD = "#E6D299"; // Reda's original fixed color — kept as a reference; rendering now goes through getDailyRedaColor below.

// A calm pastel set Reda's color rotates through, one per calendar day.
const REDA_DAILY_PALETTE = [
  "#A3C4BC", // Pastel Blue
  "#F5CAC3", // Soft Pink
  "#EAD7D1", // Light Lavender
  "#FFF8E1", // Cream
  "#FFE3B3", // Pale Lemon
  "#D9EAD3", // Mint Green
] as const;

const PASTEL_BLUE = REDA_DAILY_PALETTE[0];

/** Deterministic per-date hash — the same calendar date always lands on the same color (so a page reload doesn't flicker), but which one looks unpredictable day to day. No state to store; just a function of the date string. */
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Reda's color for one date ("YYYY-MM-DD") — rotates daily through REDA_DAILY_PALETTE. */
export function getDailyRedaColor(dateStr: string): string {
  return REDA_DAILY_PALETTE[hashDate(dateStr) % REDA_DAILY_PALETTE.length];
}

/** Jack's color for one date — normally his fixed blue, except on days Reda's pastel blue would sit too close to it to tell the two apart, when it goes white instead. */
export function getDailyJackColor(dateStr: string): string {
  return getDailyRedaColor(dateStr) === PASTEL_BLUE ? "#FFFFFF" : JACK_BLUE;
}

export type ThemeColors = { own: string; accent: string };

/** `dateStr` — today's date ("YYYY-MM-DD") — so both profiles' sessions (and the pre-login screen) always agree on the same day's colors. */
export function getThemeColors(slug: ProfileSlug | null, dateStr: string): ThemeColors {
  const redaColor = getDailyRedaColor(dateStr);
  const jackColor = getDailyJackColor(dateStr);
  const theme: Record<ProfileSlug, ThemeColors> = {
    ME: { own: redaColor, accent: jackColor },
    FRIEND: { own: jackColor, accent: redaColor },
  };
  return slug ? theme[slug] : theme.ME;
}
