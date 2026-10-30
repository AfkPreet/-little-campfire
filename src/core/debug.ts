/**
 * Debug hooks (dev builds, or ?debug=1): ?scene=, ?time=, ?weather=, ?day=,
 * ?seed=, ?state=fresh|midtrip|finale, a free-money button, and
 * window.__game helpers so scripts can drive fishing, cooking and sleep.
 */

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const DEBUG = import.meta.env.DEV || params.get('debug') === '1';

export function param(name: string): string | null {
  return DEBUG || name === 'debug' ? params.get(name) : null;
}

/** Params that are also honoured in production for screenshots (?shot=1 hides hint UI). */
export function anyParam(name: string): string | null {
  return params.get(name);
}

type Helper = (...args: never[]) => unknown;
const helpers: Record<string, Helper> = {};

export function registerDebug(name: string, fn: Helper): void {
  helpers[name] = fn;
  if (DEBUG) {
    const w = window as unknown as { __game: Record<string, Helper> };
    w.__game = w.__game || {};
    w.__game[name] = fn;
  }
}

export function debugHelpers(): Record<string, Helper> {
  return helpers;
}

/**
 * Screenshot/test readiness: scripts wait for window.__shotReady === true.
 * Scenes call markReady() once their first full frame is settled.
 */
export function markReady(scene: { time: { delayedCall: (ms: number, fn: () => void) => unknown } }, delayMs = 400): void {
  const w = window as unknown as { __shotReady?: boolean; __readyScene?: string };
  w.__shotReady = false;
  scene.time.delayedCall(delayMs, () => {
    w.__shotReady = true;
  });
}

export function clearReady(): void {
  (window as unknown as { __shotReady?: boolean }).__shotReady = false;
}

/** True when the page was opened straight into a scene (?scene=...), e.g. for screenshots. */
export function directLaunch(): boolean {
  return !!param('scene');
}
