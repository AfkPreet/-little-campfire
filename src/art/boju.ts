/**
 * Boju, the grandmother yak (docs/WORLD.md 5.2). Texture namespace "boju_".
 *
 * A bust behind the shop counter. Every part is drawn in BOJU coordinates
 * (1x px, origin at the counter-top centre, y negative up) inside a window
 * (BW); the Boju container places each part at its pivot with bOrigin().
 * Props that move on their own (needles, kettle, glass) are drawn in local
 * coordinates around their pivot instead.
 */
import { Baker, Ctx, blush, ellipsePath, eye, eyeClosed, eyeHappy, rGrad, smoothClosed, smoothOpen, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

// ---------------------------------------------------------------------------
// Colours (WORLD 8)
// ---------------------------------------------------------------------------
const YAK = A['yak'];
const YAK_SHADE = A['yak-shade'];
const YAK_LINE = A['yak-line'];
const YAK_FACE = A['yak-face'];
const YAK_LIGHT = tint(YAK, 0.18);
const HORN = A['horn'];
const HORN_LINE = A['horn-line'];
const WOOL = A['wool-ball'];
const BELL = A['bell'];
const COPPER = A['copper'];
const COPPER_LINE = A['copper-line'];
const CREAM_LINE = A['cream-line'];
const ROSE: string = P.rose;
const BUTTER: string = P.butter;
const CREAM: string = P.cream;
const ROSE_LINE = shade(ROSE, 0.3);
const TEA = mix(P.peach, P.cream, 0.22);

// ---------------------------------------------------------------------------
// Geometry (WORLD 5.2)
// ---------------------------------------------------------------------------
export const BG = {
  neck: { x: 0, y: -112 },
  head: { x: 0, y: -170, w: 150, h: 130 },
  muzzle: { x: 0, y: -150, rx: 42, ry: 29 },
  eyes: [
    { x: -30, y: -180 },
    { x: 30, y: -180 },
  ],
  blush: [
    { x: -48, y: -155 },
    { x: 48, y: -155 },
  ],
  mouth: { x: 0, y: -138 },
  fringe: { x: 0, y: -205 },
  horns: { x: 0, y: -226 },
  ears: [
    { x: -78, y: -200, px: -66, py: -203 },
    { x: 78, y: -200, px: 66, py: -203 },
  ],
  muffler: { y: -105 },
  knot: { x: -30, y: -102 },
  bell: { x: 14, y: -84, r: 9, cordY: -100 },
  hooves: [
    { x: -60, y: -8 },
    { x: 60, y: -8 },
  ],
  /** Needle grips (pivots) and resting angles in degrees. */
  needles: [
    { x: -50, y: -14, angle: -35 },
    { x: 50, y: -14, angle: -145 },
  ],
  needleLen: 66,
  swatch: { x: 0, y: -37 },
  ball: { x: 100, y: -14, r: 14 },
  glass: { x: 34, y: 0 },
  /** Kettle handle pivot when held up for the pour. */
  kettle: { x: 62, y: -80, tilt: -35 },
} as const;

export interface Win {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** Texture windows. Texture key = 'boju_' + name. */
export const BW: Record<string, Win> = {
  body: { x0: -122, y0: -146, w: 244, h: 166 },
  head: { x0: -82, y0: -242, w: 164, h: 142 },
  horns: { x0: -100, y0: -274, w: 200, h: 60 },
  earL: { x0: -100, y0: -216, w: 40, h: 30 },
  earR: { x0: 60, y0: -216, w: 40, h: 30 },
  fringe: { x0: -70, y0: -248, w: 140, h: 52 },
  eyesSmile: { x0: -42, y0: -194, w: 84, h: 28 },
  eyesHappy: { x0: -42, y0: -194, w: 84, h: 28 },
  eyesRound: { x0: -42, y0: -194, w: 84, h: 28 },
  eyesClosed: { x0: -42, y0: -194, w: 84, h: 28 },
  blush: { x0: -62, y0: -164, w: 124, h: 18 },
  mouthSmile: { x0: -14, y0: -148, w: 28, h: 20 },
  mouthTalk: { x0: -14, y0: -148, w: 28, h: 20 },
  mouthO: { x0: -14, y0: -148, w: 28, h: 20 },
  muffler: { x0: -84, y0: -126, w: 168, h: 40 },
  mufflerTails: { x0: -60, y0: -108, w: 48, h: 66 },
  bell: { x0: 1, y0: -104, w: 26, h: 34 },
  hoofL: { x0: -80, y0: -40, w: 40, h: 46 },
  hoofR: { x0: 40, y0: -40, w: 40, h: 46 },
  swatch: { x0: -20, y0: -50, w: 40, h: 28 },
  yarn: { x0: 4, y0: -36, w: 90, h: 30 },
  ball: { x0: 82, y0: -32, w: 36, h: 38 },
  // Local-coordinate props (pivot at 0,0).
  needle: { x0: -10, y0: -6, w: 82, h: 12 },
  kettle: { x0: -34, y0: -34, w: 56, h: 52 },
  glass: { x0: -11, y0: -25, w: 22, h: 28 },
  tea: { x0: -11, y0: -25, w: 22, h: 28 },
  stream: { x0: 28, y0: -56, w: 26, h: 42 },
};

export function bOrigin(name: string, px: number, py: number): [number, number] {
  const w = BW[name];
  return [(px - w.x0) / w.w, (py - w.y0) / w.h];
}

export const bKey = (name: string): string => `boju_${name}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Superellipse (squircle) path. */
function squircle(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, n = 2.6, pts = 40): void {
  const list: [number, number][] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    list.push([cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx, cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry]);
  }
  smoothClosed(ctx, list, 0.5);
}

/** Smooth tapered tube along a quadratic curve, with a round tip. */
function hornPath(ctx: Ctx, p0: [number, number], p1: [number, number], p2: [number, number], w0: number, w1: number, t0 = 0, t1 = 1): void {
  const n = 10;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    const [x, y] = at(t);
    const [xa, ya] = at(Math.max(0, t - 0.01));
    const [xb, yb] = at(Math.min(1, t + 0.01));
    const l = Math.hypot(xb - xa, yb - ya) || 1;
    const nx = -(yb - ya) / l;
    const ny = (xb - xa) / l;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  const [ex, ey] = at(t1);
  const [dx, dy] = at(Math.max(0, t1 - 0.02));
  const l = Math.hypot(ex - dx, ey - dy) || 1;
  const wt = (w0 + (w1 - w0) * t1) / 2;
  const cap: [number, number] = [ex + ((ex - dx) / l) * wt * 0.9, ey + ((ey - dy) / l) * wt * 0.9];
  smoothClosed(ctx, [...left, cap, ...right.reverse()], 0.5);
}

function stroke(ctx: Ctx, color: string, lw: number): void {
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** Small curly wool tick. */
function curl(ctx: Ctx, x: number, y: number, r: number, color: string, a = 0.5, rot = 0): void {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.05 + rot, Math.PI * 1.85 + rot);
  stroke(ctx, rgba(color, a), 1.6);
}

/** A fluffy pom-pom. */
function pompom(ctx: Ctx, x: number, y: number, r: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const k = i % 2 ? 1.0 : 0.86;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
  }
  ctx.beginPath();
  smoothClosed(ctx, pts, 0.6);
  ctx.fillStyle = rGrad(ctx, x - r * 0.3, y - r * 0.4, 0, r * 1.3, [
    [0, tint(CREAM, 0.5)],
    [1, mix(CREAM, CREAM_LINE, 0.4)],
  ]);
  ctx.fill();
  stroke(ctx, CREAM_LINE, 1.6);
}

// ---------------------------------------------------------------------------
// Body: the haystack mound with a 9-bump cumulus outline
// ---------------------------------------------------------------------------

export function drawBody(ctx: Ctx): void {
  const cx = 0;
  const cy = -58;
  const rx = 110;
  const ry = 77;
  const bumps: [number, number, number][] = [];
  const nb = 9;
  for (let i = 0; i < nb; i++) {
    const th = Math.PI - 0.2 + ((Math.PI + 0.4) * i) / (nb - 1);
    const r = 27 + (i === 4 ? 3 : i % 2 ? 1 : 0);
    bumps.push([cx + Math.cos(th) * (rx - r * 0.82), cy + Math.sin(th) * (ry - r * 0.82), r]);
  }
  const core = (c: Ctx) => {
    c.beginPath();
    c.ellipse(cx, cy + 4, rx - 14, ry - 10, 0, 0, Math.PI * 2);
    c.rect(cx - rx + 2, cy, (rx - 2) * 2, 73);
  };
  // Union outline: stroke all wide, then fill all.
  ctx.lineJoin = 'round';
  for (const [x, y, r] of bumps) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    stroke(ctx, YAK_LINE, 5);
  }
  ctx.beginPath();
  roundedBase(ctx, cx, rx);
  stroke(ctx, YAK_LINE, 5);
  const g = vGrad(ctx, -140, 16, [
    [0, YAK_LIGHT],
    [0.4, YAK],
    [0.62, YAK],
    [1, YAK_SHADE],
  ]);
  ctx.fillStyle = g;
  for (const [x, y, r] of bumps) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  core(ctx);
  ctx.fill();
  ctx.beginPath();
  roundedBase(ctx, cx, rx);
  ctx.fill();
  // Soft top highlights on each bump + wool curls.
  bumps.forEach(([x, y, r], i) => {
    ctx.beginPath();
    ctx.arc(x, y + 2, r * 0.72, Math.PI * 1.18, Math.PI * 1.82);
    stroke(ctx, rgba(tint(YAK_LIGHT, 0.3), 0.55), 2.4);
    if (y < -30) curl(ctx, x + (i % 2 ? 6 : -6), y + r * 0.45, 5, YAK_SHADE, 0.45, i * 0.3);
  });
  // Lower-half shading curls.
  const spots: [number, number][] = [
    [-70, -30], [-30, -20], [20, -26], [64, -22], [-50, 0], [40, -2], [0, 4],
  ];
  spots.forEach(([x, y], i) => curl(ctx, x, y, 6, YAK_LINE, 0.28, i * 0.7));
}

function roundedBase(ctx: Ctx, cx: number, rx: number): void {
  ctx.moveTo(cx - rx + 4, -60);
  ctx.lineTo(cx - rx + 2, 4);
  ctx.quadraticCurveTo(cx - rx + 2, 16, cx - rx + 16, 16);
  ctx.lineTo(cx + rx - 16, 16);
  ctx.quadraticCurveTo(cx + rx - 2, 16, cx + rx - 2, 4);
  ctx.lineTo(cx + rx - 4, -60);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Head, muzzle, fringe, horns, ears
// ---------------------------------------------------------------------------

export function drawHead(ctx: Ctx): void {
  const { x, y, w, h } = BG.head;
  // Cheek fluff bumps on the lower sides.
  const fluff: [number, number, number][] = [
    [-66, -132, 15],
    [66, -132, 15],
    [-56, -116, 13],
    [56, -116, 13],
  ];
  for (const [fx, fy, r] of fluff) {
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    stroke(ctx, YAK_LINE, 5);
  }
  ctx.beginPath();
  squircle(ctx, x, y, w / 2, h / 2, 2.7);
  stroke(ctx, YAK_LINE, 5);
  const g = rGrad(ctx, x - 10, y - 40, 10, 110, [
    [0, YAK_LIGHT],
    [0.55, YAK],
    [1, mix(YAK, YAK_SHADE, 0.7)],
  ]);
  ctx.fillStyle = g;
  for (const [fx, fy, r] of fluff) {
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  squircle(ctx, x, y, w / 2, h / 2, 2.7);
  ctx.fill();
  // Cheek fluff ticks.
  curl(ctx, -60, -124, 6, YAK_SHADE, 0.5, -0.4);
  curl(ctx, 60, -124, 6, YAK_SHADE, 0.5, 0.4);

  // The cream muzzle.
  const m = BG.muzzle;
  ctx.beginPath();
  ellipsePath(ctx, m.x, m.y, m.rx, m.ry);
  ctx.fillStyle = rGrad(ctx, m.x - 6, m.y - 10, 4, m.rx * 1.2, [
    [0, tint(YAK_FACE, 0.5)],
    [0.75, YAK_FACE],
    [1, mix(YAK_FACE, YAK, 0.22)],
  ]);
  ctx.fill();
  stroke(ctx, mix(YAK_FACE, YAK_LINE, 0.3), 1.6);
  // A little cream blaze up the forehead.
  ctx.beginPath();
  ctx.moveTo(-9, m.y - m.ry + 3);
  ctx.quadraticCurveTo(0, -200, 9, m.y - m.ry + 3);
  ctx.closePath();
  ctx.fillStyle = rgba(YAK_FACE, 0.0);
  ctx.fill();
}

export function drawFringe(ctx: Ctx): void {
  const tufts: [number, number][] = [
    [-44, 17],
    [-22, 18.5],
    [0, 20],
    [22, 18.5],
    [44, 17],
  ];
  const cy = (r: number) => -200 - r;
  for (const [x, r] of tufts) {
    ctx.beginPath();
    ctx.arc(x, cy(r), r, 0, Math.PI * 2);
    stroke(ctx, YAK_LINE, 5);
  }
  const g = vGrad(ctx, -242, -200, [
    [0, tint(YAK, 0.22)],
    [1, YAK],
  ]);
  for (const [x, r] of tufts) {
    ctx.beginPath();
    ctx.arc(x, cy(r), r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // Scallop separations at the bottom of each tuft, highlight arcs on top.
  tufts.forEach(([x, r], i) => {
    if (i > 0) {
      ctx.beginPath();
      ctx.arc(x, cy(r), r, Math.PI * 0.62, Math.PI * 0.9);
      stroke(ctx, rgba(YAK_LINE, 0.7), 2);
    }
    ctx.beginPath();
    ctx.arc(x, cy(r) + 2, r * 0.66, Math.PI * 1.2, Math.PI * 1.75);
    stroke(ctx, rgba(tint(YAK, 0.4), 0.9), 2.4);
  });
}

const HORN_L: [[number, number], [number, number], [number, number]] = [
  [-56, -222],
  [-82, -224],
  [-80, -256],
];

function drawOneHorn(ctx: Ctx, flip: number): void {
  const [p0, p1, p2] = HORN_L.map(([x, y]) => [x * flip, y] as [number, number]);
  // Horn.
  ctx.beginPath();
  hornPath(ctx, p0, p1, p2, 12, 7);
  ctx.fillStyle = vGrad(ctx, -260, -220, [
    [0, tint(HORN, 0.4)],
    [1, mix(HORN, HORN_LINE, 0.25)],
  ]);
  ctx.fill();
  stroke(ctx, HORN_LINE, 2.2);
  // Knitted cosy over the outer 45%.
  ctx.beginPath();
  hornPath(ctx, p0, p1, p2, 12.5, 9.5, 0.55, 1);
  ctx.fillStyle = vGrad(ctx, -262, -232, [
    [0, tint(ROSE, 0.2)],
    [1, ROSE],
  ]);
  ctx.fill();
  stroke(ctx, ROSE_LINE, 2);
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  // Two butter stripes across the sleeve.
  for (const t of [0.68, 0.84]) {
    const [x, y] = at(t);
    const [xa, ya] = at(t - 0.02);
    const [xb, yb] = at(t + 0.02);
    const l = Math.hypot(xb - xa, yb - ya) || 1;
    const nx = -(yb - ya) / l;
    const ny = (xb - xa) / l;
    ctx.beginPath();
    ctx.moveTo(x + nx * 5, y + ny * 5);
    ctx.lineTo(x - nx * 5, y - ny * 5);
    stroke(ctx, BUTTER, 3);
  }
  // Three tiny knit V ticks.
  for (const t of [0.6, 0.76, 0.92]) {
    const [x, y] = at(t);
    ctx.beginPath();
    ctx.moveTo(x - 1.8, y - 1.2);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x + 1.8, y - 1.2);
    stroke(ctx, rgba(ROSE_LINE, 0.75), 1);
  }
  // Cream pom-pom at the tip.
  const [tx, ty] = at(1);
  pompom(ctx, tx + 0.6 * flip, ty - 4, 5.5);
}

export function drawHorns(ctx: Ctx): void {
  drawOneHorn(ctx, 1);
  drawOneHorn(ctx, -1);
}

function drawEar(ctx: Ctx, flip: number): void {
  const e = BG.ears[flip < 0 ? 0 : 1];
  withState(ctx, () => {
    ctx.translate(e.x + 2 * flip, e.y);
    ctx.rotate(flip * (15 * Math.PI) / 180);
    const leafPath = (len: number, wid: number, ox = 0, oy = 0) => {
      ctx.beginPath();
      ctx.moveTo(-len / 2 + ox, oy);
      ctx.bezierCurveTo(-len * 0.25 + ox, -wid + oy, len * 0.3 + ox, -wid + oy, len / 2 + ox, oy);
      ctx.bezierCurveTo(len * 0.3 + ox, wid + oy, -len * 0.25 + ox, wid + oy, -len / 2 + ox, oy);
      ctx.closePath();
    };
    leafPath(32, 9);
    ctx.fillStyle = YAK;
    ctx.fill();
    stroke(ctx, YAK_LINE, 2.5);
    leafPath(18, 4, 3 * flip, 0.5);
    ctx.fillStyle = mix(ROSE, YAK, 0.15);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------

function drawEyes(ctx: Ctx, kind: 'smile' | 'happy' | 'round' | 'closed'): void {
  for (const e of BG.eyes) {
    switch (kind) {
      case 'smile': {
        // Kindly half-lidded: a yak lid covers the top 30%.
        withState(ctx, () => {
          ctx.fillStyle = P.ink;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 5, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 5.6, 7.1, 0, 0, Math.PI * 2);
          ctx.clip();
          const lidY = e.y - 6.5 + 13 * 0.3;
          ctx.beginPath();
          ctx.moveTo(e.x - 7, e.y - 9);
          ctx.lineTo(e.x + 7, e.y - 9);
          ctx.lineTo(e.x + 7, lidY + 0.6);
          ctx.quadraticCurveTo(e.x, lidY - 1.6, e.x - 7, lidY + 0.6);
          ctx.closePath();
          ctx.fillStyle = YAK;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(e.x - 6, lidY + 0.4);
          ctx.quadraticCurveTo(e.x, lidY - 1.5, e.x + 6, lidY + 0.4);
          stroke(ctx, YAK_LINE, 2);
        });
        ctx.fillStyle = CREAM;
        ctx.beginPath();
        ctx.arc(e.x - 1.6, e.y + 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x + 2, e.y + 3.4, 1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'round':
        eye(ctx, e.x, e.y, 6.4, 7.6, 0);
        break;
      case 'happy':
        eyeHappy(ctx, e.x, e.y + 1, 13, 2.8);
        break;
      case 'closed':
        eyeClosed(ctx, e.x, e.y + 1, 12, 2.6);
        break;
    }
  }
}

function drawMouth(ctx: Ctx, kind: 'smile' | 'talk' | 'o'): void {
  const { x, y } = BG.mouth;
  ctx.beginPath();
  if (kind === 'smile') {
    ctx.moveTo(x - 6, y - 1);
    ctx.quadraticCurveTo(x - 3, y + 3.2, x, y + 0.6);
    ctx.quadraticCurveTo(x + 3, y + 3.2, x + 6, y - 1);
    stroke(ctx, YAK_LINE, 2.4);
    return;
  }
  if (kind === 'talk') {
    ctx.moveTo(x - 5.5, y - 1);
    ctx.quadraticCurveTo(x, y + 1, x + 5.5, y - 1);
    ctx.quadraticCurveTo(x + 4, y + 7, x, y + 7);
    ctx.quadraticCurveTo(x - 4, y + 7, x - 5.5, y - 1);
  } else {
    ellipsePath(ctx, x, y + 2, 3.6, 4.4);
  }
  ctx.fillStyle = mix(ROSE, YAK_LINE, 0.45);
  ctx.fill();
  stroke(ctx, YAK_LINE, 2.2);
  if (kind === 'talk') {
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 2.6, 1.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = mix(ROSE, P.blush, 0.4);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Muffler, bell
// ---------------------------------------------------------------------------

export function drawMuffler(ctx: Ctx): void {
  const yc = (x: number) => BG.muffler.y + 5 * (1 - (x / 76) * (x / 76));
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -74 + (148 * i) / 12;
    top.push([x, yc(x) - 11]);
    bot.push([x, yc(x) + 11]);
  }
  ctx.beginPath();
  smoothClosed(ctx, [[-79, yc(-76)], ...top, [79, yc(76)], ...bot.reverse()], 0.5);
  ctx.fillStyle = vGrad(ctx, -118, -92, [
    [0, tint(ROSE, 0.25)],
    [0.5, ROSE],
    [1, mix(ROSE, ROSE_LINE, 0.3)],
  ]);
  ctx.fill();
  stroke(ctx, ROSE_LINE, 2.4);
  // Knit ribs.
  for (let x = -66; x <= 66; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, yc(x) - 8);
    ctx.lineTo(x, yc(x) + 8);
    stroke(ctx, rgba(ROSE_LINE, 0.22), 1.4);
  }
  // Knot.
  const k = BG.knot;
  ctx.beginPath();
  smoothClosed(ctx, [
    [k.x - 11, k.y - 6],
    [k.x, k.y - 11],
    [k.x + 11, k.y - 5],
    [k.x + 10, k.y + 7],
    [k.x - 1, k.y + 11],
    [k.x - 11, k.y + 6],
  ]);
  ctx.fillStyle = rGrad(ctx, k.x - 3, k.y - 4, 1, 14, [
    [0, tint(ROSE, 0.35)],
    [1, ROSE],
  ]);
  ctx.fill();
  stroke(ctx, ROSE_LINE, 2.2);
  ctx.beginPath();
  ctx.moveTo(k.x - 4, k.y - 7);
  ctx.quadraticCurveTo(k.x + 2, k.y, k.x - 2, k.y + 7);
  stroke(ctx, rgba(ROSE_LINE, 0.55), 1.5);
}

export function drawMufflerTails(ctx: Ctx): void {
  const k = BG.knot;
  const tailOne = (dx: number, len: number, lean: number) => {
    const x0 = k.x + dx;
    const y0 = k.y + 4;
    const w = 20;
    const pts: [number, number][] = [
      [x0 - w / 2, y0],
      [x0 + w / 2, y0],
      [x0 + w / 2 + lean * 0.6, y0 + len * 0.55],
      [x0 + w / 2 + lean, y0 + len],
      [x0 - w / 2 + lean, y0 + len],
      [x0 - w / 2 + lean * 0.6, y0 + len * 0.55],
    ];
    ctx.beginPath();
    smoothOpen(ctx, pts.slice(0, 4));
    ctx.lineTo(pts[4][0], pts[4][1]);
    smoothOpen(ctx, [pts[4], pts[5], pts[0]], true);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, y0, y0 + len, [
      [0, mix(ROSE, ROSE_LINE, 0.15)],
      [0.3, ROSE],
      [1, tint(ROSE, 0.1)],
    ]);
    ctx.fill();
    stroke(ctx, ROSE_LINE, 2.2);
    // Three butter stripes.
    for (let i = 0; i < 3; i++) {
      const t = 0.5 + i * 0.15;
      const yy = y0 + len * t;
      const xl = x0 - w / 2 + lean * t + 1.2;
      const xr = x0 + w / 2 + lean * t - 1.2;
      ctx.beginPath();
      ctx.moveTo(xl, yy);
      ctx.lineTo(xr, yy + 0.6);
      stroke(ctx, BUTTER, 3.2);
    }
    // Soft fringe tassels.
    for (let i = 0; i < 4; i++) {
      const tx = x0 - w / 2 + lean + 2.5 + i * 5;
      ctx.beginPath();
      ctx.moveTo(tx, y0 + len);
      ctx.lineTo(tx + lean * 0.05, y0 + len + 5);
      stroke(ctx, ROSE_LINE, 2.4);
      ctx.beginPath();
      ctx.moveTo(tx, y0 + len);
      ctx.lineTo(tx + lean * 0.05, y0 + len + 4.5);
      stroke(ctx, ROSE, 1.2);
    }
  };
  tailOne(4, 40, 4);
  tailOne(-9, 46, -6);
}

export function drawBell(ctx: Ctx): void {
  const b = BG.bell;
  // Cord.
  ctx.beginPath();
  ctx.moveTo(b.x, b.cordY);
  ctx.lineTo(b.x, b.y - b.r + 1);
  stroke(ctx, COPPER_LINE, 2);
  // Bell: round dome, softly flared rim.
  const top = b.y - b.r;
  ctx.beginPath();
  ctx.moveTo(b.x - 3, top);
  ctx.quadraticCurveTo(b.x - 9, top + 2, b.x - 9, b.y + 3);
  ctx.quadraticCurveTo(b.x - 11.5, b.y + 7, b.x - 9.5, b.y + 9);
  ctx.lineTo(b.x + 9.5, b.y + 9);
  ctx.quadraticCurveTo(b.x + 11.5, b.y + 7, b.x + 9, b.y + 3);
  ctx.quadraticCurveTo(b.x + 9, top + 2, b.x + 3, top);
  ctx.quadraticCurveTo(b.x, top - 1.5, b.x - 3, top);
  ctx.closePath();
  ctx.fillStyle = rGrad(ctx, b.x - 4, b.y - 4, 1, 16, [
    [0, tint(BELL, 0.5)],
    [0.6, BELL],
    [1, COPPER],
  ]);
  ctx.fill();
  stroke(ctx, COPPER_LINE, 2);
  // Rim band.
  ctx.beginPath();
  ctx.moveTo(b.x - 9.5, b.y + 5.5);
  ctx.quadraticCurveTo(b.x, b.y + 7.5, b.x + 9.5, b.y + 5.5);
  stroke(ctx, rgba(COPPER_LINE, 0.6), 1.4);
  // Clapper.
  ctx.beginPath();
  ctx.arc(b.x, b.y + 10.5, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = COPPER;
  ctx.fill();
  stroke(ctx, COPPER_LINE, 1.4);
  // Shine.
  ctx.beginPath();
  ctx.moveTo(b.x - 5, b.y + 2);
  ctx.quadraticCurveTo(b.x - 5.5, top + 4, b.x - 2, top + 2.5);
  stroke(ctx, rgba(CREAM, 0.85), 1.8);
}

// ---------------------------------------------------------------------------
// Hooves, knitting, wool ball
// ---------------------------------------------------------------------------

function drawHoof(ctx: Ctx, flip: number): void {
  const h = BG.hooves[flip < 0 ? 0 : 1];
  softShadow(ctx, h.x, 3, 17, 3.2, 0.18);
  // Fur cuff (the woolly wrist).
  const cuff: [number, number, number][] = [
    [h.x - 9, h.y - 17, 9],
    [h.x + 1, h.y - 20, 10],
    [h.x + 10, h.y - 16, 8.5],
  ];
  for (const [x, y, r] of cuff) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    stroke(ctx, YAK_LINE, 5);
  }
  // Mitten.
  const mitten = () => {
    ctx.beginPath();
    ctx.moveTo(h.x - 13, h.y - 8);
    ctx.quadraticCurveTo(h.x - 15, h.y + 9, h.x - 6, h.y + 11);
    ctx.lineTo(h.x + 6, h.y + 11);
    ctx.quadraticCurveTo(h.x + 15, h.y + 9, h.x + 13, h.y - 8);
    ctx.quadraticCurveTo(h.x, h.y - 14, h.x - 13, h.y - 8);
    ctx.closePath();
  };
  mitten();
  stroke(ctx, YAK_LINE, 5);
  for (const [x, y, r] of cuff) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = vGrad(ctx, h.y - 30, h.y - 8, [
      [0, YAK_LIGHT],
      [1, YAK],
    ]);
    ctx.fill();
  }
  mitten();
  ctx.fillStyle = vGrad(ctx, h.y - 12, h.y + 11, [
    [0, mix(YAK_SHADE, YAK, 0.3)],
    [1, YAK_SHADE],
  ]);
  ctx.fill();
  // Horn-coloured tip crescent with a soft cloven notch.
  withState(ctx, () => {
    mitten();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 13, 16, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = vGrad(ctx, h.y + 4, h.y + 12, [
      [0, tint(HORN, 0.3)],
      [1, mix(HORN, HORN_LINE, 0.3)],
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 13, 16, 9, 0, Math.PI, Math.PI * 2);
    stroke(ctx, HORN_LINE, 1.6);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + 4.5);
    ctx.lineTo(h.x, h.y + 11);
    stroke(ctx, HORN_LINE, 1.6);
  });
  mitten();
  stroke(ctx, YAK_LINE, 2.2);
  curl(ctx, h.x + 1, h.y - 22, 4.5, tint(YAK, 0.4), 0.8, 0);
}

/** A knitting needle along +x: soft point at x -6, butter knob at x 64. */
export function drawNeedle(ctx: Ctx): void {
  const L = BG.needleLen - 2;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-2, -1.6, 4, -1.6);
  ctx.lineTo(L, -1.6);
  ctx.lineTo(L, 1.6);
  ctx.lineTo(4, 1.6);
  ctx.quadraticCurveTo(-2, 1.6, -6, 0);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -1.6, 1.6, [
    [0, tint(CREAM, 0.6)],
    [1, mix(CREAM, CREAM_LINE, 0.5)],
  ]);
  ctx.fill();
  stroke(ctx, CREAM_LINE, 1.2);
  ctx.beginPath();
  ctx.arc(L + 2.6, 0, 3.9, 0, Math.PI * 2);
  ctx.fillStyle = rGrad(ctx, L + 1.6, -1.4, 0, 5, [
    [0, tint(BUTTER, 0.5)],
    [1, mix(BUTTER, P.bark, 0.18)],
  ]);
  ctx.fill();
  stroke(ctx, shade(BUTTER, 0.32), 1.4);
}

export function drawSwatch(ctx: Ctx): void {
  const { x, y } = BG.swatch;
  const w = 30;
  const h = 18;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 2, y - h / 2);
  ctx.lineTo(x + w / 2 - 2, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2 + 1, y, x + w / 2 - 1, y + h / 2 - 2);
  // Soft wavy cast-on edge.
  for (let i = 0; i < 5; i++) {
    const xa = x + w / 2 - 1 - (i * (w - 2)) / 5;
    const xb = xa - (w - 2) / 5;
    ctx.quadraticCurveTo((xa + xb) / 2, y + h / 2 + 2.4, xb, y + h / 2 - 1);
  }
  ctx.quadraticCurveTo(x - w / 2 - 1, y, x - w / 2 + 2, y - h / 2);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, y - h / 2, y + h / 2, [
    [0, ROSE],
    [1, mix(ROSE, WOOL, 0.5)],
  ]);
  ctx.fill();
  stroke(ctx, ROSE_LINE, 1.8);
  // V stitches: 3 rows of 5.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const sx = x - 11 + c * 5.5;
      const sy = y - 5.5 + r * 5.2;
      ctx.beginPath();
      ctx.moveTo(sx - 2.1, sy - 1.6);
      ctx.lineTo(sx, sy + 1.6);
      ctx.lineTo(sx + 2.1, sy - 1.6);
      stroke(ctx, rgba(ROSE_LINE, 0.5), 1.1);
    }
  }
}

export function drawYarn(ctx: Ctx): void {
  const b = BG.ball;
  ctx.beginPath();
  ctx.moveTo(12, -29);
  ctx.bezierCurveTo(30, -12, 66, -12, b.x - 11, b.y - 7);
  stroke(ctx, shade(WOOL, 0.22), 2.6);
  ctx.beginPath();
  ctx.moveTo(12, -29);
  ctx.bezierCurveTo(30, -12, 66, -12, b.x - 11, b.y - 7);
  stroke(ctx, WOOL, 1.4);
}

export function drawBall(ctx: Ctx): void {
  const { x, y, r } = BG.ball;
  softShadow(ctx, x, 2, r * 0.95, 3.2, 0.2);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rGrad(ctx, x - 4, y - 5, 1, r * 1.3, [
    [0, tint(WOOL, 0.45)],
    [0.7, WOOL],
    [1, mix(WOOL, ROSE_LINE, 0.35)],
  ]);
  ctx.fill();
  // Wound strands.
  withState(ctx, () => {
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.clip();
    const strands: [number, number, number, number][] = [
      [0, 0, 0.5, 12],
      [2, -2, -0.6, 10],
      [-2, 2, 1.3, 11],
      [1, 3, -1.2, 8],
    ];
    for (const [dx, dy, rot, rr] of strands) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, rr - i * 2.6, (rr - i * 2.6) * 0.42, rot, Math.PI * 0.05, Math.PI * 0.95);
        stroke(ctx, rgba(i === 0 ? tint(WOOL, 0.5) : shade(WOOL, 0.18), 0.65), 1.3);
      }
    }
  });
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  stroke(ctx, shade(WOOL, 0.3), 2.2);
  // Loose end.
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 11);
  ctx.quadraticCurveTo(x + 12, y + 15, x + 16, y + 13.5);
  stroke(ctx, shade(WOOL, 0.22), 1.6);
}

// ---------------------------------------------------------------------------
// Chiya: kettle, glass, tea, pour stream
// ---------------------------------------------------------------------------

/** Kettle in local coords; pivot (0,0) = top of the bail handle. */
export function drawKettle(ctx: Ctx): void {
  const cy = 0;
  // Bail handle.
  ctx.beginPath();
  ctx.moveTo(-12, cy + 14);
  ctx.bezierCurveTo(-13, cy - 2, 13, cy - 2, 12, cy + 14);
  stroke(ctx, COPPER_LINE, 4.6);
  ctx.beginPath();
  ctx.moveTo(-12, cy + 14);
  ctx.bezierCurveTo(-13, cy - 2, 13, cy - 2, 12, cy + 14);
  stroke(ctx, mix(COPPER, COPPER_LINE, 0.4), 2.4);
  // Spout.
  ctx.beginPath();
  ctx.moveTo(-12, cy + 22);
  ctx.quadraticCurveTo(-22, cy + 22, -27, cy + 12);
  ctx.lineTo(-23, cy + 10);
  ctx.quadraticCurveTo(-19, cy + 16, -11, cy + 15);
  ctx.closePath();
  ctx.fillStyle = mix(COPPER, COPPER_LINE, 0.15);
  ctx.fill();
  stroke(ctx, COPPER_LINE, 2);
  // Body.
  ctx.beginPath();
  ctx.moveTo(-15, cy + 30);
  ctx.quadraticCurveTo(-19, cy + 16, -9, cy + 12);
  ctx.quadraticCurveTo(0, cy + 9, 9, cy + 12);
  ctx.quadraticCurveTo(19, cy + 16, 15, cy + 30);
  ctx.quadraticCurveTo(0, cy + 33, -15, cy + 30);
  ctx.closePath();
  ctx.fillStyle = rGrad(ctx, -5, cy + 17, 1, 22, [
    [0, tint(COPPER, 0.5)],
    [0.6, COPPER],
    [1, mix(COPPER, COPPER_LINE, 0.4)],
  ]);
  ctx.fill();
  stroke(ctx, COPPER_LINE, 2.2);
  // Lid + knob.
  ctx.beginPath();
  ctx.ellipse(0, cy + 11.5, 7.5, 2.8, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = tint(COPPER, 0.2);
  ctx.fill();
  stroke(ctx, COPPER_LINE, 1.6);
  ctx.beginPath();
  ctx.arc(0, cy + 7.6, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = BUTTER;
  ctx.fill();
  stroke(ctx, COPPER_LINE, 1.4);
  // A friendly dent + shine.
  ctx.beginPath();
  ctx.arc(7, cy + 23, 3.4, Math.PI * 0.9, Math.PI * 1.7);
  stroke(ctx, rgba(COPPER_LINE, 0.55), 1.4);
  ctx.beginPath();
  ctx.moveTo(-10, cy + 25);
  ctx.quadraticCurveTo(-11, cy + 17, -6, cy + 15);
  stroke(ctx, rgba(CREAM, 0.8), 2);
}

/** Spout tip in kettle-local coords (before tilt). */
export const SPOUT = { x: -25.5, y: 11 };

function glassPath(ctx: Ctx): void {
  ctx.moveTo(-8, -20);
  ctx.lineTo(8, -20);
  ctx.lineTo(6.2, -1.6);
  ctx.quadraticCurveTo(6, 0, 4.4, 0);
  ctx.lineTo(-4.4, 0);
  ctx.quadraticCurveTo(-6, 0, -6.2, -1.6);
  ctx.closePath();
}

/** Chiya glass, local coords, base centre at (0,0). */
export function drawGlass(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 9, 2.4, 0.18);
  ctx.beginPath();
  glassPath(ctx);
  ctx.fillStyle = rgba(tint(P.powder, 0.6), 0.35);
  ctx.fill();
  stroke(ctx, rgba(mix(P.powder, P.ink, 0.35), 0.75), 1.4);
  ctx.beginPath();
  ctx.ellipse(0, -20, 8, 1.8, 0, 0, Math.PI * 2);
  stroke(ctx, rgba(mix(P.powder, P.ink, 0.3), 0.6), 1.2);
  ctx.beginPath();
  ctx.moveTo(-4.6, -16);
  ctx.lineTo(-3.8, -4);
  stroke(ctx, rgba(CREAM, 0.85), 1.6);
}

/** The chiya inside the glass (full); revealed bottom-up by cropping. */
export function drawTea(ctx: Ctx): void {
  withState(ctx, () => {
    ctx.beginPath();
    glassPath(ctx);
    ctx.clip();
    ctx.fillStyle = vGrad(ctx, -17, 0, [
      [0, TEA],
      [1, mix(TEA, P.bark, 0.18)],
    ]);
    ctx.fillRect(-9, -16.5, 18, 15);
    ctx.beginPath();
    ctx.ellipse(0, -16.4, 7.4, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = tint(TEA, 0.45);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(-4.6, -14);
  ctx.lineTo(-3.8, -4);
  stroke(ctx, rgba(CREAM, 0.6), 1.4);
}

/** The pour: one peach arc from the tilted spout into the glass mouth. */
export function streamEnds(): { sx: number; sy: number; ex: number; ey: number } {
  const k = BG.kettle;
  const a = (k.tilt * Math.PI) / 180;
  const sx = k.x + SPOUT.x * Math.cos(a) - SPOUT.y * Math.sin(a);
  const sy = k.y + SPOUT.x * Math.sin(a) + SPOUT.y * Math.cos(a);
  return { sx, sy, ex: BG.glass.x - 1, ey: BG.glass.y - 17 };
}

export function drawStream(ctx: Ctx): void {
  const { sx, sy, ex, ey } = streamEnds();
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx - 7, sy - 1, ex, sy + (ey - sy) * 0.35, ex, ey);
  };
  path();
  stroke(ctx, mix(TEA, P.bark, 0.2), 4.2);
  path();
  stroke(ctx, TEA, 3);
  path();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(tint(TEA, 0.6), 0.9);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

function win(b: Baker, name: string, draw: (ctx: Ctx) => void): void {
  const w = BW[name];
  b.tex(bKey(name), w.w, w.h, (ctx) => {
    ctx.translate(-w.x0, -w.y0);
    draw(ctx);
  });
}

export function bake(b: Baker): void {
  win(b, 'body', drawBody);
  win(b, 'head', drawHead);
  win(b, 'horns', drawHorns);
  win(b, 'earL', (c) => drawEar(c, -1));
  win(b, 'earR', (c) => drawEar(c, 1));
  win(b, 'fringe', drawFringe);
  win(b, 'eyesSmile', (c) => drawEyes(c, 'smile'));
  win(b, 'eyesHappy', (c) => drawEyes(c, 'happy'));
  win(b, 'eyesRound', (c) => drawEyes(c, 'round'));
  win(b, 'eyesClosed', (c) => drawEyes(c, 'closed'));
  win(b, 'blush', (c) => {
    for (const p of BG.blush) blush(c, p.x, p.y, 9, 4.5, 0.6);
  });
  win(b, 'mouthSmile', (c) => drawMouth(c, 'smile'));
  win(b, 'mouthTalk', (c) => drawMouth(c, 'talk'));
  win(b, 'mouthO', (c) => drawMouth(c, 'o'));
  win(b, 'muffler', drawMuffler);
  win(b, 'mufflerTails', drawMufflerTails);
  win(b, 'bell', drawBell);
  win(b, 'hoofL', (c) => drawHoof(c, -1));
  win(b, 'hoofR', (c) => drawHoof(c, 1));
  win(b, 'swatch', drawSwatch);
  win(b, 'yarn', drawYarn);
  win(b, 'ball', drawBall);
  win(b, 'needle', drawNeedle);
  win(b, 'kettle', drawKettle);
  win(b, 'glass', drawGlass);
  win(b, 'tea', drawTea);
  win(b, 'stream', drawStream);
}
