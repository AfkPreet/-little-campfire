/**
 * The single source of truth for colour. Every visual in the game takes its
 * colours from here (section 8 of docs/SPEC.md). Setting accents live in
 * ACCENTS and must stay at HSB saturation <= 40% (ember excepted); each one is
 * logged in DECISIONS.md.
 */

export const P = {
  cream: '#F6EFE6',
  butter: '#F2DFA7',
  peach: '#F2B8A0',
  rose: '#D9A0A6',
  blush: '#EFA3A8',
  lavender: '#B9AACB',
  powder: '#A9C3D9',
  sage: '#A8BFA0',
  moss: '#7E9C82',
  bark: '#8C6F5E',
  ink: '#4A4250',
  ember: '#F29E6B',
  glow: '#FFD59A',
} as const;

export type Token = keyof typeof P;

/**
 * Setting accents from docs/WORLD.md section 8 (Junkiri Danda). Keep them
 * muted: HSB saturation <= 40%. `checkAccents()` enforces this in dev.
 */
export const ACCENTS = {
  // World and sky
  snow: '#EEF0F4',
  'snow-shade': '#C8C5DB',
  alpenglow: '#F2C4B8',
  'moon-snow': '#C9D2E6',
  'ridge-far': '#A9B0CC',
  'ridge-near': '#8F9DB8',
  'cloud-sea': '#E4E3EE',
  'cloud-spill': '#ECEBF2',
  'tea-green': '#A9C29A',
  'tin-blue': '#A3B8CC',
  'tin-rose': '#D4A9A6',
  'tin-mint': '#A8C9BB',
  'water-thread': '#E9EEF0',
  // Water
  'lake-jade': '#93B5B3',
  'lake-deep': '#6E8A99',
  'lake-glow': '#CFE6E2',
  reed: '#C9C29E',
  // Plants, ground and forage
  dhupi: '#6F8E86',
  malingo: '#A3B88F',
  gurans: '#D98F96',
  'gurans-deep': '#C07A84',
  'moon-gurans': '#F3EEF5',
  stone: '#B9B1B4',
  'stone-shade': '#9C9298',
  pebble: '#CFC6C3',
  ainselu: '#E6C392',
  katus: '#A88870',
  chyau: '#D7B7A0',
  sisnu: '#9DB38F',
  // Kitchen, shop and UI
  'shop-wood': '#C9AE92',
  copper: '#C99A7E',
  'copper-line': '#9E7A64',
  'tawa-iron': '#6B6070',
  steamer: '#C9CDD3',
  lokta: '#EFE4D2',
  bell: '#D9BE8C',
  'cream-line': '#D8C9B8',
  // Tuki
  oat: '#D8C3A5',
  'oat-shade': '#C4AC8C',
  'oat-line': '#A48B6E',
  doko: '#A88A6A',
  'doko-band': '#C2A483',
  'doko-line': '#8A7058',
  jute: '#D9C49A',
  'ghum-cane': '#C9B283',
  'ghum-leaf': '#A3B58F',
  'ghum-line': '#7F9271',
  // Boju
  yak: '#9C8580',
  'yak-shade': '#87716E',
  'yak-line': '#6F5D5B',
  'yak-face': '#F1E6DA',
  horn: '#EADFC8',
  'horn-line': '#BFB197',
  'wool-ball': '#D9B3B8',
  // Kopila
  pango: '#BFA09A',
  'pango-light': '#D9C1B8',
  'pango-line': '#9A7D78',
  'pango-face': '#F2DCD3',
  // Kuhiro
  mistfish: '#B8C6DE',
  'mist-lavender': '#A99EC8',
  'mistfish-line': '#8F8AAE',
  moonmilk: '#EEF1F2',
  'fish-glow': '#DCE8F5',
  'fish-glow-edge': '#C9D9EE',
  'scale-glow': '#E9EEF7',
  // Fish
  garra: '#B5B6A3',
  'bubble-barb': '#C9C0AE',
  asala: '#C3CBD3',
  danio: '#B9AACB',
  'danio-bar': '#978BB3',
  loach: '#A7B29A',
  glowfin: '#7E8AA8',
  katle: '#E7C9C6',
  mahseer: '#E6CF94',
} as Record<string, string>;

/** Shorthand for accents: A['snow-shade']. */
export const A = ACCENTS;

/** Any palette colour by name: base token or accent. */
export function col(name: string): string {
  const v = (P as Record<string, string>)[name] ?? ACCENTS[name];
  if (!v) throw new Error(`palette: unknown colour "${name}"`);
  return v;
}

// ---------------------------------------------------------------------------
// Lighting keys (section 8). Interpolated smoothly by fx/lighting.ts.
// ---------------------------------------------------------------------------

export type LightKey = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

export interface LightingKey {
  skyTop: string;
  horizon: string;
  /** Multiply tint applied to world layers, by depth band (far -> near). */
  far: string;
  mid: string;
  near: string;
  ground: string;
  /** Tint for characters and props standing on the ground band. */
  actor: string;
  /** Haze/mist colour laid between bands (usually near the horizon colour). */
  haze: string;
  /** Haze strength multiplier 0..1. */
  hazeAlpha: number;
  /** Water base tint. */
  water: string;
  /** Strength of warm light pools (fire, lanterns) 0..1. */
  warmLight: number;
  /** Vignette strength 0..1. */
  vignette: number;
  /** Star visibility 0..1. */
  stars: number;
}

export const LIGHT: Record<LightKey, LightingKey> = {
  dawn: {
    skyTop: '#C9B6D6',
    horizon: '#F4C9B8',
    far: '#F2ECFA',
    mid: '#FFFFFF',
    near: '#FCF6FC',
    ground: '#EADCD9',
    actor: '#F4E6E4',
    haze: '#F4C9B8',
    hazeAlpha: 0.75,
    water: '#C7B9D5',
    warmLight: 0.35,
    vignette: 0.12,
    stars: 0.08,
  },
  day: {
    skyTop: '#A9C9E3',
    horizon: '#E8F0EC',
    far: '#E8E8F5',
    mid: '#FAFFF0',
    near: '#F3F7F3',
    ground: '#FFFFFF',
    actor: '#FFFFFF',
    haze: '#E8F0EC',
    hazeAlpha: 0.55,
    water: '#F2FAFA',
    warmLight: 0.0,
    vignette: 0.06,
    stars: 0,
  },
  golden: {
    skyTop: '#E8C3A0',
    horizon: '#F6E3B4',
    far: '#FFFADF',
    mid: '#FFFCE0',
    near: '#FFF4E0',
    ground: '#F8E2C8',
    actor: '#FFF0DC',
    haze: '#F6E3B4',
    hazeAlpha: 0.6,
    water: '#E5C9A9',
    warmLight: 0.25,
    vignette: 0.1,
    stars: 0,
  },
  dusk: {
    skyTop: '#8E86B5',
    horizon: '#E9A9A6',
    far: '#D2C7E9',
    mid: '#F6E5FA',
    near: '#B1AED8',
    ground: '#B7A6C0',
    actor: '#D8C6D6',
    haze: '#D9A3B0',
    hazeAlpha: 0.6,
    water: '#9C8FB9',
    warmLight: 0.7,
    vignette: 0.18,
    stars: 0.45,
  },
  night: {
    skyTop: '#2F3558',
    horizon: '#5B5E86',
    far: '#5F6586',
    mid: '#8A95A0',
    near: '#7A7BAC',
    ground: '#62679A',
    actor: '#8A8DBA',
    haze: '#5B5E86',
    hazeAlpha: 0.5,
    water: '#4E5A7A',
    warmLight: 1.0,
    vignette: 0.32,
    stars: 1,
  },
};

/** Rain overlay: blend 40% toward this, desaturate 30%, thicker mist, cooler. */
export const RAIN = {
  toward: '#9AA6B8',
  blend: 0.4,
  desaturate: 0.3,
  hazeBoost: 0.35,
};

// ---------------------------------------------------------------------------
// Colour helpers. All return '#RRGGBB' strings unless named *Int.
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function hexToInt(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (r << 16) | (g << 8) | b;
}

export function intToHex(n: number): string {
  return rgbToHex((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** Linear blend a -> b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function mixInt(a: string, b: string, t: number): number {
  return hexToInt(mix(a, b, t));
}

/** Darker shade of a fill, for outlines (never black). amount 0..1. */
export function shade(hex: string, amount = 0.22): string {
  const [h, s, v] = rgbToHsv(...hexToRgb(hex));
  // Outlines: a touch more saturated and darker, hue-shifted slightly toward ink.
  const [ih] = rgbToHsv(...hexToRgb(P.ink));
  const hueShift = lerpHue(h, ih, 0.12);
  const [r, g, b] = hsvToRgb(hueShift, Math.min(1, s + amount * 0.35), Math.max(0.18, v * (1 - amount)));
  return rgbToHex(r, g, b);
}

/** Lighter tint of a colour toward cream. */
export function tint(hex: string, amount = 0.3): string {
  return mix(hex, P.cream, amount);
}

/** CSS rgba() string for canvas drawing. */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Desaturate toward luminance-equivalent grey by amount 0..1. */
export function desaturate(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return rgbToHex(r + (l - r) * amount, g + (l - g) * amount, b + (l - b) * amount);
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function lerpHue(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (a + d * t + 360) % 360;
}

export function saturationOf(hex: string): number {
  return rgbToHsv(...hexToRgb(hex))[1];
}

/** Dev check: accents must be muted (<= 40% HSB saturation). */
export function checkAccents(): string[] {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(ACCENTS)) {
    if (saturationOf(v) > 0.405) bad.push(`${k} ${v} sat=${saturationOf(v).toFixed(2)}`);
  }
  return bad;
}
