import type { ProfileSlug } from "@/lib/types";

export const JACK_BLUE = "#1c3f9c";
export const REDA_PURPLE = "#c9a8e8";

export type ThemeColors = { own: string; accent: string };

const THEME: Record<ProfileSlug, ThemeColors> = {
  ME: { own: REDA_PURPLE, accent: JACK_BLUE },
  FRIEND: { own: JACK_BLUE, accent: REDA_PURPLE },
};

const DEFAULT_THEME: ThemeColors = THEME.ME;

export function getThemeColors(slug: ProfileSlug | null): ThemeColors {
  return slug ? THEME[slug] : DEFAULT_THEME;
}
