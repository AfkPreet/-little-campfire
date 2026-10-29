/**
 * Resolves the current lighting from day progress + weather by interpolating
 * the palette's lighting keys (spec section 8). Everything that relights
 * (landscape bands, actors, props, water, haze, glow strength) reads a
 * ResolvedLight; nothing hard-codes a time-of-day colour.
 */
import { LIGHT, RAIN, desaturate, hexToInt, mix, type LightKey, type LightingKey } from '@/palette';
import { LIGHT_ANCHORS, SUN_ARC } from '@/data/time';

export interface ResolvedLight {
  p: number;
  /** Dominant key for labels/logic. */
  key: LightKey;
  skyTop: number;
  horizon: number;
  /** Mid-sky colour (between top and horizon) for a 3-stop gradient. */
  skyMid: number;
  far: number;
  mid: number;
  near: number;
  ground: number;
  actor: number;
  haze: number;
  water: number;
  hazeAlpha: number;
  warmLight: number;
  vignette: number;
  stars: number;
  /** 0 day .. 1 full night. */
  night: number;
  /** Sun position 0..1 across the sky (x) and height 0..1 (y, 1 = top). alpha 0..1. */
  sun: { x: number; y: number; a: number };
  moon: { x: number; y: number; a: number };
  rain: number;
  mist: number;
  golden: number;
  /** Hex versions for canvas/CSS use. */
  hex: Record<'skyTop' | 'horizon' | 'skyMid' | 'far' | 'mid' | 'near' | 'ground' | 'actor' | 'haze' | 'water', string>;
}

type ColourField = 'skyTop' | 'horizon' | 'far' | 'mid' | 'near' | 'ground' | 'actor' | 'haze' | 'water';
const COLOUR_FIELDS: ColourField[] = ['skyTop', 'horizon', 'far', 'mid', 'near', 'ground', 'actor', 'haze', 'water'];
type NumField = 'hazeAlpha' | 'warmLight' | 'vignette' | 'stars';
const NUM_FIELDS: NumField[] = ['hazeAlpha', 'warmLight', 'vignette', 'stars'];

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function blendKeys(a: LightingKey, b: LightingKey, t: number): LightingKey {
  const out = { ...a };
  for (const f of COLOUR_FIELDS) out[f] = mix(a[f], b[f], t);
  for (const f of NUM_FIELDS) out[f] = a[f] + (b[f] - a[f]) * t;
  return out;
}

export function keyAt(p: number): { k: LightingKey; key: LightKey } {
  if (p >= 1) return { k: LIGHT.night, key: 'night' };
  const A = LIGHT_ANCHORS;
  for (let i = 0; i < A.length - 1; i++) {
    const a = A[i];
    const b = A[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = b.p === a.p ? 0 : easeInOutSine((p - a.p) / (b.p - a.p));
      return { k: blendKeys(LIGHT[a.key], LIGHT[b.key], t), key: t < 0.5 ? a.key : b.key };
    }
  }
  return { k: LIGHT.day, key: 'day' };
}

/**
 * @param p day progress (>= 1 is night)
 * @param rain 0..1 rain amount (eased in/out by the weather system)
 * @param mist 0..1 mist amount
 * @param golden 0..1 golden-evening boost (rare weather)
 */
export function lightAt(p: number, rain = 0, mist = 0, golden = 0): ResolvedLight {
  let { k, key } = keyAt(p);
  if (golden > 0 && p > 0.55 && p < 1) {
    // Golden evening: the golden key lingers longer and warmer.
    const g = Math.min(1, golden * Math.min(1, (p - 0.55) / 0.12)) * (p > 0.9 ? Math.max(0, 1 - (p - 0.9) / 0.1) : 1);
    k = blendKeys(k, LIGHT.golden, g * 0.75);
  }
  if (rain > 0) {
    const r = { ...k };
    for (const f of COLOUR_FIELDS) r[f] = desaturate(mix(k[f], RAIN.toward, RAIN.blend * rain), RAIN.desaturate * rain);
    r.hazeAlpha = Math.min(1, k.hazeAlpha + RAIN.hazeBoost * rain);
    r.stars = k.stars * (1 - rain);
    k = r;
  }
  if (mist > 0) {
    k = { ...k, hazeAlpha: Math.min(1, k.hazeAlpha + 0.4 * mist) };
  }
  const skyMid = mix(k.skyTop, k.horizon, 0.55);
  const night = p >= 1 ? 1 : p > 0.9 ? (p - 0.9) / 0.1 : p < 0.04 ? 0.25 * (1 - p / 0.04) : 0;
  // Sun travels a soft arc from rise to set.
  const sx = (p - SUN_ARC.rise) / (SUN_ARC.set - SUN_ARC.rise);
  const sunA = p >= 1 ? 0 : Math.max(0, Math.min(1, Math.min(sx * 8, (1 - sx) * 8))) * (1 - rain * 0.85);
  const sun = { x: Math.max(0, Math.min(1, sx)), y: Math.sin(Math.max(0, Math.min(1, sx)) * Math.PI), a: sunA };
  const moon = { x: 0.68, y: 0.78, a: p >= 1 ? 1 - rain * 0.8 : p > 0.9 ? ((p - 0.9) / 0.1) * 0.6 : 0 };

  const hex = {
    skyTop: k.skyTop,
    horizon: k.horizon,
    skyMid,
    far: k.far,
    mid: k.mid,
    near: k.near,
    ground: k.ground,
    actor: k.actor,
    haze: k.haze,
    water: k.water,
  };
  return {
    p,
    key,
    skyTop: hexToInt(k.skyTop),
    horizon: hexToInt(k.horizon),
    skyMid: hexToInt(skyMid),
    far: hexToInt(k.far),
    mid: hexToInt(k.mid),
    near: hexToInt(k.near),
    ground: hexToInt(k.ground),
    actor: hexToInt(k.actor),
    haze: hexToInt(k.haze),
    water: hexToInt(k.water),
    hazeAlpha: k.hazeAlpha,
    warmLight: k.warmLight,
    vignette: k.vignette,
    stars: k.stars,
    night,
    sun,
    moon,
    rain,
    mist,
    golden,
    hex,
  };
}

/** Light presets used by the style board and screenshots. */
export const LIGHT_PRESETS = {
  dawn: () => lightAt(0.03),
  day: () => lightAt(0.3),
  golden: () => lightAt(0.76),
  dusk: () => lightAt(0.92),
  night: () => lightAt(1),
  rain: () => lightAt(0.35, 1),
  rainNight: () => lightAt(1, 1),
  mist: () => lightAt(0.05, 0, 1),
};
