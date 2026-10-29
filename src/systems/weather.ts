/**
 * Weather (spec section 5): rolled at dawn, lasts through the night.
 * Clear 50 / Light rain 30 / Misty morning 15 / Golden evening 5; rain may
 * gently start or stop mid-day (10%). Guarantees: Day 1 clear; Night 4 rains
 * if no rainy night yet; after the dumplings are cooked, the next night rains.
 */
import { bus } from '@/core/bus';
import { S, rng } from '@/core/state';
import type { WeatherKind } from '@/data/ids';
import { WEATHER_RULES, WEATHER_TABLE } from '@/data/moments';
import { DUSK, MIST_BURN_OFF } from '@/data/time';

export function rollWeatherForDay(day: number): void {
  const s = S();
  const w = s.weather;
  const r = rng('weather');
  const kind: WeatherKind = day === 1 ? 'clear' : r.weighted(WEATHER_TABLE, (e) => e.weight).kind;
  w.today = kind;
  w.raining = kind === 'rain';
  w.change = null;
  w.rainAtDusk = false;
  w.mist = kind === 'mist' ? 1 : 0;

  if (day > 1 && r.chance(WEATHER_RULES.midDayChange)) {
    const [a, b] = WEATHER_RULES.changeWindow;
    w.change = { p: r.range(a, b), to: !w.raining };
  }
  if (day === 1) w.change = null;

  // Guarantees.
  const needNight4 = day === WEATHER_RULES.guaranteeRainByNight && !w.hadRainyNight;
  if (needNight4 || w.forceRainNext) {
    if (!w.raining) w.rainAtDusk = true;
    // Never let a scheduled stop cancel the guaranteed rainy night.
    if (w.change && w.change.to === false) w.change = null;
    w.forceRainNext = false;
  }
}

/** Ensure tonight rains (used by the mystery guarantee mid-day). */
export function ensureRainTonight(): void {
  const s = S();
  const w = s.weather;
  if (s.p >= 1) {
    // Already night: next night instead.
    if (!w.raining) w.forceRainNext = true;
    return;
  }
  if (w.raining && !(w.change && w.change.to === false)) return;
  if (w.change && w.change.to === false) w.change = null;
  if (!w.raining) w.rainAtDusk = true;
}

/**
 * Advance weather with day progress. Returns true if rain toggled.
 */
export function updateWeather(prevP: number, p: number): boolean {
  const w = S().weather;
  let toggled = false;
  if (w.change && prevP < w.change.p && p >= w.change.p) {
    if (w.raining !== w.change.to) {
      w.raining = w.change.to;
      toggled = true;
    }
    w.change = null;
  }
  if (w.rainAtDusk && prevP < DUSK.from && p >= DUSK.from) {
    if (!w.raining) {
      w.raining = true;
      toggled = true;
    }
    w.rainAtDusk = false;
  }
  // Mist burns off by midday.
  if (w.today === 'mist') {
    const t = (p - MIST_BURN_OFF.from) / (MIST_BURN_OFF.to - MIST_BURN_OFF.from);
    w.mist = Math.max(0, Math.min(1, 1 - t));
  }
  if (toggled) bus.emit('weather:rain', { raining: w.raining });
  return toggled;
}

/** Rain amount the renderer should target (thin mist also with rain). */
export function mistAmount(): number {
  const w = S().weather;
  return Math.max(w.mist, w.raining ? 0.35 : 0);
}

export function isRaining(): boolean {
  return S().weather.raining;
}

export function isGoldenEvening(): boolean {
  return S().weather.today === 'golden';
}
