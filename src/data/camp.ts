/**
 * Camp layout in logical world px (side view, left -> right), from
 * docs/WORLD.md section 3.2 (Junkiri Danda). The landscape art and the Camp
 * scene both read these, so moving something here moves it everywhere.
 * Height is always 720.
 */
import type { ForageSpotId, TentId } from './ids';

export const CAMP = {
  worldW: 2800,
  /** Walk line: feet of actors and props. */
  groundY: 585,
  /** Back rim of the clearing's grass (top of the ground band). */
  groundTop: 500,
  /** Far-shore waterline: the lake horizon behind the clearing. */
  lakeHorizon: 452,
  /** Foreground band (parallax 1.3). */
  fgTop: 610,
  /** Where grass gives way to pebbles; open water begins past the shore. */
  shoreX: 1990,
  /** Open-water surface line at the dock. */
  waterY: 590,
  /** Water is castable from this x to the world's right edge. */
  waterX: 2200,
  /** Dock: 5 rounded planks on 3 round posts. */
  dock: { x0: 2240, x1: 2520, y: 575, posts: [2290, 2400, 2510] },
  /** Hero stands here to fish: the dock end, and the shore. */
  fishFrom: { dock: { x: 2500, y: 575 }, shore: { x: 2205, y: 585 } },
  /** Cast distance (logical px to the right of the fishing spot). */
  castRange: { dock: { min: 70, max: 280 }, shore: { min: 40, max: 120 } },
  /** Shop path: corner of Boju's store at x 30-150; walking past shopExitX leaves. */
  shopCorner: { x0: 30, x1: 150 },
  shopExitX: 60,
  /** Stone slabs and bamboo clumps on the path. */
  slabs: [220, 330, 440],
  bamboo: [200, 480],
  /** Clearing extent. */
  clearing: { x0: 520, x1: 1990 },
  heroStartX: 1240,
  /** Where Tuki appears when arriving from the shop. */
  heroArriveX: 240,
  /** Three flat tent spots (glowing dotted outlines before pitching). B is the default. */
  tentSpots: [{ x: 780 }, { x: 1320 }, { x: 1700 }],
  defaultTentSpot: 1,
  /** Pegs relative to the tent centre. */
  pegs: [{ dx: -92 }, { dx: -40 }, { dx: 40 }, { dx: 92 }],
  fire: { x: 1160 },
  /** Kopila peeks from the Bud Bush on the back rim behind the fire. */
  budBush: { x: 1060, y: 500 },
  companionBush: { x: 1060 },
  /** Forage spot x positions. */
  forage: {
    nut_tree: { x: 560 },
    herb_patch: { x: 660 },
    berry_a: { x: 930 },
    log_a: { x: 1020 },
    berry_b: { x: 1470 },
    log_b: { x: 1560 },
    moon_spot: { x: 2120 },
  } as Record<ForageSpotId, { x: number }>,
  /** Hang points on each tent type, relative to tent centre / groundY. */
  tentHang: {
    leaf_tent: [
      { dx: -62, dy: -78 },
      { dx: 62, dy: -78 },
    ],
    dome_tent: [
      { dx: -88, dy: -84 },
      { dx: -36, dy: -128 },
      { dx: 36, dy: -128 },
      { dx: 88, dy: -84 },
    ],
    cabin_kit: [
      { dx: -104, dy: -112 },
      { dx: -56, dy: -160 },
      { dx: 0, dy: -184 },
      { dx: 56, dy: -160 },
      { dx: 104, dy: -112 },
      { dx: 118, dy: -56 },
    ],
  } as Record<TentId, { dx: number; dy: number }[]>,
  /** Two extra hang points on the hammock trees' low branches. */
  branchHang: [
    { x: 1868, y: 398 },
    { x: 1962, y: 392 },
  ],
  /** Ground decor points ringing the clearing (dy: a little in front of the walk line). */
  groundPoints: [
    { x: 1100, dy: 10 },
    { x: 1232, dy: 14 },
    { x: 880, dy: 18 },
    { x: 1640, dy: 12 },
    { x: 1780, dy: 16 },
    { x: 610, dy: 20 },
  ] as { x: number; dy?: number }[],
  /** Hammock between the two old rhododendron trunks. */
  twoTree: { x: 1915, y: 520, left: 1840, right: 1990 },
  /** String-light spans between two hang points. */
  spans: [
    ['branch:0', 'branch:1'],
    ['tent:0', 'tent:1'],
  ] as [string, string][],
  /** Moon Scale sparkle on the shore pebbles (clue 2). */
  scaleSpot: { x: 2180 },
  /** Kuhiro rises here, facing left toward the dock. */
  guardian: { x: 2660 },
  /** First-night glow, far out. */
  glow: { x: 2700, y: 470 },
};

/** Parallax scroll factors (WORLD 3.4): snow 0.07, far 0.1, mid 0.25, near 0.5, ground 1, fg 1.3. */
export const PARALLAX = { sky: 0, snow: 0.07, far: 0.1, mid: 0.25, near: 0.5, ground: 1, fg: 1.3 };
