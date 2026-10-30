/**
 * Kopila the pangolin pup + the Bud Bush (docs/WORLD.md 5.3, 3.2).
 * Texture namespace: "kopila_".
 *
 * Every part is drawn in CHARACTER coordinates (1x px, origin between the
 * feet, y negative up, facing right) inside a window (KW). The Rig places each
 * part at its pivot with kOrigin(), so geometry stays in one place.
 */
import { Baker, Ctx, blush, ellipsePath, eye, eyeClosed, eyeHappy, mouth, rGrad, smoothClosed, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

// ---------------------------------------------------------------------------
// Colours (WORLD 8: pango, pango-light, pango-line, pango-face)
// ---------------------------------------------------------------------------
const PANGO = A['pango'];
const PLIGHT = A['pango-light'];
const PLINE = A['pango-line'];
const PFACE = A['pango-face'];
const FACE_LINE = mix(PFACE, PLINE, 0.55);

// ---------------------------------------------------------------------------
// Geometry (WORLD 5.3, char coords)
// ---------------------------------------------------------------------------
export const KG = {
  body: { x: 0, y: -14, rx: 16, ry: 14 },
  head: { x: 3, y: -33, r: 17 },
  /** Head pivot (neck). */
  neck: { x: 3, y: -19 },
  face: { x: 8.5, y: -30, rx: 11, ry: 9 },
  snout: { x: 17.5, y: -29, rx: 5, ry: 4 },
  nose: { x: 21.4, y: -29.6, r: 1.6 },
  eyes: [
    { x: 1.2, y: -34.5, rx: 3.6, ry: 4.6 },
    { x: 11.6, y: -34.5, rx: 3.3, ry: 4.4 },
  ],
  blush: [
    { x: -2, y: -27.5, rx: 3.6, ry: 2.1 },
    { x: 13.4, y: -26.4, rx: 3.2, ry: 1.9 },
  ],
  mouth: { x: 16.2, y: -24.6 },
  legs: [
    { x: -6, y: -1, rx: 4.4, ry: 3.6 },
    { x: 8, y: -1, rx: 4.4, ry: 3.6 },
  ],
  arm: { x: 12.5, y: -15.5, rx: 3.3, ry: 3.6 },
  tailRoot: { x: -12, y: -8 },
  tailDangleRoot: { x: -9, y: -3 },
  /** Ball (curled): 34 px circle sitting on the ground. */
  ball: { x: 0, y: -17, r: 17 },
  /** Where the single eye opens in the ball's gap. */
  ballEye: { x: 6.2, y: -20.6 },
} as const;

export interface Win {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** Texture windows in char coords. Key = name, texture key = 'kopila_' + name. */
export const KW: Record<string, Win> = {
  body: { x0: -20, y0: -32, w: 40, h: 36 },
  rowBack: { x0: -21, y0: -27, w: 32, h: 18 },
  rowHip: { x0: -23, y0: -17, w: 36, h: 18 },
  head: { x0: -17, y0: -53, w: 44, h: 40 },
  crown: { x0: -19, y0: -59, w: 34, h: 26 },
  eyes: { x0: -5, y0: -42, w: 22, h: 14 },
  eyesClosed: { x0: -5, y0: -42, w: 22, h: 14 },
  eyesHappy: { x0: -5, y0: -42, w: 22, h: 14 },
  eyesRound: { x0: -5, y0: -42, w: 22, h: 14 },
  blush: { x0: -7, y0: -31, w: 26, h: 9 },
  mouth: { x0: 12, y0: -28, w: 8, h: 7 },
  mouthO: { x0: 12, y0: -28, w: 8, h: 7 },
  leg: { x0: -6, y0: -6, w: 12, h: 10 },
  arm: { x0: 7, y0: -21, w: 11, h: 11 },
  tailOut: { x0: -40, y0: -24, w: 32, h: 24 },
  tailWrap: { x0: -21, y0: -16, w: 36, h: 22 },
  tailDangle: { x0: -18, y0: -8, w: 18, h: 30 },
  ball: { x0: -21, y0: -40, w: 42, h: 43 },
  ballEye: { x0: 1, y0: -26, w: 11, h: 11 },
  // Bud Bush (bush coords: origin at the base centre).
  bushBack: { x0: -66, y0: -72, w: 132, h: 78 },
  bushFront: { x0: -66, y0: -44, w: 132, h: 50 },
};

/** Origin fractions so that char point (px, py) is the image anchor. */
export function kOrigin(name: string, px: number, py: number): [number, number] {
  const w = KW[name];
  return [(px - w.x0) / w.w, (py - w.y0) / w.h];
}

export const kKey = (name: string): string => `kopila_${name}`;

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

/**
 * A scallop petal scale: rounded teardrop, round end up (like a rhododendron
 * bud scale), soft point down. Highlight arc along the top edge.
 */
export function petal(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number, lw = 1.5, fill = PANGO): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    const hw = w / 2;
    const hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.bezierCurveTo(-hw * 0.5, hh * 0.86, -hw, hh * 0.3, -hw, -hh * 0.12);
    ctx.bezierCurveTo(-hw, -hh * 0.72, -hw * 0.55, -hh, 0, -hh);
    ctx.bezierCurveTo(hw * 0.55, -hh, hw, -hh * 0.72, hw, -hh * 0.12);
    ctx.bezierCurveTo(hw, hh * 0.3, hw * 0.5, hh * 0.86, 0, hh);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, -hh, hh, [
      [0, mix(fill, PLIGHT, 0.55)],
      [0.42, fill],
      [1, mix(fill, PLINE, 0.22)],
    ]);
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PLINE;
    ctx.stroke();
    // Highlight arc along the top edge.
    ctx.beginPath();
    ctx.ellipse(0, -hh * 0.08, hw * 0.6, hh * 0.64, 0, Math.PI * 1.2, Math.PI * 1.8);
    ctx.strokeStyle = rgba(tint(PLIGHT, 0.35), 0.95);
    ctx.lineWidth = Math.max(1, lw * 0.85);
    ctx.lineCap = 'round';
    ctx.stroke();
  });
}

/** Rotation that points a petal's round end along direction (dx, dy). */
function dirRot(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

type PetalSpec = [x: number, y: number, w: number, h: number, rot: number];

function petals(ctx: Ctx, list: PetalSpec[], lw = 1.5): void {
  for (const [x, y, w, h, r] of list) petal(ctx, x, y, w, h, r, lw);
}

/** Egg, wider at the bottom. */
function eggPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, bottomBulge = 0.1): void {
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + bottomBulge * Math.sin(a);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry]);
  }
  smoothClosed(ctx, pts);
}

function nub(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ellipsePath(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rGrad(ctx, x - rx * 0.3, y - ry * 0.4, 0, rx * 1.4, [
    [0, tint(PFACE, 0.35)],
    [1, mix(PFACE, PLINE, 0.12)],
  ]);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = FACE_LINE;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Kopila parts
// ---------------------------------------------------------------------------

export function drawBody(ctx: Ctx): void {
  const { x, y, rx, ry } = KG.body;
  ctx.beginPath();
  eggPath(ctx, x, y, rx, ry);
  ctx.fillStyle = rGrad(ctx, x - 4, y - 8, 2, rx * 1.4, [
    [0, mix(PANGO, PLIGHT, 0.4)],
    [0.7, PANGO],
    [1, mix(PANGO, PLINE, 0.2)],
  ]);
  ctx.fill();
  // Soft belly at the front.
  withState(ctx, () => {
    ctx.clip();
    ctx.beginPath();
    ellipsePath(ctx, x + 9.5, y + 1, 8, 11.5);
    ctx.fillStyle = rGrad(ctx, x + 10, y - 2, 1, 12, [
      [0, tint(PFACE, 0.3)],
      [1, PFACE],
    ]);
    ctx.fill();
  });
  ctx.beginPath();
  eggPath(ctx, x, y, rx, ry);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PLINE;
  ctx.stroke();
}

const BACK_ROW: PetalSpec[] = [
  [-13.2, -16.5, 10, 10, -0.42],
  [-8.4, -18.6, 10, 10, -0.2],
  [-3.2, -19.4, 10, 10, -0.02],
  [1.8, -18.8, 9.4, 9.6, 0.14],
];
const HIP_ROW: PetalSpec[] = [
  [-14.6, -7.6, 10, 9.6, -0.5],
  [-10.6, -5.4, 10, 9.6, -0.3],
  [-5.6, -4.4, 10, 9.6, -0.1],
  [-0.6, -4.4, 10, 9.4, 0.06],
  [4.2, -5.4, 9, 9, 0.22],
];
const CROWN_ROW: PetalSpec[] = [
  [-10.2, -41.2, 10.5, 10.5, -0.78],
  [-4.4, -47.2, 11, 11, -0.42],
  [3.4, -50.2, 11, 11, -0.08],
];

export function drawRowBack(ctx: Ctx): void {
  petals(ctx, BACK_ROW);
}
export function drawRowHip(ctx: Ctx): void {
  petals(ctx, HIP_ROW);
}
export function drawCrown(ctx: Ctx): void {
  petals(ctx, CROWN_ROW);
}

export function drawHead(ctx: Ctx): void {
  const { x, y, r } = KG.head;
  // Head.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rGrad(ctx, x - 3, y - 8, 2, r * 1.35, [
    [0, mix(PANGO, PLIGHT, 0.55)],
    [0.65, PANGO],
    [1, mix(PANGO, PLINE, 0.18)],
  ]);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PLINE;
  ctx.stroke();
  // Snout outline first (so the fill hides its inner half).
  const s = KG.snout;
  ctx.beginPath();
  ellipsePath(ctx, s.x, s.y, s.rx, s.ry, -0.08);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = FACE_LINE;
  ctx.stroke();
  // Face patch (clipped to the head) + snout.
  const f = KG.face;
  withState(ctx, () => {
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ellipsePath(ctx, f.x, f.y, f.rx, f.ry, -0.05);
    ctx.fillStyle = rGrad(ctx, f.x + 2, f.y - 2, 1, f.rx * 1.2, [
      [0, tint(PFACE, 0.3)],
      [0.8, PFACE],
      [1, mix(PFACE, PANGO, 0.35)],
    ]);
    ctx.fill();
  });
  ctx.beginPath();
  ellipsePath(ctx, s.x, s.y, s.rx - 0.2, s.ry - 0.2, -0.08);
  ctx.fillStyle = rGrad(ctx, s.x + 1, s.y - 1.5, 0.5, s.rx * 1.3, [
    [0, tint(PFACE, 0.45)],
    [1, PFACE],
  ]);
  ctx.fill();
  // Rose nose tip.
  const n = KG.nose;
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
  ctx.fillStyle = P.rose;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(n.x - 0.5, n.y - 0.6, 0.55, 0, Math.PI * 2);
  ctx.fillStyle = rgba(P.cream, 0.9);
  ctx.fill();
}

function drawEyePair(ctx: Ctx, kind: 'open' | 'closed' | 'happy' | 'round'): void {
  KG.eyes.forEach((e, i) => {
    const k = i === 0 ? 1 : 0.92;
    switch (kind) {
      case 'open':
        eye(ctx, e.x, e.y, e.rx, e.ry, 0.4);
        break;
      case 'round':
        eye(ctx, e.x, e.y, e.rx * 1.12, e.ry * 1.1, 0);
        break;
      case 'closed':
        eyeClosed(ctx, e.x, e.y + 0.6, 6.4 * k, 1.6);
        break;
      case 'happy':
        eyeHappy(ctx, e.x, e.y + 0.4, 6.4 * k, 1.7);
        break;
    }
  });
}

export function drawBlush(ctx: Ctx): void {
  for (const b of KG.blush) blush(ctx, b.x, b.y, b.rx, b.ry, 0.6);
}

export function drawLeg(ctx: Ctx): void {
  // Leg nub centred on (0,0) in its own window; no claws.
  nub(ctx, 0, -1, 4.4, 3.6);
}

export function drawArm(ctx: Ctx): void {
  const a = KG.arm;
  nub(ctx, a.x, a.y, a.rx, a.ry, 0.3);
}

/** Tail petals along a path; round ends point toward the tip. Drawn tip first. */
function tailAlong(ctx: Ctx, pts: [number, number][], sizes: number[]): void {
  const list: PetalSpec[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const w = sizes[i];
    list.push([pts[i][0], pts[i][1], w, w * 0.96, dirRot(b[0] - a[0], b[1] - a[1])]);
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const [x, y, w, h, r] = list[i];
    petal(ctx, x, y, w, h, r, 1.5);
  }
}

export function drawTailOut(ctx: Ctx): void {
  tailAlong(
    ctx,
    [
      [-15, -8.5],
      [-21.5, -10],
      [-27, -12.8],
      [-31.2, -16.6],
    ],
    [11.5, 10, 8.4, 6.8],
  );
}

export function drawTailWrap(ctx: Ctx): void {
  tailAlong(
    ctx,
    [
      [-14, -6.5],
      [-8.6, -1.4],
      [-1.6, 0.4],
      [5.4, -1],
    ],
    [10.6, 9.4, 8, 6.6],
  );
}

export function drawTailDangle(ctx: Ctx): void {
  tailAlong(
    ctx,
    [
      [-9.6, 0.5],
      [-10.4, 6.6],
      [-10, 12.2],
      [-7.6, 16.8],
    ],
    [10.4, 9.2, 7.8, 6.4],
  );
}

/** Ball silhouette: round, with a soft bud tip at the top. */
function ballShape(ctx: Ctx, cx: number, cy: number, r: number): void {
  const pts: [number, number][] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    // Slight bud point at the top (a = -PI/2).
    const top = Math.max(0, Math.cos(a + Math.PI / 2));
    const k = 1 + 0.07 * Math.pow(top, 6);
    pts.push([cx + Math.cos(a) * r * k * (1 - 0.02 * top), cy + Math.sin(a) * r * k]);
  }
  smoothClosed(ctx, pts);
}

/**
 * The bud-ball: petals in helix rows round a sphere (2 turns), top rows first
 * so lower petals overlap upward like a closed rhododendron bud. One gap at
 * the front where a single eye can open; the tail tip tucks in beneath it.
 */
export function drawBall(ctx: Ctx): void {
  const { x: cx, y: cy, r } = KG.ball;
  softShadow(ctx, cx, 0.6, r * 0.82, 3, 0.16);
  ctx.beginPath();
  ballShape(ctx, cx, cy, r);
  ctx.fillStyle = rGrad(ctx, cx - 5, cy - 7, 2, r * 1.3, [
    [0, mix(PANGO, PLIGHT, 0.5)],
    [0.7, PANGO],
    [1, mix(PANGO, PLINE, 0.25)],
  ]);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PLINE;
  ctx.stroke();

  // Rows: [yOffset from centre, count, petal size].
  const rows: [number, number, number][] = [
    [-15.2, 2, 7],
    [-10.4, 3, 9],
    [-3.6, 4, 11],
    [3.8, 5, 11.4],
    [10.6, 4, 10.6],
  ];
  const gapRow = 2;
  const gapIdx = 2;
  rows.forEach(([dy, count, size], ri) => {
    const yy = cy + dy;
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.92;
    for (let i = 0; i < count; i++) {
      if (ri === gapRow && i === gapIdx) continue;
      // Spread across the visible hemisphere, helix tilt per row.
      const phase = ri % 2 ? 0.5 / count : 0;
      const phi = -Math.PI / 2 + (Math.PI * (i + 0.5 + phase)) / count;
      const px = cx + hw * Math.sin(phi) * 0.95;
      const fore = 0.55 + 0.45 * Math.cos(phi);
      const py = yy + px * 0.1 - 0.4 * ri;
      const lean = Math.sin(phi) * 0.55 + (cy + dy < cy ? Math.sin(phi) * 0.25 : 0);
      petal(ctx, px, py, size * fore, size * 0.92, lean, 1.4);
    }
  });

  // The gap: a soft slit with a closed eyelid inside.
  const g = KG.ballEye;
  withState(ctx, () => {
    ctx.beginPath();
    ellipsePath(ctx, g.x, g.y, 4.4, 3.2, 0.12);
    ctx.fillStyle = rGrad(ctx, g.x, g.y + 1, 0.5, 5, [
      [0, PFACE],
      [1, mix(PFACE, PLINE, 0.45)],
    ]);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = PLINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g.x - 2.6, g.y - 0.2);
    ctx.quadraticCurveTo(g.x, g.y + 1.6, g.x + 2.6, g.y - 0.2);
    ctx.strokeStyle = mix(P.ink, PLINE, 0.35);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  // Tail tip tucked round the bottom front, pointing up to the gap.
  tailAlong(
    ctx,
    [
      [-3, cy + 15.2],
      [4.2, cy + 13.6],
      [10.4, cy + 9.4],
      [12.6, cy + 3.4],
    ],
    [8.6, 8, 7, 5.6],
  );
}

/** The single eye that opens in the ball's gap. */
export function drawBallEye(ctx: Ctx): void {
  const g = KG.ballEye;
  ctx.beginPath();
  ellipsePath(ctx, g.x, g.y, 4.3, 3.4, 0.12);
  ctx.fillStyle = PFACE;
  ctx.fill();
  eye(ctx, g.x + 0.2, g.y - 0.2, 2.5, 3.1, 0.5);
}

// ---------------------------------------------------------------------------
// The Bud Bush (bush coords: origin at base centre, y negative up)
// ---------------------------------------------------------------------------

const LEAF = P.moss;
const LEAF_DEEP = A['dhupi'];
const LEAF_LIGHT = P.sage;

/** Bud positions (base point of the ball sprite) and scale. */
export const BUDS: { x: number; y: number; s: number }[] = [
  { x: -36, y: -34, s: 0.85 },
  { x: -1, y: -49, s: 1.0 },
  { x: 37, y: -36, s: 0.9 },
];
/** Kopila's hidden-4th-bud spot. */
export const BUD4 = { x: -19, y: -42, s: 0.95 };
/** Peek: where Kopila's head centre sits when peeking (bush coords). */
export const PEEK = { x: 18, y: -40, drop: 32 };

/** A rhododendron leaf: long rounded oval with a midrib. */
function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, rot: number, fill = LEAF): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid, len * 0.8, -wid * 0.9, len, 0);
    ctx.bezierCurveTo(len * 0.8, wid * 0.9, len * 0.25, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, -wid, wid, [
      [0, mix(fill, LEAF_LIGHT, 0.45)],
      [0.5, fill],
      [1, mix(fill, LEAF_DEEP, 0.5)],
    ]);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = shade(fill, 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.12, 0);
    ctx.quadraticCurveTo(len * 0.5, -wid * 0.12, len * 0.86, 0);
    ctx.strokeStyle = rgba(mix(fill, LEAF_LIGHT, 0.7), 0.8);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();
  });
}

/** Whorl of leaves fanning down and out under a bud (as on a real rhodo). */
function whorl(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  const angs = [-0.25, 0.35, 0.95, Math.PI - 0.95, Math.PI - 0.35, Math.PI + 0.25];
  angs.forEach((a, i) => {
    const len = (17 + ((seed + i * 7) % 5)) * s;
    leaf(ctx, x, y + 1, len, 4.6 * s, a + 0.12 * Math.sin(seed + i), i % 2 ? LEAF : mix(LEAF, LEAF_DEEP, 0.3));
  });
}

/** A soft leafy dome: smooth body with leaf-tip scallops along the top. */
function dome(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, seed: number, top = mix(LEAF, LEAF_LIGHT, 0.35)): void {
  const pts: [number, number][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const bump = i % 2 ? 1.06 + 0.03 * Math.sin(seed + i) : 0.97;
    pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump]);
  }
  pts.push([cx + rx * 0.95, cy + ry * 0.35]);
  pts.push([cx, cy + ry * 0.5]);
  pts.push([cx - rx * 0.95, cy + ry * 0.35]);
  ctx.beginPath();
  smoothClosed(ctx, pts, 0.55);
  ctx.fillStyle = vGrad(ctx, cy - ry, cy + ry * 0.5, [
    [0, top],
    [0.55, LEAF],
    [1, mix(LEAF, LEAF_DEEP, 0.6)],
  ]);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = shade(LEAF, 0.3);
  ctx.stroke();
}

export function drawBushBack(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 58, 6, 0.2);
  dome(ctx, -30, -18, 30, 22, 1);
  dome(ctx, 26, -20, 32, 24, 4);
  dome(ctx, -2, -26, 30, 24, 7);
  // Leaf whorls under the three buds.
  BUDS.forEach((b, i) => whorl(ctx, b.x, b.y + 1, b.s, i * 13 + 3));
  // A loose leaf fan where Kopila nestles (no bud: it's Kopila's spot).
  leaf(ctx, BUD4.x - 2, BUD4.y + 4, 15, 4.2, Math.PI - 0.3, mix(LEAF, LEAF_DEEP, 0.25));
  leaf(ctx, BUD4.x + 2, BUD4.y + 5, 14, 4, 0.35);
}

export function drawBushFront(ctx: Ctx): void {
  // Low front band of leaf clusters; its top edge dips a little where
  // Kopila peeks, so the snout tip shows.
  dome(ctx, -38, -10, 24, 16, 11);
  dome(ctx, 40, -9, 24, 15, 14);
  dome(ctx, 2, -8, 40, 20, 17);
  // Leaves tucked along the front edge.
  leaf(ctx, -50, -12, 16, 4.4, Math.PI + 0.35);
  leaf(ctx, 52, -10, 16, 4.4, -0.3);
  leaf(ctx, -20, -24, 15, 4.2, Math.PI + 0.75, mix(LEAF, LEAF_LIGHT, 0.2));
  leaf(ctx, 24, -23, 15, 4.2, -0.65, mix(LEAF, LEAF_LIGHT, 0.2));
  leaf(ctx, 2, -27, 13, 4, -Math.PI / 2 - 0.2, mix(LEAF, LEAF_LIGHT, 0.15));
}

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

function win(b: Baker, name: string, draw: (ctx: Ctx) => void): void {
  const w = KW[name];
  b.tex(kKey(name), w.w, w.h, (ctx) => {
    ctx.translate(-w.x0, -w.y0);
    draw(ctx);
  });
}

export function bake(b: Baker): void {
  win(b, 'body', drawBody);
  win(b, 'rowBack', drawRowBack);
  win(b, 'rowHip', drawRowHip);
  win(b, 'head', drawHead);
  win(b, 'crown', drawCrown);
  win(b, 'eyes', (c) => drawEyePair(c, 'open'));
  win(b, 'eyesClosed', (c) => drawEyePair(c, 'closed'));
  win(b, 'eyesHappy', (c) => drawEyePair(c, 'happy'));
  win(b, 'eyesRound', (c) => drawEyePair(c, 'round'));
  win(b, 'blush', drawBlush);
  win(b, 'mouth', (c) => mouth(c, KG.mouth.x, KG.mouth.y, 3.4, 'smile', 1.3));
  win(b, 'mouthO', (c) => mouth(c, KG.mouth.x, KG.mouth.y - 0.3, 3.6, 'o', 1.2));
  win(b, 'leg', drawLeg);
  win(b, 'arm', drawArm);
  win(b, 'tailOut', drawTailOut);
  win(b, 'tailWrap', drawTailWrap);
  win(b, 'tailDangle', drawTailDangle);
  win(b, 'ball', drawBall);
  win(b, 'ballEye', drawBallEye);
  win(b, 'bushBack', drawBushBack);
  win(b, 'bushFront', drawBushFront);
}
