// Training split. A profile owns its own ordered list of gym-day variants —
// not a fixed A1/B1/A2/B2 set — so days can be renamed and more of them
// added (see WorkoutDayPlan). DEFAULT_LIFT_DAYS is just the starting point
// for a brand new profile that hasn't saved anything yet.

import { daysBetween, addDays, dateOnly } from "@/lib/date";
import type { ProfileSlug } from "@/lib/types";

export type DayKey = string;

export type LiftDayDef = { dayKey: DayKey; label: string; exercises: string[] };

export const DEFAULT_LIFT_DAYS: LiftDayDef[] = [
  { dayKey: "A1", label: "Day A1", exercises: ["Dumbbell bench", "Bulgarian split squat", "Preacher curl", "Abs", "Lateral raise"] },
  { dayKey: "B1", label: "Day B1", exercises: ["RDL", "Chest supported row", "Skull crusher", "Face pulls", "Lat pulldown"] },
  { dayKey: "A2", label: "Day A2", exercises: ["Bench press", "Hack squat", "Bicep curl", "Abs", "Lateral raise"] },
  { dayKey: "B2", label: "Day B2", exercises: ["Hamstring curl", "Bent over row", "Tricep pushdown", "Shoulder press", "Pull ups"] },
];

/** A profile's own saved day list, in order — or the defaults if they haven't saved any yet. */
export function resolveLiftDays(rows: { dayKey: string; label: string; exercises: string; sortOrder: number }[]): LiftDayDef[] {
  if (rows.length === 0) return DEFAULT_LIFT_DAYS;
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({ dayKey: r.dayKey, label: r.label, exercises: parseExercisesText(r.exercises) }));
}

export function parseExercisesText(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- Two-week schedule ----------------------------------------------------
// A repeating 14-day cycle: 13 fixed activity slots (6 gym, 5 run, 2 bike —
// bike always landing on Saturday) plus one floating rest day that defaults
// to the very end of the cycle but can be taken on any of the 13 other days
// instead (see findCycleRestSlot/baseSlotForCycleSlot below). Gym rotates
// continuously through the profile's lift days (front1/back1/front2/back2/...)
// *across* cycle boundaries rather than resetting every two weeks — so which
// lift day lands on a given date depends on how many gym slots have come
// before it since CYCLE_ANCHOR, not just its position within its own cycle.
// Run is different: its long/short variant is a fixed property of the
// weekday (see RUN_VARIANT_BY_WEEKDAY below) — Monday/Tuesday/Friday runs
// are always long, Wednesday/Thursday always short (Wednesday being the
// earliest workday, no room for a long run) — rather than a rotating count,
// since a rotating count over an odd number of run slots per cycle (5) would
// silently flip every weekday's variant every other cycle.
//
// CYCLE_ANCHOR is a fixed Monday that always starts slot 0 — the cycle is
// computed from how many days a given date is from this anchor, so it never
// drifts regardless of when the app is opened.
const CYCLE_ANCHOR = "2026-08-17"; // a Monday

export type ScheduleDayType = "GYM" | "RUN" | "BIKE" | "ROW" | "SWIM" | "REST" | "OTHER";
export type RunVariant = "LONG" | "SHORT";

export const RUN_VARIANT_LABEL: Record<RunVariant, string> = { LONG: "Long run", SHORT: "5k pace" };

/**
 * A saved per-date override (or, in ScheduleExtra's case, a second/"extra"
 * workout on the same date) — customLabel only applies when type is
 * "OTHER". dayKey picks a specific lift day when type is "GYM"; runVariant
 * picks long/short when type is "RUN". Both are optional on an *override* —
 * left unset, GYM/RUN fall back to whatever the template already had for
 * that date — but effectively required on an *extra*, since there's no
 * template to fall back to for a second, purely ad hoc workout.
 */
export type ScheduleOverrideInfo = { type: ScheduleDayType; customLabel: string | null; dayKey?: string | null; runVariant?: RunVariant | null };

export type ScheduleEntry = { type: ScheduleDayType; dayKey: DayKey | null; customLabel?: string | null; runVariant?: RunVariant | null };

// The 13 fixed activity slots (0-12) of the base pattern — the 14th "day" is
// never a slot here; it's the floating rest described above. Only the *type*
// per slot is a built-in default; a profile can rearrange it slot by slot
// through the edit view (see ScheduleTemplate / resolveCycleTemplate), and
// each profile's choices are saved independently (a plain default here never
// overrides anyone who has already customized their own). Which specific
// gym-day variant lands on a given slot is always a continuous rotation (see
// gymDayKeyForGlobalRank) — so adding a 5th lift day just spreads the
// rotation across five variants instead of four, no separate redesign
// needed. A RUN slot's long/short variant is fixed by its weekday instead
// (see RUN_VARIANT_BY_WEEKDAY) — this default template only puts RUN on
// Tuesday/Thursday, so it reads as a plain alternation without leaning on
// any one person's specific weekly constraints.
export const DEFAULT_CYCLE_TYPE_TEMPLATE: ScheduleDayType[] = [
  "GYM", // Week 1 Mon
  "RUN", // Week 1 Tue — long run
  "GYM", // Week 1 Wed
  "RUN", // Week 1 Thu — 5k pace
  "GYM", // Week 1 Fri
  "BIKE", // Week 1 Sat
  "GYM", // Week 1 Sun
  "GYM", // Week 2 Mon
  "RUN", // Week 2 Tue — long run
  "GYM", // Week 2 Wed
  "RUN", // Week 2 Thu — 5k pace
  "GYM", // Week 2 Fri
  "BIKE", // Week 2 Sat
];

/** A profile's own saved two-week template, slot by slot — falling back to the built-in default for any slot they haven't customized. */
export function resolveCycleTemplate(rows: { slotIndex: number; dayType: string }[]): ScheduleDayType[] {
  const bySlot = new Map(rows.map((r) => [r.slotIndex, r.dayType as ScheduleDayType]));
  return DEFAULT_CYCLE_TYPE_TEMPLATE.map((defaultType, i) => bySlot.get(i) ?? defaultType);
}

/** Human label for a cycle slot, e.g. "Week 1 — Monday", for the edit view. */
export function cycleSlotLabel(slotIndex: number): string {
  const week = slotIndex < 7 ? "Week 1" : "Week 2";
  const weekday = dateOnly(addDays(CYCLE_ANCHOR, slotIndex)).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  return `${week} — ${weekday}`;
}

/** Which 14-day cycle `isoDate` falls in, and its raw calendar slot (0-13) within that cycle — before any rest-day shift is applied. */
function cycleNumberAndSlot(isoDate: string): { cycleNumber: number; slot: number } {
  const diff = daysBetween(CYCLE_ANCHOR, isoDate);
  const cycleNumber = Math.floor(diff / 14);
  return { cycleNumber, slot: diff - cycleNumber * 14 };
}

function cycleStartDate(cycleNumber: number): string {
  return addDays(CYCLE_ANCHOR, cycleNumber * 14);
}

/**
 * Which of this cycle's 14 calendar slots (0-13) is its one floating rest
 * day — the earliest date in the cycle with a saved REST override, or 13
 * (the default, floating to the very end) if the user hasn't taken it yet.
 * Reused by every date in the same cycle, so the whole cycle shifts together
 * off a single choice rather than each date deciding independently.
 */
function findCycleRestSlot(cycleNumber: number, scheduleOverrideByDate: Map<string, ScheduleOverrideInfo>): number {
  const start = cycleStartDate(cycleNumber);
  for (let i = 0; i < 14; i++) {
    if (scheduleOverrideByDate.get(addDays(start, i))?.type === "REST") return i;
  }
  return 13;
}

/**
 * Maps a calendar slot (0-13) back to its position in the unshifted 13-slot
 * base pattern (0-12), or "REST" if this is the slot the cycle's rest landed
 * on. Taking rest early doesn't replace that day's activity — it shifts that
 * activity (and everything after it) one day later within the same cycle.
 */
function baseSlotForCycleSlot(slot: number, restSlot: number): number | "REST" {
  if (slot === restSlot) return "REST";
  return slot < restSlot ? slot : slot - 1;
}

/** Rank (0-based) of each slot of `type` among all slots of that type in `cycleTemplate`, in chronological order; -1 elsewhere. */
function slotRanksByType(cycleTemplate: ScheduleDayType[], type: ScheduleDayType): number[] {
  let rank = 0;
  return cycleTemplate.map((t) => (t === type ? rank++ : -1));
}

/** Positive modulo — JS's `%` keeps the sign of its left operand, which breaks wraparound for ranks that could go negative. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** The lift day for the `globalRank`-th GYM slot since CYCLE_ANCHOR — continuous across cycles, so cycle 2 picks up rotating right where cycle 1 left off instead of restarting at the first lift day. */
function gymDayKeyForGlobalRank(globalRank: number, liftDays: LiftDayDef[]): DayKey | null {
  if (liftDays.length === 0) return null;
  return liftDays[mod(globalRank, liftDays.length)].dayKey;
}

// Reda actually did Back 2 on 2026-09-06, not the rotation's Back 1 — this
// shifts every GYM slot's phase by a constant so the rotation continues from
// what really happened instead of drifting out of sync with it. A flat
// offset doesn't disturb the rotation's continuity (each slot still picks up
// exactly where the previous one left off), it just relabels every slot by
// the same number of turns. Reda-specific, like RUN_VARIANT_BY_WEEKDAY.
const GYM_ROTATION_OFFSET = 2;

// Run variant is a fixed property of the weekday, not a rotating counter —
// Monday/Tuesday/Friday runs are always long, Wednesday/Thursday always
// short (an alternating L,S,L,S,L across the base week: Tue,Thu,Mon,Wed,Fri).
// A rotating cross-cycle counter was tried first, but 5 run slots per cycle
// is odd, so it silently flipped every fixed weekday's variant every other
// cycle — which is exactly how a Wednesday run ended up long, and a Friday
// one short, in the first place. Saturday/Sunday are unused by any RUN slot
// in the default template; LONG is just an arbitrary fallback if that ever changes.
const RUN_VARIANT_BY_WEEKDAY: RunVariant[] = ["LONG", "LONG", "SHORT", "SHORT", "LONG", "LONG", "LONG"]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

/** The run variant for base-template slot `i` (0 = Monday of week 1) — a pure function of its weekday, so it never drifts cycle to cycle. */
function runVariantForBaseSlot(i: number): RunVariant {
  return RUN_VARIANT_BY_WEEKDAY[i % 7];
}

/**
 * The template's default schedule entry for a date, before any user swap —
 * accounting for the cycle's rest day (if taken early) shifting everything
 * after it. The long/short run distinction is Reda's own personal schedule
 * preference (see RUN_VARIANT_BY_WEEKDAY), not a general app feature, so it
 * only applies for her profile — everyone else just gets a plain "RUN" like
 * before this was introduced, since it's not clear another profile would
 * want the same weekday split.
 */
export function templateEntryForDate(
  isoDate: string,
  liftDays: LiftDayDef[],
  cycleTemplate: ScheduleDayType[],
  scheduleOverrideByDate: Map<string, ScheduleOverrideInfo>,
  profileSlug: ProfileSlug
): ScheduleEntry {
  const { cycleNumber, slot } = cycleNumberAndSlot(isoDate);
  const restSlot = findCycleRestSlot(cycleNumber, scheduleOverrideByDate);
  const baseSlot = baseSlotForCycleSlot(slot, restSlot);
  if (baseSlot === "REST") return { type: "REST", dayKey: null };

  const type = cycleTemplate[baseSlot];
  if (type === "GYM") {
    const ranks = slotRanksByType(cycleTemplate, "GYM");
    const numGymSlots = ranks.filter((r) => r >= 0).length;
    const globalRank = cycleNumber * numGymSlots + ranks[baseSlot] + (profileSlug === "ME" ? GYM_ROTATION_OFFSET : 0);
    return { type: "GYM", dayKey: gymDayKeyForGlobalRank(globalRank, liftDays) };
  }
  if (type === "RUN") {
    return { type: "RUN", dayKey: null, runVariant: profileSlug === "ME" ? runVariantForBaseSlot(baseSlot) : null };
  }
  return { type, dayKey: null };
}

/**
 * The effective schedule entry for a date once a user swap is applied.
 * Swapping to GYM/RUN uses the override's own explicit dayKey/runVariant if
 * it set one (picking a specific lift day or run variant directly, however
 * that date was templated); otherwise it carries over the template's own
 * dayKey/runVariant if the template's type already matched, or falls back to
 * a generic "gym day"/variant-less run. Swapping to REST is what *takes* the
 * cycle's floating rest day (see findCycleRestSlot) — it isn't layered on
 * top like the other types, it's read back out of the same override this
 * function itself applies, via templateEntryForDate above.
 */
export function effectiveEntryForDate(
  isoDate: string,
  liftDays: LiftDayDef[],
  cycleTemplate: ScheduleDayType[],
  scheduleOverrideByDate: Map<string, ScheduleOverrideInfo>,
  profileSlug: ProfileSlug
): ScheduleEntry {
  const template = templateEntryForDate(isoDate, liftDays, cycleTemplate, scheduleOverrideByDate, profileSlug);
  const override = scheduleOverrideByDate.get(isoDate) ?? null;
  if (override == null) return template;
  if (override.type === "GYM") {
    return { type: "GYM", dayKey: override.dayKey ?? (template.type === "GYM" ? template.dayKey : null) };
  }
  if (override.type === "RUN") {
    return { type: "RUN", dayKey: null, runVariant: override.runVariant ?? (template.type === "RUN" ? template.runVariant ?? null : null) };
  }
  if (override.type === template.type) return template;
  return { type: override.type, dayKey: null, customLabel: override.type === "OTHER" ? override.customLabel : null };
}

/**
 * A date's second, additive workout (added via the calendar's "+"), if any —
 * fully explicit about dayKey/runVariant since there's no rotation to fall
 * back to for an ad hoc extra the way effectiveEntryForDate can fall back to
 * the template.
 */
export function extraEntryForDate(isoDate: string, scheduleExtraByDate: Map<string, ScheduleOverrideInfo>): ScheduleEntry | null {
  const extra = scheduleExtraByDate.get(isoDate);
  if (!extra) return null;
  if (extra.type === "GYM") return { type: "GYM", dayKey: extra.dayKey ?? null };
  if (extra.type === "RUN") return { type: "RUN", dayKey: null, runVariant: extra.runVariant ?? null };
  return { type: extra.type, dayKey: null, customLabel: extra.type === "OTHER" ? extra.customLabel : null };
}

/** Every scheduled entry for a date — just the primary one, or [primary, extra] on a two-workout day. */
export function effectiveEntriesForDate(
  isoDate: string,
  liftDays: LiftDayDef[],
  cycleTemplate: ScheduleDayType[],
  scheduleOverrideByDate: Map<string, ScheduleOverrideInfo>,
  scheduleExtraByDate: Map<string, ScheduleOverrideInfo>,
  profileSlug: ProfileSlug
): ScheduleEntry[] {
  const primary = effectiveEntryForDate(isoDate, liftDays, cycleTemplate, scheduleOverrideByDate, profileSlug);
  const extra = extraEntryForDate(isoDate, scheduleExtraByDate);
  return extra ? [primary, extra] : [primary];
}

/**
 * The scheduled run variant for a date, if it resolves to a RUN day (primary
 * or extra) — used to classify a *logged* run as long vs. short after the
 * fact, since CardioLog itself has no notion of variant, only
 * distance/duration. An ad hoc swap into RUN with no explicit variant has no
 * variant (null), same as effectiveEntryForDate itself.
 */
export function runVariantForDate(
  isoDate: string,
  cycleTemplate: ScheduleDayType[],
  scheduleOverrideByDate: Map<string, ScheduleOverrideInfo>,
  scheduleExtraByDate: Map<string, ScheduleOverrideInfo>,
  profileSlug: ProfileSlug
): RunVariant | null {
  const primary = effectiveEntryForDate(isoDate, [], cycleTemplate, scheduleOverrideByDate, profileSlug);
  if (primary.type === "RUN") return primary.runVariant ?? null;
  const extra = extraEntryForDate(isoDate, scheduleExtraByDate);
  return extra?.type === "RUN" ? extra.runVariant ?? null : null;
}

/** Display label for an entry — the run variant's own label, the custom text for an "OTHER" day, or the type's fixed name. */
export function entryLabel(entry: ScheduleEntry): string {
  if (entry.type === "OTHER") return entry.customLabel || "Other";
  if (entry.type === "RUN" && entry.runVariant) return RUN_VARIANT_LABEL[entry.runVariant];
  return SCHEDULE_TYPE_LABEL[entry.type];
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleDayType, string> = {
  GYM: "Gym",
  RUN: "Run",
  BIKE: "Bike",
  ROW: "Row",
  SWIM: "Swim",
  REST: "Rest",
  OTHER: "Other",
};
