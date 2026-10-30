/**
 * Shared geometry for the Junkiri Danda landscape (WORLD.md 3.2, 3.4).
 * Both the bakers (src/art/landscape*.ts) and the runtime (src/world/Landscape.ts)
 * read these, so window dots, waterfall threads, the cloud-spill saddle and the
 * steam curls always sit exactly on the baked art.
 *
 * Coordinates: every parallax band is authored in "band space": the screen x it
 * has when the camera is at scrollX 0. A band with factor f shows band x at
 * screen x = bandX - camX * f. Strips start at band x BX0 so a small negative
 * camera shake never reveals an edge. y is always screen y (720 high).
 */
import { fbm } from './kit';

/** Left edge of every band strip (band space). */
export const BX0 = -30;
/** Widest logical view we cover (wide phones). */
export const VIEW_MAX = 1600;

/** Strip width needed for a band with scroll factor f in a world of worldW. */
export function bandW(f: number, worldW = 2800): number {
  // Multiple of 96 so every strip chunk (and half-res rim chunk) is a whole
  // number of device pixels at ART_SCALE 2, 2.25 and 2.5: no seams.
  return Math.ceil((VIEW_MAX + Math.max(0, worldW - VIEW_MAX) * f + 60) / 96) * 96;
}

/** Parallax factors for the mist strips (WORLD 3.4). */
export const MIST_F = { sea: 0.085, ribbonHi: 0.18, ribbonLo: 0.35, breath: 0.58 };

/** Vertical extents of each baked band (screen y). */
export const BAND = {
  snow: { y0: 96, y1: 330 },
  far: { y0: 226, y1: 384 },
  mid: { y0: 262, y1: 436 },
  near: { y0: 296, y1: 462 },
  ground: { y0: 470, y1: 720 },
};

export const LAKE_Y = 452;

// ---------------------------------------------------------------------------
// F1 Snow Grannies: 5 rounded peaks. sl/sr are flank run per unit of rise
// (left ~0.9, right ~0.65), so widths land at 220-360 px.
// ---------------------------------------------------------------------------
export interface Peak {
  x: number;
  tip: number;
  sl: number;
  sr: number;
  back?: boolean;
  eldest?: boolean;
  seed: number;
}
/** Drawn in this order (back peaks first). */
export const PEAKS: Peak[] = [
  { x: 470, tip: 150, sl: 0.94, sr: 0.63, back: true, seed: 11 },
  { x: 1296, tip: 132, sl: 0.92, sr: 0.61, back: true, seed: 12 },
  { x: 276, tip: 172, sl: 0.98, sr: 0.68, seed: 13 },
  { x: 680, tip: 108, sl: 0.9, sr: 0.65, eldest: true, seed: 14 },
  { x: 864, tip: 166, sl: 0.84, sr: 0.7, seed: 15 },
];
/** Peak bases are hidden by the cloud sea; drawn down to here. */
export const PEAK_BASE = 336;
export const ELDEST = PEAKS[3];

// ---------------------------------------------------------------------------
// Ridges: sum of soft gaussian humps plus a little fbm wobble.
// ---------------------------------------------------------------------------
export type Hump = [x: number, h: number, w: number];

export function ridgeFn(base: number, humps: Hump[], wobble: number, seed: number): (x: number) => number {
  const n = fbm(seed, 3);
  return (x: number) => {
    let y = base;
    for (const [hx, h, w] of humps) {
      const d = (x - hx) / w;
      y -= h * Math.exp(-d * d);
    }
    return y + (n(x / 70) - 0.5) * wobble;
  };
}

/** F2 far ridges: back (lighter) and front ridgelines. */
export const FAR_BACK = ridgeFn(
  334,
  [
    [260, 38, 150],
    [1000, 46, 190],
    [1580, 40, 170],
  ],
  8,
  301,
);
export const FAR_FRONT = ridgeFn(
  348,
  [
    [80, 44, 140],
    [596, 84, 118],
    [884, 72, 128],
    [1420, 80, 150],
    [1760, 52, 140],
  ],
  8,
  302,
);
/** Saddle on the front far ridge where the cloud spill pours through. */
export const SPILL = { x: 742, y: FAR_FRONT(742) };

/** M mid ridge: one nearer ridge, few and broad. */
export const MID_RIDGE = ridgeFn(
  376,
  [
    [80, 34, 170],
    [330, 44, 170],
    [820, 74, 200],
    [1190, 34, 150],
    [1480, 56, 190],
    [1840, 42, 170],
  ],
  6,
  303,
);
/** Main hump of the mid ridge (tea terraces on its right flank, hill town on top). */
export const MID_MAIN = { x: 820 };

/** 4 tiny hill houses (centre x, wall bottom y) and roof accent token. */
export const HOUSES: { x: number; y: number; roof: string }[] = [
  { x: 788, y: MID_RIDGE(788) + 15, roof: 'tin-blue' },
  { x: 838, y: MID_RIDGE(838) + 13, roof: 'tin-rose' },
  { x: 872, y: MID_RIDGE(872) + 21, roof: 'butter' },
  { x: 914, y: MID_RIDGE(914) + 30, roof: 'tin-mint' },
];
/** 5 window dots (band space): the dusk necklace switches them on left to right. */
export const WINDOWS: { x: number; y: number }[] = [
  { x: HOUSES[0].x - 2, y: HOUSES[0].y - 4 },
  { x: HOUSES[1].x - 3, y: HOUSES[1].y - 4 },
  { x: HOUSES[1].x + 3, y: HOUSES[1].y - 4 },
  { x: HOUSES[2].x + 1, y: HOUSES[2].y - 4 },
  { x: HOUSES[3].x - 1, y: HOUSES[3].y - 4 },
];

/** Waterfall threads on the mid ridge: first 2 always, all 5 in rain. */
export const THREADS: { x: number; y0: number; y1: number }[] = [
  { x: 690, y0: MID_RIDGE(690) + 10, y1: 414 },
  { x: 1372, y0: MID_RIDGE(1372) + 12, y1: 416 },
  { x: 452, y0: MID_RIDGE(452) + 10, y1: 414 },
  { x: 1062, y0: MID_RIDGE(1062) + 14, y1: 418 },
  { x: 1618, y0: MID_RIDGE(1618) + 12, y1: 416 },
];

/** Steam-curl sources over the near canopy (band space), used in rain. */
export const STEAM: { x: number; y: number }[] = [
  { x: 260, y: 372 },
  { x: 720, y: 366 },
  { x: 1180, y: 380 },
  { x: 1620, y: 370 },
  { x: 2060, y: 376 },
];

/** Where the land meets the water at the shore (world space, ground band). */
export function shoreBackY(x: number): number {
  // Back rim of the clearing (500) dropping toward the water past x 1960.
  if (x <= 1960) return 500;
  const t = Math.min(1, (x - 1960) / 300);
  return 500 + (1 - Math.cos(t * Math.PI)) * 0.5 * 86;
}
/** Right edge of the land (world x) at screen y, below the shore. */
export function shoreRightX(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 584) / 136));
  return 2262 + t * t * 40;
}

/** Gurans constellation: centre (fraction of view width, y) and ring radius. */
export const GURANS = { fx: 0.7, y: 134, r: 18 };
