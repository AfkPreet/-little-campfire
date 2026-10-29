/**
 * Camp layout in logical world px (side view, left -> right). The landscape
 * art and the Camp scene both read these, so moving something here moves it
 * everywhere. Height is always 720; the feet line is groundY.
 */
import type { ForageSpotId, TentId } from './ids';

export const CAMP = {
  worldW: 2800,
  /** Feet line for actors and props. */
  groundY: 612,
  /** Top of the ground band (grass edge). */
  groundTop: 548,
  /** Where the shore meets the water (x). Water extends to worldW. */
  shoreX: 2060,
  /** Water surface line (y) — the lake sits a little lower than the ground. */
  waterY: 600,
  /** Dock planks from shore out over the water. */
  dock: { x0: 2020, x1: 2380, y: 606 },
  /** Hero stands here to fish from the dock end, and from the shore. */
  fishFrom: [{ x: 2340 }, { x: 2040 }],
  /** Cast range on the water (x) from a fishing spot. */
  castRange: { min: 90, max: 380 },
  /** Path to the shop: walking past this x leaves for the shop. */
  shopExitX: 70,
  heroStartX: 520,
  /** Three flat tent spots (glowing dotted outlines before pitching). */
  tentSpots: [{ x: 640 }, { x: 860 }, { x: 1080 }],
  /** Pegs relative to the tent centre. */
  pegs: [{ dx: -92 }, { dx: -40 }, { dx: 40 }, { dx: 92 }],
  fire: { x: 1300 },
  /** Forage spot x positions. */
  forage: {
    berry_a: { x: 300 },
    log_a: { x: 430 },
    herb_patch: { x: 1500 },
    nut_tree: { x: 1640 },
    berry_b: { x: 1790 },
    log_b: { x: 1920 },
    moon_spot: { x: 2000 },
  } as Record<ForageSpotId, { x: number }>,
  /** Hang points on each tent type, relative to tent centre / groundY. */
  tentHang: {
    leaf_tent: [
      { dx: -70, dy: -92 },
      { dx: 70, dy: -92 },
    ],
    dome_tent: [
      { dx: -96, dy: -96 },
      { dx: -40, dy: -140 },
      { dx: 40, dy: -140 },
      { dx: 96, dy: -96 },
    ],
    cabin_kit: [
      { dx: -110, dy: -120 },
      { dx: -60, dy: -168 },
      { dx: 0, dy: -190 },
      { dx: 60, dy: -168 },
      { dx: 110, dy: -120 },
      { dx: 120, dy: -60 },
    ],
  } as Record<TentId, { dx: number; dy: number }[]>,
  /** Hang points on branches. */
  branchHang: [
    { x: 1180, y: 380 },
    { x: 1440, y: 360 },
  ],
  /** Ground decor points ringing the clearing. */
  groundPoints: [{ x: 560 }, { x: 760 }, { x: 960 }, { x: 1160 }, { x: 1230, dy: 8 }, { x: 1380 }] as { x: number; dy?: number }[],
  /** Hammock between two trees. */
  twoTree: { x: 1560, y: 520, left: 1480, right: 1640 },
  /** String-light spans between two hang points. */
  spans: [
    ['branch:0', 'branch:1'],
    ['tent:0', 'branch:0'],
  ] as [string, string][],
  /** Where the companion's bush is. */
  companionBush: { x: 1420 },
  /** Shore sparkle for the scale. */
  scaleSpot: { x: 2000 },
};

/** Parallax scroll factors (spec: ~0.1, 0.25, 0.5, 1.0, foreground 1.3). */
export const PARALLAX = { sky: 0, far: 0.1, mid: 0.25, near: 0.5, ground: 1, fg: 1.3 };
