/**
 * Kuhiro, the great mist-fish of Jun Pokhari (WORLD 5.4). Every part is baked
 * once at boot into "kuhiro_" textures in neutral daylight colours; the
 * runtime (src/chars/Kuhiro.ts) relights them with multiply tints and adds
 * additive glow sprites on top.
 *
 * Body-local coordinates: origin at the waterline under the head when risen,
 * y negative is up, the fish faces left (toward the dock).
 */
import { Baker, type Ctx, lGrad, rGrad, vGrad, withState } from './kit';
import { A, P, mix, rgba } from '@/palette';

// ---------------------------------------------------------------------------
// Geometry (shared with the runtime)
// ---------------------------------------------------------------------------

/** Control points of the body bean (Catmull-Rom, closed). */
export const SIL: [number, number][] = [
  [-150, 62],
  [-171, 4],
  [-181, -60],
  [-182, -122],
  [-169, -188],
  [-137, -243],
  [-87, -283],
  [-22, -302],
  [52, -299],
  [128, -282],
  [204, -251],
  [274, -206],
  [333, -150],
  [373, -88],
  [395, -18],
  [401, 48],
  [380, 116],
  [302, 160],
  [160, 178],
  [12, 172],
  [-100, 132],
];

/** Body texture bounds in body-local px. */
export const BODY_BOX = { x0: -232, y0: -334, w: 664, h: 532 };

/** Where every part sits (body-local px). */
export const KH = {
  eyeNear: { x: -60, y: -170 },
  eyeFar: { x: -139, y: -167, sx: 0.8 },
  eye: { rx: 17, ry: 20 },
  mouth: { x: -103, y: -112 },
  blushNear: { x: -16, y: -121 },
  blushFar: { x: -160, y: -119, sx: 0.55 },
  gills: { x: 50, y: -150 },
  flower: { x: 142, y: -172, ring: 22, r: 5, rc: 6 },
  scattered: [
    [92, -214, 2.6],
    [100, -126, 2.2],
    [186, -222, 2.8],
    [196, -124, 2.4],
    [222, -176, 3],
    [160, -100, 2],
    [124, -246, 2.2],
    [246, -138, 2.4],
    [66, -236, 2],
    [238, -214, 2.2],
    [112, -168, 1.8],
  ] as [number, number, number][],
  heart: { x: 76, y: -92 },
  finNear: { x: 28, y: -88, angle: 30 },
  finFar: { x: -126, y: -50, angle: 166 },
  crest: { x: 196, y: -236 },
  tail: { x: 446 },
  halo: { x: 110, y: -140, w: 900, h: 500 },
  /** Pivot for head tilts (in the face). */
  pivot: { x: -110, y: -140 },
};

/** The Gurans flower: 5 in a ring (from the top, clockwise) then the centre. Same order as the sky. */
export function gurans(cx: number, cy: number, ring: number): { x: number; y: number; centre: boolean }[] {
  const out: { x: number; y: number; centre: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    out.push({ x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, centre: false });
  }
  out.push({ x: cx, y: cy, centre: true });
  return out;
}

function catmull(pts: [number, number][], closed: boolean, n: number): [number, number][] {
  const out: [number, number][] = [];
  const N = pts.length;
  const segs = closed ? N : N - 1;
  const at = (i: number) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
}

let dense: [number, number][] | null = null;
/** Dense polyline of the body outline. */
export function silDense(): [number, number][] {
  if (!dense) dense = catmull(SIL, true, 18);
  return dense;
}

/** All x crossings of the outline with the horizontal line y. */
function crossings(y: number): number[] {
  const d = silDense();
  const xs: number[] = [];
  for (let i = 0; i < d.length; i++) {
    const a = d[i];
    const b = d[(i + 1) % d.length];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      const t = (y - a[1]) / (b[1] - a[1]);
      xs.push(a[0] + (b[0] - a[0]) * t);
    }
  }
  return xs;
}

/** Leftmost and rightmost outline x at body height y (null above/below the body). */
export function crossSection(y: number): [number, number] | null {
  const xs = crossings(y);
  if (xs.length < 2) return null;
  return [Math.min(...xs), Math.max(...xs)];
}

/** Top of the outline at x (min y), or null. */
export function topY(x: number): number | null {
  const d = silDense();
  let best: number | null = null;
  for (let i = 0; i < d.length; i++) {
    const a = d[i];
    const b = d[(i + 1) % d.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) {
      const t = (x - a[0]) / (b[0] - a[0]);
      const y = a[1] + (b[1] - a[1]) * t;
      if (best === null || y < best) best = y;
    }
  }
  return best;
}

/** The upper outline from the face front over the back to the waterline exit, as points. */
export function topContour(x0 = -182, x1 = 400, step = 3): [number, number][] {
  const out: [number, number][] = [];
  for (let x = x0; x <= x1; x += step) {
    const y = topY(x);
    if (y !== null && y < 30) out.push([x, y]);
  }
  return out;
}

export interface ScaleSpec {
  x: number;
  y: number;
  r: number;
  a: number;
  /** 0 at the head .. 1 at the tail (for the shimmer sweep). */
  p: number;
  row: number;
}

let scalesCache: ScaleSpec[] | null = null;
/** The 3 staggered rows of cloud scallops over the upper back. */
export function scaleList(): ScaleSpec[] {
  if (scalesCache) return scalesCache;
  const c = topContour(-40, 402, 2);
  // Arc length along the contour.
  const s: number[] = [0];
  for (let i = 1; i < c.length; i++) s.push(s[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const total = s[s.length - 1];
  const at = (len: number): { x: number; y: number; tx: number; ty: number } => {
    let i = 1;
    while (i < s.length - 1 && s[i] < len) i++;
    const t = (len - s[i - 1]) / Math.max(1e-6, s[i] - s[i - 1]);
    const x = c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t;
    const y = c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t;
    const tx = c[i][0] - c[i - 1][0];
    const ty = c[i][1] - c[i - 1][1];
    const l = Math.hypot(tx, ty) || 1;
    return { x, y, tx: tx / l, ty: ty / l };
  };
  const rows = [
    { d: 30, r: 35, start: 66, step: 60 },
    { d: 80, r: 37, start: 196, step: 60 },
    { d: 130, r: 39, start: 300, step: 62 },
  ];
  const out: ScaleSpec[] = [];
  rows.forEach((row, ri) => {
    for (let len = row.start; len < total - 10; len += row.step) {
      const p = at(len);
      // Inward normal (the body is below the upper outline).
      const nx = -p.ty;
      const ny = p.tx;
      const x = p.x + nx * row.d;
      const y = p.y + ny * row.d;
      if (y > -30) continue;
      const cs = crossSection(y);
      if (!cs || x > cs[1] - row.r * 0.55) continue;
      out.push({ x, y, r: row.r, a: Math.atan2(p.ty, p.tx), p: 0, row: ri });
    }
  });
  const xs = out.map((o) => o.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  for (const o of out) o.p = (o.x - minX) / Math.max(1, maxX - minX);
  // Tail-most first so the scallops nearer the head overlap them.
  out.sort((a, b) => b.x - a.x);
  scalesCache = out;
  return out;
}

/** Number of baked eyelid frames (the last one is fully closed). */
export const LID_FRAMES = 9;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const C = {
  spine: A['mist-lavender'],
  flank: A.mistfish,
  belly: A.moonmilk,
  line: A['mistfish-line'],
  glow: A['fish-glow'],
  edge: A['fish-glow-edge'],
};

function bodyPath(ctx: Ctx): void {
  const d = silDense();
  ctx.moveTo(d[0][0], d[0][1]);
  for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]);
  ctx.closePath();
}

function strokeOpen(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

/** The body's painted skin (also used behind the eyelids so they match exactly). */
function drawSkin(ctx: Ctx, details: boolean): void {
  withState(ctx, () => {
    ctx.beginPath();
    bodyPath(ctx);
    ctx.clip();
    ctx.fillStyle = vGrad(ctx, -305, 180, [
      [0, C.spine],
      [0.14, mix(C.spine, C.flank, 0.5)],
      [0.3, C.flank],
      [0.47, mix(C.flank, C.belly, 0.55)],
      [0.6, C.belly],
      [1, mix(C.belly, C.flank, 0.35)],
    ]);
    ctx.fillRect(-260, -340, 720, 560);
    // Tail-ward lavender wash: the body deepens as it flows into the lake.
    ctx.fillStyle = lGrad(ctx, -20, 0, 420, 0, [
      [0, C.spine, 0],
      [0.55, C.spine, 0.12],
      [1, C.spine, 0.42],
    ]);
    ctx.fillRect(-260, -340, 720, 560);
    // The pale, round face.
    withState(ctx, () => {
      ctx.translate(-108, -138);
      ctx.scale(1, 0.9);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 132, [
        [0, C.belly, 0.62],
        [0.55, C.belly, 0.32],
        [1, C.belly, 0],
      ]);
      ctx.fillRect(-160, -160, 320, 320);
    });
    // Moonlit forehead.
    withState(ctx, () => {
      ctx.translate(-70, -258);
      ctx.scale(1.5, 0.75);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 90, [
        [0, C.glow, 0.5],
        [1, C.glow, 0],
      ]);
      ctx.fillRect(-100, -100, 200, 200);
    });
    if (!details) return;
    // Soft core shade low on the rear flank (cool, ink-free).
    withState(ctx, () => {
      ctx.translate(300, -40);
      ctx.scale(1.2, 1);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 190, [
        [0, C.line, 0.2],
        [0.6, C.line, 0.08],
        [1, C.line, 0],
      ]);
      ctx.fillRect(-200, -200, 400, 400);
    });
    // Inner rim light along the upper outline.
    const top = topContour(-182, 398, 3).filter((p) => p[1] < -40);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // A soft band of spine lavender just inside the back.
    ctx.strokeStyle = rgba(C.spine, 0.22);
    ctx.lineWidth = 80;
    strokeOpen(
      ctx,
      top.filter((p) => p[0] > -60).map((p) => [p[0], p[1] + 34] as [number, number]),
    );
    ctx.strokeStyle = rgba(C.glow, 0.12);
    ctx.lineWidth = 26;
    strokeOpen(ctx, top);
    ctx.strokeStyle = rgba(C.glow, 0.2);
    ctx.lineWidth = 8;
    strokeOpen(ctx, top);
  });
}

function drawScales(ctx: Ctx): void {
  withState(ctx, () => {
    ctx.beginPath();
    bodyPath(ctx);
    ctx.clip();
    ctx.lineCap = 'round';
    for (const s of scaleList()) {
      withState(ctx, () => {
        ctx.translate(s.x, s.y);
        ctx.rotate(s.a);
        ctx.scale(1, 0.92);
        // Faint cloud-puff body of the scallop.
        ctx.beginPath();
        ctx.arc(0, 0, s.r, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = rGrad(ctx, -s.r * 0.25, 0, 0, s.r, [
          [0, C.belly, 0],
          [0.6, C.belly, 0.04],
          [0.9, C.belly, 0.16],
          [1, C.belly, 0.22],
        ]);
        ctx.fill();
        // The lighter arc (moonmilk 0.35, feathered)...
        ctx.beginPath();
        ctx.arc(0, 0, s.r - 4, -1.36, 1.36);
        ctx.strokeStyle = rgba(C.belly, 0.14);
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = rgba(C.belly, 0.24);
        ctx.lineWidth = 5;
        ctx.stroke();
        // ...with a fish-glow inner edge.
        ctx.beginPath();
        ctx.arc(0, 0, s.r - 8.5, -1.22, 1.22);
        ctx.strokeStyle = rgba(C.glow, 0.5);
        ctx.lineWidth = 1.3;
        ctx.stroke();
      });
    }
  });
}

function drawBody(ctx: Ctx): void {
  drawSkin(ctx, true);
  drawScales(ctx);
  // Faint grain so it reads as a picture-book page.
  withState(ctx, () => {
    ctx.beginPath();
    bodyPath(ctx);
    ctx.clip();
    let seed = 17;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 900; i++) {
      const x = -190 + rnd() * 600;
      const y = -310 + rnd() * 480;
      ctx.fillStyle = rgba(rnd() < 0.5 ? C.line : C.belly, 0.05);
      ctx.beginPath();
      ctx.arc(x, y, 0.7 + rnd() * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // The only cool outline in the cast.
  ctx.beginPath();
  bodyPath(ctx);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.stroke();
  // The part that always stays under the lake fades, so only a soft ghost shows through the water.
  withState(ctx, () => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = vGrad(ctx, 8, 190, [
      [0, '#FFFFFF', 0],
      [0.3, '#FFFFFF', 0.5],
      [1, '#FFFFFF', 0.85],
    ]);
    ctx.fillRect(-260, 8, 720, 200);
  });
}

/** Eyelid frame k of LID_FRAMES (k = LID_FRAMES is fully closed, no lash). */
function drawLid(ctx: Ctx, k: number, ex: number, ey: number, sx: number): void {
  const { rx, ry } = KH.eye;
  const f = k / LID_FRAMES;
  const R = rx + 2.2;
  const H = ry + 2.2;
  const base = -H + f * (2 * H);
  const bulge = k >= LID_FRAMES ? 0 : 4.5 * Math.sin(Math.PI * Math.min(1, f + 0.2));
  const edge = (x: number) => base + bulge * (1 - (x / R) * (x / R));
  const edgePts: [number, number][] = [];
  for (let x = -R - 1; x <= R + 1; x += 1) edgePts.push([x, edge(Math.max(-R, Math.min(R, x)))]);
  withState(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, R, H, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-R - 2, -H - 4);
    ctx.lineTo(R + 2, -H - 4);
    for (let i = edgePts.length - 1; i >= 0; i--) ctx.lineTo(edgePts[i][0], edgePts[i][1]);
    ctx.closePath();
    ctx.clip();
    // Paint the body skin behind, aligned to where this eye sits.
    withState(ctx, () => {
      ctx.scale(1 / sx, 1);
      ctx.translate(-ex, -ey);
      drawSkin(ctx, false);
    });
    // A whisper of mistfish so the lid reads as a lid.
    ctx.fillStyle = rgba(A.mistfish, 0.35);
    ctx.fillRect(-R - 4, -H - 4, 2 * R + 8, 2 * H + 8);
  });
  if (k < LID_FRAMES) {
    withState(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(0, 0, R + 0.5, H + 0.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2.6;
      strokeOpen(ctx, edgePts);
      ctx.strokeStyle = rgba(C.glow, 0.55);
      ctx.lineWidth = 1.4;
      strokeOpen(
        ctx,
        edgePts.map((p) => [p[0], p[1] - 2.4] as [number, number]),
      );
    });
  }
}

/** Rhododendron-petal fin pointing along +x from its root at (0,0). */
function petalPath(ctx: Ctx, len: number, wid: number): void {
  const h = wid / 2;
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.18, -h * 0.55, len * 0.36, -h * 1.02, len * 0.66, -h * 0.98);
  ctx.bezierCurveTo(len * 0.9, -h * 0.94, len * 1.0, -h * 0.5, len * 0.985, -h * 0.12);
  // The tiny notch at the tip.
  ctx.quadraticCurveTo(len * 0.94, 0, len * 0.985, h * 0.12);
  ctx.bezierCurveTo(len * 1.0, h * 0.5, len * 0.9, h * 0.94, len * 0.66, h * 0.98);
  ctx.bezierCurveTo(len * 0.36, h * 1.02, len * 0.18, h * 0.55, 0, 0);
  ctx.closePath();
}

function drawPetalFin(ctx: Ctx, len: number, wid: number): void {
  withState(ctx, () => {
    ctx.beginPath();
    petalPath(ctx, len, wid);
    ctx.fillStyle = lGrad(ctx, 0, 0, len, 0, [
      [0, C.spine, 0.78],
      [0.6, mix(C.spine, C.glow, 0.35), 0.55],
      [1, mix(C.spine, C.glow, 0.7), 0.5],
    ]);
    ctx.fill();
    // 3 soft radial veins.
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(C.line, 0.36);
    ctx.lineWidth = 1.6;
    for (const k of [-0.42, 0, 0.42]) {
      ctx.beginPath();
      ctx.moveTo(len * 0.08, 0);
      ctx.quadraticCurveTo(len * 0.5, wid * k * 0.32, len * 0.86, wid * k * 0.62);
      ctx.stroke();
    }
    // Glowing rim.
    ctx.beginPath();
    petalPath(ctx, len, wid);
    ctx.strokeStyle = rgba(C.glow, 0.28);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba(C.line, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    petalPath(ctx, len, wid);
    ctx.clip();
    ctx.strokeStyle = rgba(C.glow, 0.85);
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function crestPath(ctx: Ctx): void {
  // Low rounded crest, swept back; base along y = 0 from x -70 to 80.
  ctx.moveTo(-66, 8);
  ctx.bezierCurveTo(-58, -12, -38, -31, -10, -33);
  ctx.bezierCurveTo(24, -35, 54, -20, 74, 6);
  ctx.lineTo(74, 14);
  ctx.lineTo(-66, 14);
  ctx.closePath();
}

function tailPath(ctx: Ctx): void {
  // Two broad soft lobes in a V, peduncle at (0, 0) at the bottom.
  ctx.moveTo(-13, 0);
  ctx.bezierCurveTo(-15, -30, -42, -62, -80, -98);
  ctx.bezierCurveTo(-98, -116, -88, -142, -64, -130);
  ctx.bezierCurveTo(-42, -116, -18, -88, -2, -64);
  ctx.quadraticCurveTo(3, -58, 8, -64);
  ctx.bezierCurveTo(22, -88, 46, -118, 68, -132);
  ctx.bezierCurveTo(92, -146, 102, -118, 84, -100);
  ctx.bezierCurveTo(46, -64, 18, -30, 15, 0);
  ctx.closePath();
}

export function bake(b: Baker): void {
  const bb = BODY_BOX;
  b.tex('kuhiro_body', bb.w, bb.h, (ctx) => {
    ctx.translate(-bb.x0, -bb.y0);
    drawBody(ctx);
  });

  // Back gleam: soft light along the upper outline (drawn at half size; it is all softness).
  const gb = { x0: -200, y0: -320, w: 620, h: 300 };
  b.tex('kuhiro_gleam', gb.w / 2, gb.h / 2, (ctx) => {
    ctx.scale(0.5, 0.5);
    ctx.translate(-gb.x0, -gb.y0);
    withState(ctx, () => {
      ctx.beginPath();
      bodyPath(ctx);
      ctx.clip();
      const top = topContour(-160, 392, 3).filter((p) => p[1] < -30);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const [w, a] of [
        [64, 0.12],
        [38, 0.22],
        [18, 0.42],
        [7, 0.8],
      ] as [number, number][]) {
        ctx.strokeStyle = rgba('#FFFFFF', a);
        ctx.lineWidth = w;
        strokeOpen(
          ctx,
          top.map((p) => [p[0], p[1] + 8] as [number, number]),
        );
      }
    });
  });

  // One glint per scallop (additive shimmer sweep).
  b.tex('kuhiro_glint', 90, 90, (ctx) => {
    ctx.translate(45, 45);
    ctx.lineCap = 'round';
    for (const [w, a] of [
      [14, 0.18],
      [8, 0.4],
      [3, 1],
    ] as [number, number][]) {
      ctx.strokeStyle = rgba('#FFFFFF', a);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 0, 30, -1.2, 1.2);
      ctx.stroke();
    }
  });

  // Eyes.
  const { rx, ry } = KH.eye;
  b.tex('kuhiro_eye', 48, 52, (ctx) => {
    ctx.translate(24, 26);
    ctx.fillStyle = vGrad(ctx, -ry, ry, [
      [0, P.ink],
      [0.65, P.ink],
      [1, mix(P.ink, C.spine, 0.28)],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Faint moon-snow crescent reflection low in the eye.
    withState(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 2.5, ry - 2.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, 0, rx - 3, ry - 3, 0, 0.15, Math.PI - 0.15);
      ctx.ellipse(0, -3.5, rx - 4, ry - 4, 0, Math.PI - 0.2, 0.2, true);
      ctx.closePath();
      ctx.fillStyle = rgba(A['moon-snow'], 0.3);
      ctx.fill();
    });
    ctx.fillStyle = P.cream;
    ctx.beginPath();
    ctx.arc(-5.5, -8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6.5, 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  for (let k = 1; k <= LID_FRAMES; k++) {
    b.tex(`kuhiro_lidN${k}`, 48, 52, (ctx) => {
      ctx.translate(24, 26);
      drawLid(ctx, k, KH.eyeNear.x, KH.eyeNear.y, 1);
    });
    b.tex(`kuhiro_lidF${k}`, 48, 52, (ctx) => {
      ctx.translate(24, 26);
      drawLid(ctx, k, KH.eyeFar.x, KH.eyeFar.y, KH.eyeFar.sx);
    });
  }
  // Serene closed eye (a soft downward curve) and happy closed eye (^).
  b.tex('kuhiro_eyeClosed', 48, 52, (ctx) => {
    ctx.translate(24, 26);
    ctx.strokeStyle = P.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.quadraticCurveTo(0, 13, 14, 2);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12.5, 4.5);
    ctx.lineTo(-16, 8);
    ctx.stroke();
  });
  b.tex('kuhiro_eyeHappy', 48, 52, (ctx) => {
    ctx.translate(24, 26);
    ctx.strokeStyle = P.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-13, 6);
    ctx.quadraticCurveTo(0, -10, 13, 6);
    ctx.stroke();
  });

  // Mouths.
  b.tex('kuhiro_mouthSmile', 40, 24, (ctx) => {
    ctx.translate(20, 10);
    ctx.strokeStyle = C.line;
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-11, -1);
    ctx.bezierCurveTo(-6, 6.5, 6, 6.5, 11, -1);
    ctx.stroke();
  });
  b.tex('kuhiro_mouthO', 32, 34, (ctx) => {
    ctx.translate(16, 17);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 10.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = rGrad(ctx, 0, 3, 0, 11, [
      [0, mix(C.line, P.rose, 0.35)],
      [1, mix(C.line, P.ink, 0.25)],
    ]);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = rgba(C.glow, 0.45);
    ctx.beginPath();
    ctx.ellipse(-3, -5, 3, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Blush: giant 60 x 28 oval (shown at 60% -> 80%).
  b.tex('kuhiro_blush', 72, 36, (ctx) => {
    ctx.translate(36, 18);
    ctx.scale(1, 14 / 30);
    ctx.fillStyle = rGrad(ctx, 0, 0, 0, 33, [
      [0, P.blush, 1],
      [0.62, P.blush, 0.82],
      [1, P.blush, 0],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 33, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gills: 3 soft curved lines behind the cheek.
  b.tex('kuhiro_gills', 64, 120, (ctx) => {
    ctx.translate(32, 60);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(C.line, 0.55);
    ctx.lineWidth = 3;
    const arcs = [
      [-14, 36],
      [0, 46],
      [14, 36],
    ];
    for (const [x, h] of arcs) {
      ctx.beginPath();
      ctx.moveTo(x - 6, -h);
      ctx.quadraticCurveTo(x + 12, 0, x - 6, h);
      ctx.stroke();
    }
  });

  // Freckle core: glow with a cream heart.
  b.tex('kuhiro_freckle', 24, 24, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 12, 12, 0, 11, [
      [0, mix(P.glow, P.cream, 0.55)],
      [0.45, P.glow],
      [0.75, P.glow, 0.85],
      [1, P.glow, 0],
    ]);
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  // Fins.
  b.tex('kuhiro_fin', 112, 84, (ctx) => {
    ctx.translate(6, 42);
    drawPetalFin(ctx, 100, 68);
  });
  b.tex('kuhiro_crest', 176, 66, (ctx) => {
    ctx.translate(86, 50);
    withState(ctx, () => {
      ctx.beginPath();
      crestPath(ctx);
      ctx.fillStyle = vGrad(ctx, -44, 14, [
        [0, mix(C.spine, C.glow, 0.55), 0.62],
        [1, C.spine, 0.92],
      ]);
      ctx.fill();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(C.line, 0.32);
      ctx.lineWidth = 1.6;
      for (const [x0, x1, y1] of [
        [-40, -52, -18],
        [-10, -14, -36],
        [22, 30, -30],
        [52, 66, -10],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x0 * 0.6, 10);
        ctx.quadraticCurveTo(x0, -4, x1, y1);
        ctx.stroke();
      }
      ctx.beginPath();
      crestPath(ctx);
      ctx.strokeStyle = rgba(C.line, 0.85);
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = rgba(C.glow, 0.8);
      ctx.lineWidth = 3.4;
      ctx.stroke();
    });
  });
  b.tex('kuhiro_tail', 210, 160, (ctx) => {
    ctx.translate(105, 152);
    withState(ctx, () => {
      ctx.beginPath();
      tailPath(ctx);
      ctx.fillStyle = vGrad(ctx, -140, 0, [
        [0, mix(C.spine, C.glow, 0.6), 0.6],
        [0.55, mix(C.spine, C.glow, 0.2), 0.75],
        [1, C.spine, 0.95],
      ]);
      ctx.fill();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(C.line, 0.34);
      ctx.lineWidth = 1.7;
      for (const [x, y] of [
        [-74, -114],
        [-46, -100],
        [-20, -76],
        [26, -78],
        [52, -106],
        [80, -118],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x * 0.12, -8);
        ctx.quadraticCurveTo(x * 0.5, y * 0.45, x, y);
        ctx.stroke();
      }
      ctx.beginPath();
      tailPath(ctx);
      ctx.strokeStyle = rgba(C.glow, 0.3);
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = rgba(C.line, 0.9);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = rgba(C.glow, 0.85);
      ctx.lineWidth = 3.6;
      ctx.stroke();
    });
  });

  // Water veil in lake colours (drawn half size, shown at 2x): hides the
  // submerged body so Kuhiro sits IN the lake, letting a ghost glow through.
  b.tex('kuhiro_veil', 480, 130, (ctx, w, h) => {
    const lake = (t: number) => mix(A['lake-jade'], A['lake-deep'], t);
    ctx.fillStyle = vGrad(ctx, 0, h, [
      [0, lake(0.5)],
      [0.5, lake(0.8)],
      [1, lake(1)],
    ]);
    ctx.fillRect(0, 0, w, h);
    // Alpha mask: soft top edge, soft sides, denser with depth.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = vGrad(ctx, 0, h, [
      [0, '#FFFFFF', 0],
      [0.03, '#FFFFFF', 0.8],
      [0.25, '#FFFFFF', 0.88],
      [1, '#FFFFFF', 0.96],
    ]);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = lGrad(ctx, 0, 0, w, 0, [
      [0, '#FFFFFF', 0],
      [0.16, '#FFFFFF', 1],
      [0.84, '#FFFFFF', 1],
      [1, '#FFFFFF', 0],
    ]);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });

  // Waterline sheen where the body meets the lake.
  b.tex('kuhiro_waterline', 240, 22, (ctx, w, h) => {
    withState(ctx, () => {
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, 0.09);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, w / 2, [
        [0, '#FFFFFF', 0.55],
        [0.8, '#FFFFFF', 0.35],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = lGrad(ctx, 0, 0, w, 0, [
      [0, '#FFFFFF', 0],
      [0.08, '#FFFFFF', 0.9],
      [0.92, '#FFFFFF', 0.9],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 2, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}
