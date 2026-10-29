/**
 * Contentment (spec section 5): hidden 0-100, never drains during a day,
 * starts each dawn at a baseline from camp comfort.
 */
import { bus } from '@/core/bus';
import { S, autosave, today } from '@/core/state';
import { CONTENTMENT, DECOR, type TierId } from '@/data/decor';
import { TENTS } from '@/data/items';

export function tierOf(v: number): TierId {
  let t: TierId = 'cozy';
  for (const tier of CONTENTMENT.tiers) if (v >= tier.min) t = tier.id;
  return t;
}

export function tierLabel(v: number): string {
  const id = tierOf(v);
  return CONTENTMENT.tiers.find((t) => t.id === id)!.label;
}

export function tier(): TierId {
  return tierOf(S().contentment.value);
}

/** 10 + tent bonus + 2 per placed decor (Guardian Lantern +5), capped at 40. */
export function baselineFor(): number {
  const s = S();
  let b = CONTENTMENT.baseline;
  if (s.camp.pitched && s.camp.tent) b += TENTS[s.camp.tent].bonus;
  for (const p of s.camp.placed) b += DECOR[p.id].baseline ?? CONTENTMENT.perDecor;
  return Math.min(CONTENTMENT.baselineCap, b);
}

/** Raise contentment. Never lowers. Returns the actual gain. */
export function gain(amount: number, source: string): number {
  const c = S().contentment;
  const before = c.value;
  const after = Math.min(100, before + Math.max(0, amount));
  const delta = after - before;
  if (delta <= 0) return 0;
  c.value = after;
  const d = today();
  d.peak = Math.max(d.peak, after);
  const tierChanged = tierOf(before) !== tierOf(after);
  if (tierOf(after) === 'blissful') c.blissfulToday = true;
  bus.emit('contentment:changed', { value: after, delta, tier: tierOf(after), tierChanged, source });
  autosave('contentment');
  return delta;
}

/** Start of a new day: reset to the baseline (it never drains during the day). */
export function resetForDawn(): void {
  const c = S().contentment;
  c.baseline = baselineFor();
  c.value = c.baseline;
  c.fireSecs = 0;
  c.fireGained = 0;
  c.rainSecs = 0;
  c.rainGained = 0;
  c.blissfulToday = false;
  today().peak = c.value;
}

/** Called each frame while sitting by the fire at night (or bookshelf/hammock). */
export function tickFireSit(dt: number): void {
  const c = S().contentment;
  c.fireSecs += dt;
  const earned = Math.min(CONTENTMENT.fireSitMaxPerNight, Math.floor(c.fireSecs / 10) * CONTENTMENT.fireSitPer10s);
  if (earned > c.fireGained) {
    gain(earned - c.fireGained, 'fire');
    c.fireGained = earned;
  }
}

/** Called each frame while resting in the tent doorway as it rains. */
export function tickRainRest(dt: number): void {
  const c = S().contentment;
  c.rainSecs += dt;
  const earned = Math.min(CONTENTMENT.rainRestMaxPerDay, Math.floor(c.rainSecs / 10) * CONTENTMENT.rainRestPer10s);
  if (earned > c.rainGained) {
    gain(earned - c.rainGained, 'rain');
    c.rainGained = earned;
  }
}

/** Raise the baseline mid-day if camp got comfier (keeps "never goes down"). */
export function refreshBaseline(): void {
  const c = S().contentment;
  const b = baselineFor();
  if (b > c.baseline) c.baseline = b;
}
