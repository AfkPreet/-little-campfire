import { SETTINGS_KEY } from '@/config';
import { bus } from '@/core/bus';

export interface Settings {
  music: number;
  sounds: number;
  ambience: number;
  reduceMotion: boolean;
  largeText: boolean;
}

const DEFAULTS: Settings = { music: 0.7, sounds: 0.8, ambience: 0.7, reduceMotion: false, largeText: false };

let settings: Settings = loadSettings();

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { ...DEFAULTS, reduceMotion: prefersReduced };
}

export function settingsGet(): Settings {
  return settings;
}

export function settingsSet(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  bus.emit('settings:changed', {});
}

export function reduceMotion(): boolean {
  return settings.reduceMotion;
}

/** Text scale multiplier for the Large text toggle. */
export function textScale(): number {
  return settings.largeText ? 1.18 : 1;
}

export function resetSettings(): void {
  settings = { ...DEFAULTS };
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
  bus.emit('settings:changed', {});
}
