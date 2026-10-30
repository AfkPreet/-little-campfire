/**
 * Shared wind (spec section 8): constant gentle sway plus gusts every 8-15 s.
 * Everything that sways (grass, trees, lanterns, chimes, bunting) samples the
 * same wind so gusts travel through the scene together. Deterministic in time.
 */

export interface Wind {
  /** -1..1 gentle oscillation for per-object sway (add your own phase). */
  base: number;
  /** 0..1 gust strength right now (eases in and out). */
  gust: number;
  /** True on the frame a new gust begins (for chime sounds). */
  gustStart: boolean;
}

/** Gust schedule: a gust starts every 8-15 s and lasts ~3 s. */
function gustStartTimes(upTo: number): number[] {
  const times: number[] = [];
  let t = 4;
  let i = 0;
  while (t < upTo + 20) {
    times.push(t);
    // Pseudo-random 8-15 s spacing, deterministic.
    const r = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
    t += 8 + r * 7;
    i++;
  }
  return times;
}

let cache: number[] = [];
let lastGustIdx = -1;

/** @param time seconds */
export function windAt(time: number): Wind {
  if (!cache.length || cache[cache.length - 1] < time + 20) cache = gustStartTimes(time + 120);
  let gust = 0;
  let idx = -1;
  for (let i = cache.length - 1; i >= 0; i--) {
    const s = cache[i];
    if (s <= time) {
      const d = time - s;
      if (d < 3.2) {
        // Ease in over 0.8 s, out over 2.4 s.
        gust = d < 0.8 ? Math.sin((d / 0.8) * (Math.PI / 2)) : Math.cos(((d - 0.8) / 2.4) * (Math.PI / 2));
        idx = i;
      }
      break;
    }
  }
  const gustStart = idx >= 0 && idx !== lastGustIdx;
  if (idx >= 0) lastGustIdx = idx;
  const base = Math.sin(time * 0.9) * 0.6 + Math.sin(time * 0.37 + 1.3) * 0.4;
  return { base, gust: Math.max(0, gust), gustStart };
}
