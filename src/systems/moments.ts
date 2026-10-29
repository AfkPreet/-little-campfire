/**
 * Rare moments (spec sections 5-6). Checked at dawn and at night. Each plays a
 * chime, shows a handwritten banner, stamps the journal and gives +8.
 */
import { bus } from '@/core/bus';
import { S, rng, today } from '@/core/state';
import { CONTENTMENT, DECOR } from '@/data/decor';
import type { MomentId } from '@/data/ids';
import { MOMENTS, MOMENT_CHANCE } from '@/data/moments';
import { WORLD } from '@/data/world';
import { fmt } from '@/ui/text';
import { gain } from './contentment';
import { recordMoment } from './journal';

export function bannerFor(id: MomentId): string {
  return fmt(MOMENTS[id].banner, { water: WORLD.water });
}

/** Fire a moment (visuals are played by whoever listens to 'moment'). */
export function triggerMoment(id: MomentId): void {
  const d = today();
  if (!d.moments.includes(id)) d.moments.push(id);
  recordMoment(id);
  gain(CONTENTMENT.moment, 'moment');
  bus.emit('moment', { id });
  bus.emit('banner', { text: bannerFor(id) });
  bus.emit('sfx', { id: 'discovery' });
}

/** Dawn checks: returns the moment to play at dawn, if any. */
export function dawnMoment(): MomentId | null {
  const s = S();
  const r = rng('moments');
  if (s.weather.lastNightRainy && r.chance(MOMENT_CHANCE.rainbow)) return 'rainbow';
  if (s.weather.today === 'mist' && !s.journal.moments.misty_sunrise) return 'misty_sunrise';
  return null;
}

function telescopeBonus(): number {
  return S().camp.placed.reduce((b, p) => b + (DECOR[p.id].shootingStarBonus ?? 0), 0);
}

function isBlissful(): boolean {
  const c = S().contentment;
  return c.value >= 100 || c.blissfulToday;
}

/**
 * Night check, called once when night begins (and again if blissful is reached
 * later that night). Returns the moment to schedule, if any.
 */
export function nightMoment(): MomentId | null {
  const s = S();
  const key = `nightMoment${s.day}`;
  if (s.flags[key]) return null;
  const raining = s.weather.raining;
  if (isBlissful()) {
    s.flags[key] = true;
    return raining ? 'moonbow' : 'shooting_star';
  }
  if (raining) return null;
  const rollKey = `nightRoll${s.day}`;
  if (s.flags[rollKey]) return null;
  s.flags[rollKey] = true;
  if (rng('moments').chance(MOMENT_CHANCE.shootingStar + telescopeBonus())) {
    s.flags[key] = true;
    return 'shooting_star';
  }
  return null;
}

/** Firefly swirl: clear night, after 20 s sitting by the fire, 25% (once a night). */
export function fireflyCheck(sitSecs: number): boolean {
  const s = S();
  if (s.p < 1 || s.weather.raining || sitSecs < MOMENT_CHANCE.fireflySwirlSitSecs) return false;
  const key = `firefly${s.day}`;
  if (s.flags[key]) return false;
  s.flags[key] = true;
  return rng('moments').chance(MOMENT_CHANCE.fireflySwirl);
}
