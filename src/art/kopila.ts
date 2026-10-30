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
  ball: { x0: -21, y0: -40, w: 42, h: 45 },
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
export function petal(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number, lw = 1.5, fill = PANGO, line = PLINE): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    const hw = w / 2;
    const hh = h / 2;
    // Broad scallop: wide round top, sides tuck in to a soft point.
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.bezierCurveTo(-hw * 0.32, hh * 0.92, -hw, hh * 0.42, -hw, -hh * 0.1);
    ctx.bezierCurveTo(-hw, -hh * 0.78, -hw * 0.52, -hh, 0, -hh);
    ctx.bezierCurveTo(hw * 0.52, -hh, hw, -hh * 0.78, hw, -hh * 0.1);
    ctx.bezierCurveTo(hw, hh * 0.42, hw * 0.32, hh * 0.92, 0, hh);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, -hh, hh, [
      [0, mix(fill, PLIGHT, 0.6)],
      [0.38, fill],
      [1, mix(fill, PLINE, 0.28)],
    ]);
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = line;
    ctx.stroke();
    // Highlight arc along the top edge.
    ctx.beginPath();
    ctx.ellipse(0, -hh * 0.04, hw * 0.62, hh * 0.7, 0, Math.PI * 1.25, Math.PI * 1.75);
    ctx.strokeStyle = rgba(tint(PLIGHT, 0.4), 0.5);
    ctx.lineWidth = Math.max(0.8, lw * 0.7);
    ctx.lineCap = 'round';
    ctx.stroke();
  });
}

/** Softer line for petals inside a silhouette (the silhouette keeps PLINE). */
const INNER_LINE = mix(PLINE, PANGO, 0.38);

/** Rotation that points a petal's round end along direction (dx, dy). */
function dirRot(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

type PetalSpec = [x: number, y: number, w: number, h: number, rot: number];

function petals(ctx: Ctx, list: PetalSpec[], lw = 1.5): void {
  for (const [x, y, w, h, r] of list) petal(ctx, x, y, w, h, r, lw, PANGO, PLINE);
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
  [-11.4, -39.6, 12.4, 9.6, -1.05],
  [-6.4, -45.6, 13, 10, -0.58],
  [1.2, -48.8, 13, 10, -0.14],
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

/** Smooth tapered tube along pts with widths ws (round tip). */
function tubePath(ctx: Ctx, pts: [number, number][], ws: number[]): void {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    left.push([pts[i][0] + nx * ws[i] / 2, pts[i][1] + ny * ws[i] / 2]);
    right.push([pts[i][0] - nx * ws[i] / 2, pts[i][1] - ny * ws[i] / 2]);
  }
  const t = pts[n - 1];
  const p = pts[n - 2];
  const d = Math.hypot(t[0] - p[0], t[1] - p[1]) || 1;
  const cap: [number, number] = [t[0] + ((t[0] - p[0]) / d) * ws[n - 1] * 0.5, t[1] + ((t[1] - p[1]) / d) * ws[n - 1] * 0.5];
  smoothClosed(ctx, [...left, cap, ...right.reverse()], 0.5);
}

/**
 * A thick tapering tail: a soft tube with 4 shrinking petal scales shingled
 * along it (round ends toward the tip). Drawn tip first so each scale overlaps
 * the next one out.
 */
function tail(ctx: Ctx, pts: [number, number][], sizes: number[]): void {
  const ws = sizes.map((s) => s * 0.82);
  ctx.beginPath();
  tubePath(ctx, pts, ws);
  ctx.fillStyle = mix(PANGO, PLINE, 0.12);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PLINE;
  ctx.stroke();
  const n = pts.length;
  for (let i = n - 1; i >= 0; i--) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const w = sizes[i];
    petal(ctx, pts[i][0], pts[i][1], w, w * 0.92, dirRot(b[0] - a[0], b[1] - a[1]), 1.4, PANGO, i === n - 1 ? PLINE : INNER_LINE);
  }
}

export function drawTailOut(ctx: Ctx): void {
  tail(
    ctx,
    [
      [-14, -8.4],
      [-19.4, -9.8],
      [-24, -12.4],
      [-27.4, -16],
    ],
    [13, 11.4, 9.6, 7.8],
  );
}

export function drawTailWrap(ctx: Ctx): void {
  tail(
    ctx,
    [
      [-13.4, -5.6],
      [-8, -1.2],
      [-1.6, 0.2],
      [4.6, -1.2],
    ],
    [11.6, 10, 8.4, 6.8],
  );
}

export function drawTailDangle(ctx: Ctx): void {
  tail(
    ctx,
    [
      [-9.4, 0.2],
      [-9.8, 4.8],
      [-9.2, 9],
      [-7.2, 12.6],
    ],
    [12, 10.6, 9, 7.4],
  );
}

/** Ball silhouette: round, with a soft bud tip at the top. */
function ballShape(ctx: Ctx, cx: number, cy: number, r: number): void {
  const pts: [number, number][] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const top = Math.max(0, -Math.sin(a));
    const k = 1 + 0.1 * Math.pow(top, 8);
    pts.push([cx + Math.cos(a) * r * (1 - 0.04 * top), cy + Math.sin(a) * r * k]);
  }
  smoothClosed(ctx, pts);
}

/**
 * The bud-ball: a few broad scales in offset tiers (a 2-turn helix) round a
 * sphere, upper tiers first so lower scales overlap upward like a closed
 * rhododendron bud. One gap at the front where a single eye can open; the
 * tail tip tucks round the bottom and up toward it.
 */
export function drawBall(ctx: Ctx): void {
  const { x: cx, y: cy, r } = KG.ball;
  softShadow(ctx, cx, 0.6, r * 0.8, 3, 0.16);
  ctx.beginPath();
  ballShape(ctx, cx, cy, r);
  ctx.fillStyle = rGrad(ctx, cx - 5, cy - 7, 2, r * 1.3, [
    [0, mix(PANGO, PLIGHT, 0.4)],
    [0.7, PANGO],
    [1, mix(PANGO, PLINE, 0.3)],
  ]);
  ctx.fill();

  withState(ctx, () => {
    ctx.beginPath();
    ballShape(ctx, cx, cy, r - 0.6);
    ctx.clip();
    // Tip scales.
    petal(ctx, cx - 3.4, cy - 13.2, 10, 9.4, -0.35, 1.3, PANGO, INNER_LINE);
    petal(ctx, cx + 3.6, cy - 13.6, 10, 9.4, 0.32, 1.3, PANGO, INNER_LINE);
    // Upper tier (3), helix-tilted.
    petal(ctx, cx - 11.4, cy - 4.8, 12, 13, -0.62, 1.4, PANGO, INNER_LINE);
    petal(ctx, cx - 1.2, cy - 6.6, 13.6, 13.6, -0.06, 1.4, PANGO, INNER_LINE);
    // (gap at the front right: no scale here)
    // Lower tier (3), offset.
    petal(ctx, cx - 7.6, cy + 5.6, 14, 13.6, -0.34, 1.4, PANGO, INNER_LINE);
    petal(ctx, cx + 4.6, cy + 4.6, 14, 13.6, 0.22, 1.4, PANGO, INNER_LINE);
    petal(ctx, cx - 16, cy + 5, 10, 13, -0.9, 1.4, PANGO, INNER_LINE);
  });

  // The gap: a soft slit with a closed eyelid inside.
  const g = KG.ballEye;
  ctx.beginPath();
  ellipsePath(ctx, g.x, g.y, 5, 3.6, 0.18);
  ctx.fillStyle = rGrad(ctx, g.x, g.y + 1.2, 0.5, 5, [
    [0, mix(PANGO, PLINE, 0.55)],
    [1, mix(PANGO, PLINE, 0.25)],
  ]);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = INNER_LINE;
  ctx.stroke();
  // Upper-right scale overlapping the gap's top edge.
  petal(ctx, cx + 9.6, cy - 8.4, 9, 9.4, 0.6, 1.3, PANGO, INNER_LINE);

  // Tail tip tucked round the bottom front, curling up toward the gap.
  const tp: [number, number][] = [
    [cx - 6.4, cy + 12],
    [cx + 1.8, cy + 11.8],
    [cx + 8.4, cy + 8.6],
    [cx + 11.8, cy + 3],
  ];
  const sizes = [11, 9.6, 8.2, 6.6];
  withState(ctx, () => {
    ctx.beginPath();
    ballShape(ctx, cx, cy, r - 0.6);
    ctx.clip();
    for (let i = tp.length - 1; i >= 0; i--) {
      const a = tp[Math.max(0, i - 1)];
      const b = tp[Math.min(tp.length - 1, i + 1)];
      petal(ctx, tp[i][0], tp[i][1], sizes[i], sizes[i] * 0.9, dirRot(b[0] - a[0], b[1] - a[1]), 1.4, PANGO, INNER_LINE);
    }
  });

  // Silhouette outline last, so it stays bold and clean.
  ctx.beginPath();
  ballShape(ctx, cx, cy, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PLINE;
  ctx.stroke();
}

/** The single eye that opens in the ball's gap. */
export function drawBallEye(ctx: Ctx): void {
  const g = KG.ballEye;
  ctx.beginPath();
  ellipsePath(ctx, g.x, g.y, 5, 4, 0.18);
  ctx.fillStyle = PFACE;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INNER_LINE;
  ctx.stroke();
  eye(ctx, g.x + 0.2, g.y - 0.1, 3.1, 3.8, 0.5);
}

// ---------------------------------------------------------------------------
// The Bud Bush (bush coords: origin at base centre, y negative up)
// ---------------------------------------------------------------------------

const LEAF: string = P.moss;
const LEAF_DEEP = A['dhupi'];
const LEAF_LIGHT: string = P.sage;

/** Bud positions (base point of the ball sprite) and scale. */
export const BUDS: { x: number; y: number; s: number }[] = [
  { x: -44, y: -31, s: 0.85 },
  { x: -4, y: -47, s: 1.0 },
  { x: 41, y: -35, s: 0.9 },
];
/** Kopila's hidden-4th-bud spot. */
export const BUD4 = { x: -25, y: -39, s: 0.92 };
/** Peek: where Kopila's head centre sits when peeking (bush coords). */
export const PEEK = { x: 16, y: -36, drop: 34 };

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

type DomeSpec = [cx: number, cy: number, rx: number, ry: number, seed: number];

/** A soft leafy dome path: smooth body with leaf-tip scallops along the top. */
function domePath(ctx: Ctx, [cx, cy, rx, ry, seed]: DomeSpec): void {
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const bump = i % 2 ? 1.05 + 0.03 * Math.sin(seed * 3 + i) : 0.975;
    pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump]);
  }
  pts.push([cx + rx * 0.92, cy + ry * 0.4]);
  pts.push([cx, cy + ry * 0.52]);
  pts.push([cx - rx * 0.92, cy + ry * 0.4]);
  smoothClosed(ctx, pts, 0.55);
}

/**
 * A cluster of domes with ONE outline round the union (stroke all wide,
 * then fill all), soft top-lit gradient, and a few leaf glints.
 */
function domes(ctx: Ctx, list: DomeSpec[], y0: number, y1: number, light = 0.4): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = shade(LEAF, 0.3);
  ctx.lineWidth = 4.6;
  for (const d of list) {
    ctx.beginPath();
    domePath(ctx, d);
    ctx.stroke();
  }
  const g = vGrad(ctx, y0, y1, [
    [0, mix(LEAF, LEAF_LIGHT, light)],
    [0.5, LEAF],
    [1, mix(LEAF, LEAF_DEEP, 0.65)],
  ]);
  for (const d of list) {
    ctx.beginPath();
    domePath(ctx, d);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // Soft seams: a shadowy arc under each upper dome, and a light rim on top.
  for (const [cx, cy, rx, ry] of list) {
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.05, rx * 0.8, ry * 0.75, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.strokeStyle = rgba(tint(LEAF_LIGHT, 0.3), 0.35);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function drawBushBack(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 60, 6, 0.2);
  domes(
    ctx,
    [
      [-30, -16, 28, 22, 1],
      [28, -18, 30, 24, 4],
      [-2, -26, 30, 26, 7],
    ],
    -52,
    0,
    0.45,
  );
  // Leaf whorls under the three buds.
  BUDS.forEach((b, i) => whorl(ctx, b.x, b.y + 1, b.s, i * 13 + 3));
  // A loose leaf fan where Kopila nestles (no bud: it's Kopila's spot).
  leaf(ctx, BUD4.x - 3, BUD4.y + 3, 15, 4.2, Math.PI - 0.35, mix(LEAF, LEAF_DEEP, 0.25));
  leaf(ctx, BUD4.x + 3, BUD4.y + 4, 14, 4, 0.4);
}

export function drawBushFront(ctx: Ctx): void {
  // Low front band of leaf clusters; its top edge dips a little where
  // Kopila peeks, so the snout tip shows.
  domes(
    ctx,
    [
      [-40, -9, 22, 15, 11],
      [42, -8, 22, 14, 14],
      [0, -7, 40, 18, 17],
    ],
    -26,
    2,
    0.3,
  );
  leaf(ctx, -54, -10, 15, 4.2, Math.PI + 0.3);
  leaf(ctx, 56, -9, 15, 4.2, -0.28);
  leaf(ctx, -22, -21, 14, 4, Math.PI + 0.8, mix(LEAF, LEAF_LIGHT, 0.2));
  leaf(ctx, 30, -19, 14, 4, -0.7, mix(LEAF, LEAF_LIGHT, 0.2));
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
