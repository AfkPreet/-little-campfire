/**
 * The guardian in the water (spec section 5). Steps:
 * 1 glow seen (first night) -> 2 scale found (dawn after first rainy night) ->
 * 3 legend heard (shop with scale) -> 4 dumplings cooked -> 5 guardian met.
 */
import { bus } from '@/core/bus';
import { S, autosave } from '@/core/state';
import { MYSTERY } from '@/data/mystery';
import { recordClue } from './journal';
import { ensureRainTonight } from './weather';

export function step(): number {
  return S().mystery.step;
}

function advance(to: number): void {
  const m = S().mystery;
  if (m.step >= to) return;
  m.step = to;
  recordClue(to);
  bus.emit('mystery:step', { step: to });
  bus.emit('toast', { text: MYSTERY.toastJournal });
  autosave('mystery');
}

/** Night begins: should the far glow drift by tonight? (first night only) */
export function shouldShowGlow(): boolean {
  const s = S();
  return s.mystery.step === 0 && !s.mystery.glowTonight;
}

/** The glow sighting finished playing while the hero was outside. */
export function glowSeen(): void {
  S().mystery.glowTonight = true;
  advance(1);
}

/** Dawn: place the scale on the shore the morning after the first rainy night. */
export function dawnCheck(): void {
  const s = S();
  if (s.mystery.step === 1 && s.weather.lastNightRainy && !s.mystery.hasScale) s.mystery.scaleOnShore = true;
}

export function pickUpScale(): void {
  const m = S().mystery;
  m.scaleOnShore = false;
  m.hasScale = true;
  advance(2);
}

/** Entering the shop with the scale triggers the legend. */
export function legendDue(): boolean {
  const m = S().mystery;
  return m.step === 2 && m.hasScale;
}

export function hearLegend(): void {
  advance(3);
}

/** Steamer + moon flower spot unlock after clue 3. */
export function legendKnown(): boolean {
  return S().mystery.step >= 3;
}

export function onDumplingsCooked(): void {
  if (S().mystery.step === 3) advance(4);
  if (S().mystery.step === 4) ensureRainTonight();
}

/** Can the offering happen right now at the dock? */
export function offeringReady(): { ok: boolean; reason?: 'notNight' | 'notRaining' | 'notGlowing' | 'noDumplings' | 'done' } {
  const s = S();
  if (s.mystery.step >= 5) return { ok: false, reason: 'done' };
  if (s.mystery.step < 4 && !s.dishes.some((d) => d.id === 'moon_dumplings')) return { ok: false, reason: 'noDumplings' };
  if (!s.dishes.some((d) => d.id === 'moon_dumplings')) return { ok: false, reason: 'noDumplings' };
  if (s.p < 1) return { ok: false, reason: 'notNight' };
  if (!s.weather.raining) return { ok: false, reason: 'notRaining' };
  if (s.contentment.value < MYSTERY.finaleContentment) return { ok: false, reason: 'notGlowing' };
  return { ok: true };
}

/** Finale finished: consume the dumplings, gift the lantern, stamp clue 5. */
export function completeFinale(): void {
  const s = S();
  const i = s.dishes.findIndex((d) => d.id === 'moon_dumplings');
  if (i >= 0) s.dishes.splice(i, 1);
  s.decor.guardian_lantern = (s.decor.guardian_lantern ?? 0) + 1;
  if (s.mystery.step < 4) {
    // Defensive: never skip stamps if dumplings came from an earlier trip.
    for (let n = s.mystery.step + 1; n <= 4; n++) recordClue(n);
    s.mystery.step = 4;
  }
  advance(5);
}

export function guardianMet(): boolean {
  return S().mystery.step >= 5;
}
