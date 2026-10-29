/** Time of day (spec section 5). p is day progress 0..1 from dawn to the start of night. */
import type { LightKey } from '@/palette';

/** Real seconds from dawn to dusk's end (~8 minutes). */
export const DAY_SECONDS = 480;

export type TimeLabel = 'Dawn' | 'Morning' | 'Afternoon' | 'Golden hour' | 'Dusk' | 'Night';

/** HUD labels by progress (night is a separate held state). */
export const LABELS: { from: number; label: TimeLabel }[] = [
  { from: 0, label: 'Dawn' },
  { from: 0.1, label: 'Morning' },
  { from: 0.4, label: 'Afternoon' },
  { from: 0.65, label: 'Golden hour' },
  { from: 0.82, label: 'Dusk' },
];

/** Lighting key anchors along p. Night (p >= 1) holds the night key. */
export const LIGHT_ANCHORS: { p: number; key: LightKey }[] = [
  { p: 0.0, key: 'dawn' },
  { p: 0.06, key: 'dawn' },
  { p: 0.16, key: 'day' },
  { p: 0.6, key: 'day' },
  { p: 0.72, key: 'golden' },
  { p: 0.8, key: 'golden' },
  { p: 0.9, key: 'dusk' },
  { p: 0.95, key: 'dusk' },
  { p: 1.0, key: 'night' },
];

/** Debug ?time= presets -> p. */
export const TIME_PRESETS: Record<string, number> = {
  dawn: 0.03,
  day: 0.3,
  morning: 0.25,
  afternoon: 0.5,
  golden: 0.76,
  dusk: 0.92,
  night: 1.0,
};

/** "Day" for fish/forage means morning through golden hour. */
export const DAYTIME = { from: 0.1, to: 0.82 };
/** Dusk window for Dusk Perch. */
export const DUSK = { from: 0.82, to: 1.0 };
/** Misty dawn window (Petal Koi) — dawn and early morning on a misty day. */
export const MISTY_DAWN = { from: 0.0, to: 0.22 };
/** Mist burns off by midday. */
export const MIST_BURN_OFF = { from: 0.3, to: 0.45 };
/** Sun arc across the sky, p range. */
export const SUN_ARC = { rise: -0.02, set: 0.98 };

export type DayPart = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPart(p: number): DayPart {
  if (p >= 1) return 'night';
  if (p < DAYTIME.from) return 'dawn';
  if (p < DUSK.from) return 'day';
  return 'dusk';
}

export function labelFor(p: number): TimeLabel {
  if (p >= 1) return 'Night';
  let l: TimeLabel = 'Dawn';
  for (const e of LABELS) if (p >= e.from) l = e.label;
  return l;
}
