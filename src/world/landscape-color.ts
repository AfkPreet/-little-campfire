/**
 * Integer colour helpers for per-light tint maths (no allocation, no strings).
 * Inputs are ResolvedLight ints or palette tokens converted with hexToInt.
 */

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Smoothstep from a to b. */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Linear blend of two 0xRRGGBB ints. */
export function lerpInt(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const r = ar + (((b >> 16) & 255) - ar) * k;
  const g = ag + (((b >> 8) & 255) - ag) * k;
  const bl = ab + ((b & 255) - ab) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

/** Multiply two 0xRRGGBB ints (like stacking two multiply tints). */
export function mulInt(a: number, b: number): number {
  const r = Math.round((((a >> 16) & 255) * ((b >> 16) & 255)) / 255);
  const g = Math.round((((a >> 8) & 255) * ((b >> 8) & 255)) / 255);
  const bl = Math.round(((a & 255) * (b & 255)) / 255);
  return (r << 16) | (g << 8) | bl;
}

/** Scale an int colour's brightness (k < 1 darkens). */
export function scaleInt(a: number, k: number): number {
  const r = Math.min(255, Math.round(((a >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((a >> 8) & 255) * k));
  const b = Math.min(255, Math.round((a & 255) * k));
  return (r << 16) | (g << 8) | b;
}
