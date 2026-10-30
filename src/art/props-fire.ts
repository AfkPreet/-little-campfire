/**
 * Campfire (WORLD 3.2): a ring of 7 round stones and 3 crossed logs, ~110
 * wide. Layers (back to front): back stones + ash bed, crossed logs, flames,
 * front log + front stones. Flames are 3 nested colour layers + 2 tongues so
 * each flickers on its own. `prop_fire_rim` is a white mask of the fire-facing
 * edges (tinted glow, ADD, by warmLight); `prop_fire_sil` is the union shape
 * for the highlight outline.
 * Keys: prop_fire_back, prop_fire_logs, prop_fire_front, prop_fire_rim,
 * prop_fire_sil, prop_flame_outer, prop_flame_mid, prop_flame_core,
 * prop_flame_tongue.
 */
import { type Baker, type Ctx, blobPath, rGrad, roundRectPath, vGrad, withState, artRng } from './kit';
import { FIRE, ptex } from './props-geo';
import { filled } from './props-tents';
import { A, P, mix, rgba, shade, tint } from '@/palette';

interface Stone {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
}

const { ring } = FIRE;
function stoneAt(k: number): Stone {
  const a = Math.PI / 2 + (k * Math.PI * 2) / 7;
  const front = Math.sin(a);
  const s = 0.8 + 0.22 * (front + 1) * 0.5;
  return {
    x: Math.cos(a) * ring.rx,
    y: ring.cy + Math.sin(a) * ring.ry,
    rx: (k % 2 ? 12.5 : 13.5) * s,
    ry: (k % 3 ? 9.6 : 10.4) * s,
    seed: 11 + k * 7,
  };
}
const STONES = Array.from({ length: 7 }, (_, k) => stoneAt(k));
const BACK = [3, 4, 2, 5];
const FRONT = [1, 6, 0];

function stonePath(s: Stone): Path2D {
  const p = new Path2D();
  blobPath(p, s.x, s.y - s.ry * 0.85, s.rx, s.ry, 0.07, s.seed, 9);
  return p;
}

function drawStone(ctx: Ctx, s: Stone, mossy: boolean): void {
  const p = stonePath(s);
  const top = s.y - s.ry * 1.85;
  filled(
    ctx,
    p,
    vGrad(ctx, top, s.y, [
      [0, tint(A.stone, 0.42)],
      [0.55, A.stone],
      [1, mix(A.stone, A['stone-shade'], 0.6)],
    ]),
    A['stone-shade'],
    () => {
      ctx.fillStyle = rgba(P.cream, 0.5);
      ctx.beginPath();
      ctx.ellipse(s.x - s.rx * 0.35, top + s.ry * 0.55, s.rx * 0.34, s.ry * 0.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      if (mossy) {
        ctx.fillStyle = rgba(P.sage, 0.9);
        ctx.beginPath();
        ctx.ellipse(s.x + s.rx * 0.2, top + 1, s.rx * 0.55, s.ry * 0.38, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(tint(P.sage, 0.4), 0.9);
        ctx.beginPath();
        ctx.ellipse(s.x + s.rx * 0.1, top - 0.5, s.rx * 0.3, s.ry * 0.16, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    2.2,
  );
}

interface Log {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r: number;
  /** Which end shows end grain (the other end is charred). */
  grain: 0 | 1 | 2;
}

const X_LOGS: Log[] = [
  { x0: -40, y0: -8, x1: 14, y1: -36, r: 6.2, grain: 0 },
  { x0: 40, y0: -8, x1: -14, y1: -36, r: 6.2, grain: 0 },
];
const FRONT_LOG: Log = { x0: -30, y0: -9, x1: 31, y1: -11, r: 6.6, grain: 2 };

function logPath(l: Log): { path: Path2D; len: number; ang: number } {
  const len = Math.hypot(l.x1 - l.x0, l.y1 - l.y0);
  const ang = Math.atan2(l.y1 - l.y0, l.x1 - l.x0);
  const p = new Path2D();
  const m = new DOMMatrix().translateSelf(l.x0, l.y0).rotateSelf((ang * 180) / Math.PI);
  const local = new Path2D();
  roundRectPath(local, 0, -l.r, len, l.r * 2, l.r);
  p.addPath(local, m);
  return { path: p, len, ang };
}

function drawLog(ctx: Ctx, l: Log): void {
  const { path, len, ang } = logPath(l);
  filled(ctx, path, P.bark, P.bark, () => {
    withState(ctx, () => {
      ctx.translate(l.x0, l.y0);
      ctx.rotate(ang);
      ctx.fillStyle = vGrad(ctx, -l.r, l.r, [
        [0, tint(P.bark, 0.35)],
        [0.5, P.bark],
        [1, shade(P.bark, 0.12)],
      ]);
      ctx.fillRect(-2, -l.r - 2, len + 4, l.r * 2 + 4);
      // Bark lines.
      ctx.strokeStyle = rgba(shade(P.bark, 0.3), 0.45);
      ctx.lineWidth = 1.1;
      const r = artRng(Math.round(len * 13));
      for (let i = 0; i < 4; i++) {
        const y = -l.r * 0.5 + r() * l.r;
        const x = 4 + r() * (len * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8 + r() * 14, y + (r() - 0.5));
        ctx.stroke();
      }
      // Charred end (toward the fire).
      const charFromEnd = l.grain === 0;
      if (l.grain !== 2) {
        const cx0 = charFromEnd ? len * 0.6 : 0;
        const cx1 = charFromEnd ? len + 2 : len * 0.4;
        const g = ctx.createLinearGradient(cx0, 0, cx1, 0);
        const charCol = mix(A['tawa-iron'], P.bark, 0.3);
        g.addColorStop(charFromEnd ? 0 : 1, rgba(charCol, 0));
        g.addColorStop(charFromEnd ? 1 : 0, rgba(charCol, 0.95));
        ctx.fillStyle = g;
        ctx.fillRect(cx0, -l.r - 2, cx1 - cx0, l.r * 2 + 4);
        ctx.fillStyle = rgba(P.ember, 0.85);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(len - 3 - r() * 9, -l.r * 0.6 + r() * l.r * 1.2, 1.4 + r(), 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }, 2.2);
  // End grain caps.
  const ends: [number, number][] = l.grain === 2 ? [[l.x0, l.y0], [l.x1, l.y1]] : [[l.x0, l.y0]];
  for (const [ex, ey] of ends) {
    const cap = new Path2D();
    cap.ellipse(ex, ey, l.r * 0.55, l.r * 0.95, ang, 0, Math.PI * 2);
    filled(ctx, cap, tint(A['shop-wood'], 0.25), A['shop-wood'], () => {
      ctx.strokeStyle = rgba(shade(A['shop-wood'], 0.25), 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(ex, ey, l.r * 0.3, l.r * 0.52, ang, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }, 1.8);
  }
}

function ashBed(ctx: Ctx): void {
  ctx.fillStyle = rGrad(ctx, 0, ring.cy, 0, 36, [
    [0, mix(A.pebble, P.ember, 0.25)],
    [0.6, mix(A.pebble, P.cream, 0.15)],
    [1, mix(A.pebble, A['stone-shade'], 0.4)],
  ]);
  withState(ctx, () => {
    ctx.translate(0, ring.cy);
    ctx.scale(1, 0.24);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
  });
  const r = artRng(5);
  for (let i = 0; i < 9; i++) {
    const x = (r() - 0.5) * 34;
    const y = ring.cy + (r() - 0.5) * 6;
    const rr = 2.2 + r() * 2.4;
    ctx.fillStyle = rGrad(ctx, x, y, 0, rr, [
      [0, P.glow, 0.95],
      [0.5, P.ember, 0.9],
      [1, P.ember, 0],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Flames: rounded teardrops (no outline), soft-edged.
function tear(ctx: Ctx, x: number, w: number, h: number, lean: number): void {
  ctx.moveTo(x + lean, -h);
  ctx.bezierCurveTo(x + lean * 0.6 + w * 0.16, -h * 0.74, x + w * 0.56, -h * 0.5, x + w * 0.5, -h * 0.22);
  ctx.bezierCurveTo(x + w * 0.47, -h * 0.02, x + w * 0.24, 0, x, 0);
  ctx.bezierCurveTo(x - w * 0.24, 0, x - w * 0.47, -h * 0.02, x - w * 0.5, -h * 0.22);
  ctx.bezierCurveTo(x - w * 0.56, -h * 0.5, x + lean * 0.6 - w * 0.16, -h * 0.74, x + lean, -h);
  ctx.closePath();
}

function flame(ctx: Ctx, parts: [number, number, number, number][], top: string, bottom: string, edge: string, h: number, blur: number): void {
  withState(ctx, () => {
    ctx.shadowColor = rgba(edge, 0.75);
    ctx.shadowBlur = blur;
    ctx.fillStyle = vGrad(ctx, -h, 0, [
      [0, top],
      [1, bottom],
    ]);
    ctx.beginPath();
    for (const [x, w, hh, lean] of parts) tear(ctx, x, w, hh, lean);
    ctx.fill();
  });
}

function drawSil(ctx: Ctx): void {
  ctx.fillStyle = '#FFFFFF';
  for (const k of [...BACK, ...FRONT]) ctx.fill(stonePath(STONES[k]));
  for (const l of [...X_LOGS, FRONT_LOG]) ctx.fill(logPath(l).path);
  ctx.beginPath();
  ctx.ellipse(0, ring.cy - 4, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function bake(b: Baker): void {
  const { w, h, ax, ay } = FIRE;
  ptex(b, 'prop_fire_back', w, h, ax, ay, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 0, ring.cy + 4, 0, 62, [
      [0, P.ink, 0.16],
      [0.7, P.ink, 0.07],
      [1, P.ink, 0],
    ]);
    withState(ctx, () => {
      ctx.translate(0, ring.cy + 4);
      ctx.scale(1, 0.26);
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.fill();
    });
    ashBed(ctx);
    for (const k of BACK) drawStone(ctx, STONES[k], k === 3);
  });
  ptex(b, 'prop_fire_logs', w, h, ax, ay, (ctx) => {
    for (const l of X_LOGS) drawLog(ctx, l);
  });
  ptex(b, 'prop_fire_front', w, h, ax, ay, (ctx) => {
    drawLog(ctx, FRONT_LOG);
    for (const k of FRONT) drawStone(ctx, STONES[k], k === 6);
  });
  ptex(b, 'prop_fire_rim', w, h, ax, ay, (ctx) => {
    // Fire-facing (inner, upper) edges of the front stones and logs.
    withState(ctx, () => {
      for (const k of FRONT) {
        const s = STONES[k];
        const p = stonePath(s);
        withState(ctx, () => {
          ctx.clip(p);
          const dir = -Math.sign(s.x) || 0;
          ctx.fillStyle = rGrad(ctx, s.x + dir * s.rx * 0.6, s.y - s.ry * 1.9, 0, s.rx * 1.3, [
            [0, '#FFFFFF', 0.95],
            [1, '#FFFFFF', 0],
          ]);
          ctx.fillRect(s.x - s.rx - 2, s.y - s.ry * 2 - 2, s.rx * 2 + 4, s.ry * 2 + 4);
        });
      }
      const { path } = logPath(FRONT_LOG);
      withState(ctx, () => {
        ctx.clip(path);
        ctx.fillStyle = vGrad(ctx, -18, -6, [
          [0, '#FFFFFF', 0.9],
          [1, '#FFFFFF', 0],
        ]);
        ctx.fillRect(-36, -20, 72, 14);
      });
    });
  });
  ptex(b, 'prop_fire_sil', w, h, ax, ay, drawSil);

  // Flames (anchor at the flame base, bottom centre).
  ptex(b, 'prop_flame_outer', 64, 84, 32, 78, (ctx) =>
    flame(ctx, [
      [0, 40, 66, 3],
      [-11, 24, 40, -7],
      [12, 24, 44, 6],
    ], mix(P.ember, P.peach, 0.15), mix(P.ember, P.glow, 0.35), P.ember, 66, 6),
  );
  ptex(b, 'prop_flame_mid', 44, 60, 22, 55, (ctx) =>
    flame(ctx, [
      [0, 27, 44, 2],
      [-6, 15, 26, -4],
    ], mix(P.glow, P.ember, 0.2), P.glow, P.glow, 44, 4),
  );
  ptex(b, 'prop_flame_core', 28, 38, 14, 34, (ctx) =>
    flame(ctx, [[0, 15, 25, 1]], P.butter, P.cream, P.butter, 25, 3),
  );
  ptex(b, 'prop_flame_tongue', 24, 40, 12, 35, (ctx) =>
    flame(ctx, [[0, 13, 30, 3]], mix(P.ember, P.peach, 0.2), mix(P.ember, P.glow, 0.45), P.ember, 30, 3),
  );
}
