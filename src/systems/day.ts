/**
 * The soft clock and the day cycle (spec sections 3 and 5). Dawn to dusk takes
 * DAY_SECONDS of real time while the Camp scene is active and no overlay is
 * open; night holds until the player sleeps.
 */
import { bus } from '@/core/bus';
import { S, newDayLog, save, today, type DayLog } from '@/core/state';
import { DAY_SECONDS, labelFor } from '@/data/time';
import type { MomentId } from '@/data/ids';
import { resetForDawn } from './contentment';
import { dawnMoment } from './moments';
import { dawnCheck as mysteryDawn } from './mystery';
import { rollWeatherForDay, updateWeather } from './weather';

export const TRIP_DAYS = 7;

let paused = 0;
/** Pause the clock (menus, shop, journal, cooking). Returns an unpause fn. */
export function pauseClock(): () => void {
  paused++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    paused = Math.max(0, paused - 1);
  };
}
export function clockPaused(): boolean {
  return paused > 0;
}
export function resetClockPauses(): void {
  paused = 0;
}

/** Advance time. Returns events that happened this tick. */
export function tickClock(dt: number): { night?: boolean; label?: string } {
  const s = S();
  if (paused > 0) return {};
  const out: { night?: boolean; label?: string } = {};
  if (s.p < 1) {
    const prev = s.p;
    s.p = Math.min(1, s.p + dt / DAY_SECONDS);
    updateWeather(prev, s.p);
    const l0 = labelFor(prev);
    const l1 = labelFor(s.p);
    if (l0 !== l1) {
      out.label = l1;
      bus.emit('clock:phase', { label: l1, key: l1 });
    }
    if (s.p >= 1) {
      out.night = true;
      startNight();
    }
  } else {
    s.nightSecs += dt;
  }
  return out;
}

function startNight(): void {
  const s = S();
  s.nightSecs = 0;
  const d = today();
  d.rainyNight = s.weather.raining;
  if (s.weather.raining) s.weather.hadRainyNight = true;
  bus.emit('clock:night', { day: s.day });
  save('night');
}

/** Jump the clock (debug / tests). */
export function setProgress(p: number): void {
  const s = S();
  const prev = s.p;
  s.p = p;
  if (p >= 1 && prev < 1) startNight();
}

export interface SleepSummary {
  day: number;
  log: DayLog;
  /** Up to 3 highlight lines. */
  lines: string[];
  tripOver: boolean;
}

/** End the day. Call before showing the summary card. */
export function sleep(highlight: (log: DayLog) => string[]): SleepSummary {
  const s = S();
  const log = today();
  log.rainyNight = s.weather.raining;
  log.peak = Math.max(log.peak, s.contentment.value);
  if (s.weather.raining) s.weather.hadRainyNight = true;
  s.weather.lastNightRainy = s.weather.raining;
  const tripOver = s.day === TRIP_DAYS && !s.freePlay;
  return { day: s.day, log, lines: highlight(log).slice(0, 3), tripOver };
}

/** Begin the next day at dawn. Returns a dawn moment to play, if any. */
export function dawn(): MomentId | null {
  const s = S();
  s.day += 1;
  s.p = 0;
  s.nightSecs = 0;
  rollWeatherForDay(s.day);
  s.days.push(newDayLog(s.day, s.weather.today));
  resetForDawn();
  s.companion.seenToday = false;
  s.mystery.glowTonight = false;
  mysteryDawn();
  const m = dawnMoment();
  bus.emit('clock:dawn', { day: s.day });
  save('dawn');
  return m;
}

/** First-ever start of a trip: Day 1 weather etc. */
export function beginTrip(): void {
  const s = S();
  s.day = 1;
  s.p = 0.12;
  rollWeatherForDay(1);
  s.days = [newDayLog(1, s.weather.today)];
  resetForDawn();
}
