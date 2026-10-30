/**
 * Shared geometry for the camp props (tents, fire, forage spots, the Moon
 * Scale and placed decor). The art modules (src/art/props-*.ts) bake with
 * `ptex()`, which records each texture's anchor (the prop's feet / hang
 * point) so the world code (src/world/props*.ts) can place images with
 * `pimg()` in prop-local coordinates: origin at the feet, y negative upward.
 * No bake() here: this module only holds numbers and two tiny helpers.
 */
import type Phaser from 'phaser';
import { artObj, type Baker, type Ctx } from './kit';
import type { TentId } from '@/data/ids';

export interface Anchor {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

const ANCHORS = new Map<string, Anchor>();

/** Bake a texture whose draw works in prop-local coords (origin = anchor). */
export function ptex(b: Baker, key: string, w: number, h: number, ax: number, ay: number, draw: (ctx: Ctx) => void): void {
  ANCHORS.set(key, { w, h, ax, ay });
  b.tex(key, w, h, (ctx) => {
    ctx.translate(ax, ay);
    draw(ctx);
  });
}

export function anchorOf(key: string): Anchor | undefined {
  return ANCHORS.get(key);
}

/** Create (not add) an Image of a ptex texture, origin at its anchor. */
export function pimg(scene: Phaser.Scene, key: string, x = 0, y = 0): Phaser.GameObjects.Image {
  const img = artObj(scene, x, y, key);
  const a = ANCHORS.get(key);
  if (a) img.setOrigin(a.ax / a.w, a.ay / a.h);
  return img;
}

// ---------------------------------------------------------------------------
// Tents (WORLD 7.1). Hang points come from CAMP.tentHang; these numbers are
// the art that has to agree with them.
// ---------------------------------------------------------------------------

export interface TentGeo {
  /** Texture size + anchor (feet at ground centre). */
  w: number;
  h: number;
  /** Visual half-width of the standing tent and its top (for hit areas). */
  half: number;
  top: number;
  /** Doorway centre offset + size (doorPoint, glow placement). */
  door: { dx: number; w: number; h: number };
  /** Rain drips fall from this edge. */
  drip: { x0: number; x1: number; dy: number };
  /** Spot outline half-width. */
  spot: number;
}

export const TENT_GEO: Record<TentId, TentGeo> = {
  leaf_tent: { w: 212, h: 156, half: 78, top: 146, door: { dx: 0, w: 52, h: 100 }, drip: { x0: -72, x1: 72, dy: -30 }, spot: 86 },
  dome_tent: { w: 216, h: 166, half: 98, top: 152, door: { dx: 0, w: 58, h: 84 }, drip: { x0: -90, x1: 90, dy: -92 }, spot: 104 },
  cabin_kit: { w: 268, h: 226, half: 124, top: 212, door: { dx: -46, w: 44, h: 72 }, drip: { x0: -124, x1: 124, dy: -100 }, spot: 128 },
};

/** Flat (unfolded) texture size: same for every type. */
export const FLAT = { w: 236, h: 46, ax: 118, ay: 30 };

// ---------------------------------------------------------------------------
// Fire (WORLD 3.2): ring of 7 round stones + 3 crossed logs, ~110 wide.
// ---------------------------------------------------------------------------

export const FIRE = {
  w: 128,
  h: 64,
  ax: 64,
  ay: 50,
  ring: { cy: -10, rx: 46, ry: 11 },
  /** Flame base (prop-local). */
  flameY: -16,
};

// ---------------------------------------------------------------------------
// Forage spots (WORLD 7.4). Item points are prop-local (for pickAnim).
// ---------------------------------------------------------------------------

export const KATUS_BURRS: [number, number][] = [
  [-38, -82],
  [-12, -112],
  [18, -96],
  [40, -80],
  [-6, -74],
  [24, -122],
];

export const AINSELU_BERRIES: [number, number][] = [
  [-34, -30],
  [-10, -50],
  [14, -30],
  [34, -42],
  [-2, -24],
];

export const CHYAU_CAPS3: [number, number, number][] = [
  [-26, -32, 1],
  [2, -36, 1.12],
  [28, -31, 0.95],
];
export const CHYAU_CAPS6: [number, number, number][] = [
  ...CHYAU_CAPS3,
  [-42, -27, 0.72],
  [15, -33, 0.7],
  [44, -26, 0.74],
];

export const SISNU_TOPS: [number, number][] = [
  [-16, -40],
  [0, -50],
  [17, -42],
];

export const MOON_TRUSS: [number, number] = [4, -78];

// ---------------------------------------------------------------------------
// Decor sizes (WORLD 7.6). Hit rects are prop-local: [x, y, w, h].
// ---------------------------------------------------------------------------

export const HAMMOCK = { span: 150 };
