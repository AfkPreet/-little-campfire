/**
 * Tents (WORLD 7.1): Fern Tent, Monsoon Dome, Tin-Roof Cabin. Each type has
 * a standing texture, a flat (unfolded) texture, a doorway mask (tinted
 * `glow`, ADD, for the cozy doorway light) and, for the cabin, a window mask.
 * Shared: the glowing dotted spot outline and the tent peg.
 * Keys: prop_tent_<type>, prop_tent_<type>_flat, prop_tent_<type>_door,
 * prop_tent_cabin_kit_win, prop_tent_spot, prop_peg.
 */
import { type Baker, type Ctx, OUTLINE, artRng, lGrad, rGrad, roundRectPath, smoothClosed, smoothOpen, softShadow, vGrad, withState } from './kit';
import { FLAT, ptex } from './props-geo';
import { A, P, mix, rgba, shade, tint } from '@/palette';

type Pt = [number, number];

/** Fill a path, paint details clipped inside it, then stroke a darker outline. */
export function filled(ctx: Ctx, path: Path2D, fill: string | CanvasGradient, base: string, details?: () => void, lw = OUTLINE): void {
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (details)
    withState(ctx, () => {
      ctx.clip(path);
      details();
    });
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(base, 0.28);
  ctx.stroke(path);
}

function mirrorClosed(right: Pt[], bottom: Pt[]): Pt[] {
  return [...right, ...bottom, ...right.slice(1).reverse().map(([x, y]) => [-x, y] as Pt)];
}

/** A small fern frond print: midrib with alternating leaflets. */
export function frond(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, bend: number, col: string, alpha: number, size = 1): void {
  const cx = (x0 + x1) / 2 + bend * 14;
  const cy = (y0 + y1) / 2;
  ctx.strokeStyle = rgba(col, alpha);
  ctx.fillStyle = rgba(col, alpha);
  ctx.lineWidth = 1.6 * size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  const n = 8;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const a = Math.atan2(dy, dx);
    const len = (10 - t * 6.5) * size;
    for (const s of [-1, 1]) {
      const la = a + s * 1.05;
      withState(ctx, () => {
        ctx.translate(px, py);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.ellipse(len / 2, 0, len / 2, 2.1 * size, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

function stitch(ctx: Ctx, draw: () => void, col: string, alpha = 0.55, lw = 1.2): void {
  withState(ctx, () => {
    ctx.setLineDash([3, 3.2]);
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    draw();
    ctx.stroke();
  });
}

/** Wooden peg nub with a jute loop (pitched tents' guy lines). */
function pegNub(ctx: Ctx, x: number, y: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x - 2.6, y - 9, 5.2, 11, 2.4);
  ctx.fillStyle = tint(P.bark, 0.35);
  ctx.fill();
  ctx.strokeStyle = shade(P.bark, 0.25);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - 9.5, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = P.butter;
  ctx.fill();
  ctx.strokeStyle = shade(P.butter, 0.3);
  ctx.stroke();
}

function guyLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.strokeStyle = shade(A.jute, 0.2);
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.6, y0 + (y1 - y0) * 0.45, x1, y1);
  ctx.stroke();
}

/** Little sewn loop where decor hangs. */
function hangLoop(ctx: Ctx, x: number, y: number, base: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y - 1.5, 3, 3.6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = shade(A.jute, 0.22);
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = A.jute;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - 5.5, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = tint(base, 0.2);
  ctx.fill();
}

function sheen(ctx: Ctx, x: number, y: number, r: number, a = 0.32): void {
  ctx.fillStyle = rGrad(ctx, x, y, 0, r, [
    [0, P.cream, a],
    [1, P.cream, 0],
  ]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------------------------------------------------------------------
// Fern Tent: a soft bell of fern-green canvas, flaps tied back, fern prints.
// ---------------------------------------------------------------------------

const FERN_R: Pt[] = [
  [0, -138],
  [14, -132],
  [30, -118],
  [45, -100],
  [57, -82],
  [66, -62],
  [72, -40],
  [75, -18],
  [75, -5],
  [63, 1],
];
const fernPts = mirrorClosed(FERN_R, [[0, 2.5]]);
const FERN = { base: P.sage, deep: mix(P.sage, P.moss, 0.55), light: tint(P.sage, 0.4) };
const fernInside = mix(shade(P.moss, 0.42), P.ink, 0.12);

function fernDoorPath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, -104);
  p.quadraticCurveTo(-6, -64, -17, -46);
  p.quadraticCurveTo(-25, -24, -28, 1);
  p.lineTo(28, 1);
  p.quadraticCurveTo(25, -24, 17, -46);
  p.quadraticCurveTo(6, -64, 0, -104);
  p.closePath();
  return p;
}

function drawFern(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 104, 10, 0.2);
  for (const s of [-1, 1]) {
    guyLine(ctx, s * 50, -94, s * 96, -3);
    pegNub(ctx, s * 96, 2);
  }
  const body = new Path2D();
  smoothClosed(body, fernPts, 0.5);
  filled(
    ctx,
    body,
    vGrad(ctx, -138, 4, [
      [0, FERN.light],
      [0.5, FERN.base],
      [1, mix(FERN.base, FERN.deep, 0.45)],
    ]),
    FERN.deep,
    () => {
      // Shade side (left) and sun sheen (top right).
      ctx.fillStyle = lGrad(ctx, -80, 0, 8, 0, [
        [0, FERN.deep, 0.5],
        [1, FERN.deep, 0],
      ]);
      ctx.fillRect(-80, -150, 88, 160);
      sheen(ctx, 28, -104, 48, 0.34);
      // Fern prints.
      frond(ctx, -58, -12, -38, -86, 1, P.cream, 0.32, 1);
      frond(ctx, -40, -20, -22, -60, 0.6, P.cream, 0.22, 0.7);
      frond(ctx, 58, -14, 40, -80, -1, P.cream, 0.32, 1);
      // Side seams.
      ctx.strokeStyle = rgba(FERN.deep, 0.35);
      ctx.lineWidth = 1.4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 3, -134);
        ctx.quadraticCurveTo(s * 46, -92, s * 52, 0);
        ctx.stroke();
      }
      // Hem band (bathtub floor).
      ctx.fillStyle = mix(FERN.deep, P.bark, 0.18);
      ctx.fillRect(-80, -11, 160, 16);
      stitch(ctx, () => {
        ctx.moveTo(-74, -14);
        ctx.lineTo(74, -14);
      }, P.cream, 0.5);
    },
  );
  // Doorway: warm shadow inside, flaps tied back with jute.
  const door = fernDoorPath();
  ctx.fillStyle = vGrad(ctx, -104, 2, [
    [0, shade(fernInside, 0.2)],
    [1, fernInside],
  ]);
  ctx.fill(door);
  withState(ctx, () => {
    ctx.clip(door);
    // A peek of the floor and a tiny cushion inside.
    ctx.fillStyle = rgba(mix(P.sage, P.cream, 0.3), 0.35);
    ctx.beginPath();
    ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(P.rose, 0.55);
    ctx.beginPath();
    ctx.ellipse(10, -5, 9, 5, -0.15, 0, Math.PI * 2);
    ctx.fill();
  });
  for (const s of [-1, 1]) {
    const flap = new Path2D();
    flap.moveTo(0, -104);
    flap.quadraticCurveTo(s * 6, -64, s * 17, -46);
    flap.quadraticCurveTo(s * 25, -24, s * 28, 1);
    flap.lineTo(s * 45, 1);
    flap.quadraticCurveTo(s * 41, -24, s * 31, -47);
    flap.quadraticCurveTo(s * 15, -80, 0, -104);
    flap.closePath();
    filled(
      ctx,
      flap,
      vGrad(ctx, -104, 2, [
        [0, tint(FERN.base, 0.25)],
        [1, mix(FERN.base, FERN.light, 0.4)],
      ]),
      FERN.deep,
      () => {
        ctx.strokeStyle = rgba(FERN.deep, 0.32);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s * 26, -42);
        ctx.quadraticCurveTo(s * 34, -20, s * 37, 0);
        ctx.moveTo(s * 21, -44);
        ctx.quadraticCurveTo(s * 28, -22, s * 31, 0);
        ctx.stroke();
      },
      2.2,
    );
    // Jute tie.
    ctx.beginPath();
    ctx.ellipse(s * 24, -46, 4.2, 7.5, s * -0.5, 0, Math.PI * 2);
    ctx.fillStyle = A.jute;
    ctx.fill();
    ctx.strokeStyle = shade(A.jute, 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 25, -41);
    ctx.quadraticCurveTo(s * 29, -33, s * 26, -27);
    ctx.stroke();
  }
  stitch(ctx, () => {
    ctx.moveTo(0, -104);
    ctx.lineTo(0, -128);
  }, FERN.deep, 0.4);
  // Hang loops (CAMP.tentHang.leaf_tent).
  hangLoop(ctx, -62, -78, FERN.base);
  hangLoop(ctx, 62, -78, FERN.base);
  // Pole tip + bead.
  ctx.beginPath();
  roundRectPath(ctx, -2, -150, 4, 16, 2);
  ctx.fillStyle = P.bark;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -152, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, -156, -148, [
    [0, tint(P.butter, 0.3)],
    [1, P.butter],
  ]);
  ctx.fill();
  ctx.strokeStyle = shade(P.butter, 0.32);
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Monsoon Dome: a butter-peach dome under a tin-blue scalloped rain fly.
// ---------------------------------------------------------------------------

const DOME = {
  base: mix(P.butter, P.peach, 0.34),
  fly: A['tin-blue'],
  tub: mix(A['tin-blue'], P.bark, 0.12),
};

function superPts(rx: number, ry: number, n: number, t0: number, t1: number, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push([rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), -ry * Math.pow(Math.max(0, s), 2 / n)]);
  }
  return pts;
}

const hemY = (x: number): number => -92 + 6 * (1 - (x / 90) * (x / 90));

function domeDoorPath(): Path2D {
  const p = new Path2D();
  p.moveTo(-29, 1);
  p.lineTo(-29, -55);
  p.arc(0, -55, 29, Math.PI, 0);
  p.lineTo(29, 1);
  p.closePath();
  return p;
}

function drawDome(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 112, 11, 0.2);
  for (const s of [-1, 1]) {
    guyLine(ctx, s * 88, -90, s * 104, -3);
    pegNub(ctx, s * 104, 2);
  }
  // Dome body.
  const bodyPts = superPts(95, 136, 3, 0.06, Math.PI - 0.06, 30);
  bodyPts.push([-86, 2], [0, 4], [86, 2]);
  const body = new Path2D();
  smoothClosed(body, bodyPts, 0.5);
  filled(
    ctx,
    body,
    vGrad(ctx, -136, 4, [
      [0, tint(DOME.base, 0.35)],
      [1, DOME.base],
    ]),
    mix(DOME.base, P.bark, 0.25),
    () => {
      ctx.fillStyle = lGrad(ctx, -98, 0, 0, 0, [
        [0, mix(DOME.base, P.rose, 0.5), 0.5],
        [1, P.rose, 0],
      ]);
      ctx.fillRect(-100, -150, 100, 160);
      // Pole seams continue down the body.
      ctx.strokeStyle = rgba(shade(DOME.base, 0.2), 0.5);
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 58, -92);
        ctx.quadraticCurveTo(s * 76, -40, s * 82, 0);
        ctx.stroke();
      }
      // Tub band.
      ctx.fillStyle = DOME.tub;
      ctx.fillRect(-100, -12, 200, 18);
      stitch(ctx, () => {
        ctx.moveTo(-92, -15);
        ctx.lineTo(92, -15);
      }, P.cream, 0.5);
      // A sewn-on gurans patch (5 petals) on the shade side.
      const px = -58;
      const py = -46;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * 5.4, py + Math.sin(a) * 5.4, 4.6, 0, Math.PI * 2);
        ctx.fillStyle = A.gurans;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = P.butter;
      ctx.fill();
      stitch(ctx, () => {
        ctx.arc(px, py, 13.5, 0, Math.PI * 2);
      }, A['gurans-deep'], 0.55, 1.1);
    },
  );
  // Doorway (under the fly) with a rolled-up flap.
  const door = domeDoorPath();
  const inside = mix(P.bark, P.ink, 0.3);
  ctx.fillStyle = vGrad(ctx, -84, 2, [
    [0, shade(inside, 0.15)],
    [1, mix(inside, P.bark, 0.4)],
  ]);
  ctx.fill(door);
  withState(ctx, () => {
    ctx.clip(door);
    ctx.fillStyle = rgba(P.cream, 0.18);
    ctx.beginPath();
    ctx.ellipse(0, 2, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(A['wool-ball'], 0.6);
    ctx.beginPath();
    ctx.ellipse(-9, -6, 11, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = shade(DOME.base, 0.22);
  ctx.lineWidth = 2.2;
  ctx.stroke(door);
  stitch(ctx, () => {
    ctx.moveTo(-34, 0);
    ctx.lineTo(-34, -55);
    ctx.arc(0, -55, 34, Math.PI, 0);
    ctx.lineTo(34, 0);
  }, shade(DOME.base, 0.1), 0.5);
  // Rain fly cap with a scalloped hem.
  const t0 = Math.asin(Math.pow(92 / 141, 1.5));
  const top = superPts(99, 141, 3, t0, Math.PI - t0, 28);
  const fly = new Path2D();
  fly.moveTo(top[0][0], top[0][1]);
  for (const [x, y] of top) fly.lineTo(x, y);
  const n = 6;
  const xa = top[top.length - 1][0];
  const xb = top[0][0];
  for (let k = 0; k < n; k++) {
    const x0 = xa + ((xb - xa) * k) / n;
    const x1 = xa + ((xb - xa) * (k + 1)) / n;
    const mx = (x0 + x1) / 2;
    fly.quadraticCurveTo(mx, hemY(mx) + 13, x1, hemY(x1));
  }
  fly.closePath();
  filled(
    ctx,
    fly,
    vGrad(ctx, -141, -86, [
      [0, tint(DOME.fly, 0.38)],
      [1, DOME.fly],
    ]),
    DOME.fly,
    () => {
      ctx.fillStyle = lGrad(ctx, -100, 0, 0, 0, [
        [0, shade(DOME.fly, 0.12), 0.45],
        [1, DOME.fly, 0],
      ]);
      ctx.fillRect(-100, -160, 100, 80);
      sheen(ctx, 36, -122, 44, 0.42);
      ctx.strokeStyle = rgba(P.cream, 0.55);
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 58, hemY(58) + 4);
        ctx.quadraticCurveTo(s * 40, -136, 0, -141);
        ctx.stroke();
      }
      stitch(ctx, () => {
        smoothOpen(ctx, [
          [-90, -96],
          [-45, -88],
          [0, -86],
          [45, -88],
          [90, -96],
        ]);
      }, P.cream, 0.55);
    },
    2.4,
  );
  // Vent hood.
  const vent = new Path2D();
  vent.moveTo(-21, -137);
  vent.quadraticCurveTo(0, -158, 21, -137);
  vent.quadraticCurveTo(0, -131, -21, -137);
  vent.closePath();
  filled(ctx, vent, tint(DOME.fly, 0.3), DOME.fly, undefined, 2);
  ctx.beginPath();
  ctx.ellipse(0, -136.5, 12, 2.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(DOME.fly, 0.3);
  ctx.fill();
  // Rolled door flap + ties (sits at the top of the arch, under the hem).
  const roll = new Path2D();
  roll.ellipse(0, -79, 30, 6.5, 0, 0, Math.PI * 2);
  filled(ctx, roll, vGrad(ctx, -86, -72, [
    [0, tint(DOME.base, 0.4)],
    [1, DOME.base],
  ]), mix(DOME.base, P.bark, 0.25), () => {
    ctx.strokeStyle = rgba(shade(DOME.base, 0.2), 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-26, -79);
    ctx.quadraticCurveTo(0, -75, 26, -79);
    ctx.stroke();
  }, 2);
  for (const s of [-1, 1]) {
    ctx.strokeStyle = shade(A.jute, 0.15);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(s * 14, -84);
    ctx.lineTo(s * 14, -73);
    ctx.quadraticCurveTo(s * 16, -66, s * 13, -62);
    ctx.stroke();
  }
  hangLoop(ctx, -88, -84, DOME.fly);
  hangLoop(ctx, 88, -84, DOME.fly);
  hangLoop(ctx, -36, -128, DOME.fly);
  hangLoop(ctx, 36, -128, DOME.fly);
}

// ---------------------------------------------------------------------------
// Tin-Roof Cabin: a pocket hill-home on short stilts, rose tin roof.
// ---------------------------------------------------------------------------

const CAB = {
  wood: A['shop-wood'],
  roof: A['tin-rose'],
  post: tint(P.bark, 0.18),
};
const EAVE: Pt[] = [
  [-128, -95],
  [-104, -112],
  [-56, -160],
  [0, -184],
  [56, -160],
  [104, -112],
  [128, -95],
];
const RIDGE: Pt[] = [
  [-132, -106],
  [-108, -126],
  [-58, -176],
  [0, -200],
  [58, -176],
  [108, -126],
  [132, -106],
];
/** Window glass rect (prop-local). */
const WIN = { x: 22, y: -104, w: 44, h: 38 };
const CAB_DOOR = { x: -46, top: -96, w: 44, bottom: -24 };

function cabinDoorPath(): Path2D {
  const p = new Path2D();
  const { x, top, w, bottom } = CAB_DOOR;
  const r = w / 2;
  p.moveTo(x - r, bottom);
  p.lineTo(x - r, top + r);
  p.arc(x, top + r, r, Math.PI, 0);
  p.lineTo(x + r, bottom);
  p.closePath();
  return p;
}

function winPath(): Path2D {
  const p = new Path2D();
  roundRectPath(p, WIN.x, WIN.y, WIN.w, WIN.h, 9);
  return p;
}

function drawCabin(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 132, 11, 0.22);
  // Stilts.
  for (const sx of [-88, -36, 36, 88]) {
    const p = new Path2D();
    roundRectPath(p, sx - 5, -20, 10, 21, 4);
    filled(ctx, p, sx === -36 || sx === 36 ? shade(CAB.post, 0.08) : CAB.post, P.bark, undefined, 2);
  }
  // Chimney (behind the roof).
  const pipe = new Path2D();
  roundRectPath(pipe, 66, -206, 13, 60, 4);
  filled(ctx, pipe, lGrad(ctx, 66, 0, 79, 0, [
    [0, A.steamer],
    [0.5, tint(A.steamer, 0.5)],
    [1, shade(A.steamer, 0.06)],
  ]), A.steamer, undefined, 2.2);
  const cap = new Path2D();
  roundRectPath(cap, 61, -214, 23, 9, 4);
  filled(ctx, cap, tint(A.steamer, 0.25), A.steamer, undefined, 2.2);
  // Walls up into the gable (the roof covers the top edge).
  const wall = new Path2D();
  wall.moveTo(-98, -20);
  wall.lineTo(-98, -108);
  smoothOpen(wall, [
    [-98, -108],
    [-56, -152],
    [0, -176],
    [56, -152],
    [98, -108],
  ], true);
  wall.lineTo(98, -20);
  wall.closePath();
  filled(
    ctx,
    wall,
    vGrad(ctx, -176, -20, [
      [0, tint(CAB.wood, 0.25)],
      [1, CAB.wood],
    ]),
    shade(CAB.wood, 0.05),
    () => {
      ctx.fillStyle = lGrad(ctx, -100, 0, -10, 0, [
        [0, shade(CAB.wood, 0.12), 0.45],
        [1, CAB.wood, 0],
      ]);
      ctx.fillRect(-100, -190, 90, 175);
      const r = artRng(31);
      ctx.strokeStyle = rgba(shade(CAB.wood, 0.25), 0.55);
      ctx.lineWidth = 1.6;
      for (let y = -40; y > -175; y -= 21) {
        ctx.beginPath();
        ctx.moveTo(-100, y);
        ctx.bezierCurveTo(-40, y + r() * 2 - 1, 30, y + r() * 2 - 1, 100, y);
        ctx.stroke();
      }
      // A few knots and nail dots.
      ctx.fillStyle = rgba(shade(CAB.wood, 0.3), 0.45);
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse(-88 + r() * 176, -30 - r() * 120, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Round attic vent.
      ctx.beginPath();
      ctx.arc(0, -150, 9, 0, Math.PI * 2);
      ctx.fillStyle = mix(P.bark, P.ink, 0.3);
      ctx.fill();
      ctx.strokeStyle = CAB.post;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-9, -150);
      ctx.lineTo(9, -150);
      ctx.moveTo(0, -159);
      ctx.lineTo(0, -141);
      ctx.stroke();
    },
  );
  // Corner posts.
  for (const sx of [-1, 1]) {
    const p = new Path2D();
    roundRectPath(p, sx * 97 - 5, -112, 10, 92, 4);
    filled(ctx, p, CAB.post, P.bark, undefined, 2);
  }
  // Floor beam.
  const beam = new Path2D();
  roundRectPath(beam, -108, -27, 216, 11, 5);
  filled(ctx, beam, vGrad(ctx, -27, -16, [
    [0, tint(P.bark, 0.3)],
    [1, P.bark],
  ]), P.bark, undefined, 2.2);
  // Doorway: open door swung back on the left.
  const door = cabinDoorPath();
  const inside = mix(P.bark, P.ink, 0.32);
  ctx.fillStyle = vGrad(ctx, CAB_DOOR.top, CAB_DOOR.bottom, [
    [0, shade(inside, 0.12)],
    [1, mix(inside, P.bark, 0.35)],
  ]);
  ctx.fill(door);
  withState(ctx, () => {
    ctx.clip(door);
    ctx.fillStyle = rgba(A['wool-ball'], 0.5);
    ctx.beginPath();
    ctx.ellipse(-40, -30, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = CAB.post;
  ctx.lineWidth = 4.5;
  ctx.stroke(door);
  ctx.strokeStyle = shade(P.bark, 0.2);
  ctx.lineWidth = 1.5;
  ctx.stroke(door);
  const leaf = new Path2D();
  roundRectPath(leaf, -82, -94, 12, 70, [6, 4, 3, 3]);
  filled(ctx, leaf, lGrad(ctx, -82, 0, -70, 0, [
    [0, shade(CAB.wood, 0.1)],
    [1, CAB.wood],
  ]), CAB.wood, () => {
    ctx.strokeStyle = rgba(shade(CAB.wood, 0.25), 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-76, -92);
    ctx.lineTo(-76, -26);
    ctx.stroke();
  }, 2);
  ctx.beginPath();
  ctx.arc(-73, -58, 2.3, 0, Math.PI * 2);
  ctx.fillStyle = A.bell;
  ctx.fill();
  // Stone steps.
  for (const [x, y, w, h] of [
    [-72, -10, 52, 11],
    [-66, -18, 40, 9],
  ] as [number, number, number, number][]) {
    const st = new Path2D();
    roundRectPath(st, x, y, w, h, 5);
    filled(ctx, st, vGrad(ctx, y, y + h, [
      [0, tint(A.stone, 0.3)],
      [1, A.stone],
    ]), A['stone-shade'], undefined, 2);
  }
  // Window: frame, glass, mullions, curtains, flower box.
  const win = winPath();
  ctx.fillStyle = vGrad(ctx, WIN.y, WIN.y + WIN.h, [
    [0, mix(P.powder, P.cream, 0.55)],
    [1, mix(P.powder, P.cream, 0.2)],
  ]);
  ctx.fill(win);
  withState(ctx, () => {
    ctx.clip(win);
    ctx.fillStyle = rgba(P.cream, 0.5);
    ctx.beginPath();
    ctx.moveTo(WIN.x + 6, WIN.y + WIN.h);
    ctx.lineTo(WIN.x + 22, WIN.y);
    ctx.lineTo(WIN.x + 30, WIN.y);
    ctx.lineTo(WIN.x + 14, WIN.y + WIN.h);
    ctx.fill();
    // Curtain swags.
    ctx.fillStyle = A['wool-ball'];
    for (const s of [0, 1]) {
      const cx = s ? WIN.x + WIN.w : WIN.x;
      ctx.beginPath();
      ctx.moveTo(cx, WIN.y);
      ctx.quadraticCurveTo(cx + (s ? -16 : 16), WIN.y + 2, cx + (s ? -6 : 6), WIN.y + 24);
      ctx.lineTo(cx, WIN.y + 24);
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.strokeStyle = CAB.post;
  ctx.lineWidth = 4;
  ctx.stroke(win);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WIN.x + WIN.w / 2, WIN.y + 1);
  ctx.lineTo(WIN.x + WIN.w / 2, WIN.y + WIN.h - 1);
  ctx.moveTo(WIN.x + 1, WIN.y + WIN.h / 2);
  ctx.lineTo(WIN.x + WIN.w - 1, WIN.y + WIN.h / 2);
  ctx.stroke();
  ctx.strokeStyle = shade(P.bark, 0.2);
  ctx.lineWidth = 1.4;
  ctx.stroke(win);
  const box = new Path2D();
  roundRectPath(box, WIN.x - 4, WIN.y + WIN.h + 1, WIN.w + 8, 9, 3);
  // Geranium dots + leaves peeking from the box.
  for (let i = 0; i < 4; i++) {
    const bx = WIN.x + 4 + i * 12;
    ctx.beginPath();
    ctx.ellipse(bx, WIN.y + WIN.h + 1, 5, 3.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? P.sage : P.moss;
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const bx = WIN.x + 9 + i * 13;
    ctx.beginPath();
    ctx.arc(bx, WIN.y + WIN.h - 3, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = A.gurans;
    ctx.fill();
    ctx.fillStyle = rgba(P.cream, 0.8);
    ctx.beginPath();
    ctx.arc(bx - 1, WIN.y + WIN.h - 4.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  filled(ctx, box, shade(CAB.wood, 0.1), CAB.wood, undefined, 2);
  // Roof (rose tin, rounded wedge) over everything.
  const roof = new Path2D();
  smoothClosed(roof, [...RIDGE, [134, -99], ...EAVE.slice().reverse(), [-134, -99]], 0.5);
  filled(
    ctx,
    roof,
    vGrad(ctx, -200, -95, [
      [0, tint(CAB.roof, 0.3)],
      [1, CAB.roof],
    ]),
    CAB.roof,
    () => {
      ctx.fillStyle = lGrad(ctx, -134, 0, 0, 0, [
        [0, shade(CAB.roof, 0.12), 0.4],
        [1, CAB.roof, 0],
      ]);
      ctx.fillRect(-140, -210, 140, 120);
      // Corrugation: stripes radiating like the roof's curve, 6% lighter.
      ctx.strokeStyle = rgba(P.cream, 0.2);
      ctx.lineWidth = 4;
      for (let i = -10; i <= 10; i++) {
        const a = -Math.PI / 2 + i * 0.13;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 40, -40 + Math.sin(a) * 40);
        ctx.lineTo(Math.cos(a) * 240, -40 + Math.sin(a) * 240);
        ctx.stroke();
      }
      sheen(ctx, 50, -168, 40, 0.3);
      // Sunny rim along the ridge.
      ctx.strokeStyle = rgba(P.cream, 0.55);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      smoothOpen(ctx, RIDGE.map(([x, y]) => [x, y + 3] as Pt));
      ctx.stroke();
    },
    2.6,
  );
  // Right-wall bracket (hang point 6 at 118, -56).
  ctx.strokeStyle = shade(P.bark, 0.25);
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(100, -62);
  ctx.lineTo(120, -62);
  ctx.moveTo(101, -46);
  ctx.lineTo(114, -61);
  ctx.stroke();
  ctx.strokeStyle = tint(P.bark, 0.3);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = shade(P.bark, 0.2);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(118, -62);
  ctx.lineTo(118, -57);
  ctx.arc(116.5, -56.5, 1.6, 0, Math.PI);
  ctx.stroke();
  // Eave hang hooks (tiny rings under the roof edge).
  for (const [x, y] of [
    [-104, -112],
    [-56, -160],
    [0, -184],
    [56, -160],
    [104, -112],
  ] as Pt[]) {
    ctx.beginPath();
    ctx.arc(x, y + 1.5, 2.6, 0, Math.PI * 2);
    ctx.strokeStyle = shade(A.steamer, 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Flat (unfolded) states.
// ---------------------------------------------------------------------------

const SHEET: Pt[] = [
  [-100, -12],
  [-60, -17],
  [-10, -14],
  [40, -18],
  [100, -12],
  [106, -2],
  [60, 5],
  [0, 6],
  [-60, 5],
  [-106, -1],
];

function sheet(ctx: Ctx, fill: string, deep: string, details: () => void): void {
  softShadow(ctx, 0, 2, 112, 9, 0.16);
  const p = new Path2D();
  smoothClosed(p, SHEET, 0.5);
  filled(
    ctx,
    p,
    vGrad(ctx, -18, 6, [
      [0, tint(fill, 0.3)],
      [1, fill],
    ]),
    deep,
    () => {
      details();
      ctx.strokeStyle = rgba(deep, 0.35);
      ctx.lineWidth = 1.3;
      for (const x of [-40, 34]) {
        ctx.beginPath();
        ctx.moveTo(x - 3, -16);
        ctx.quadraticCurveTo(x + 4, -6, x, 6);
        ctx.stroke();
      }
    },
    2.2,
  );
}

function stick(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, w = 4.5): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(col, 0.28);
  ctx.lineWidth = w + 2.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

function ropeCoil(ctx: Ctx, x: number, y: number): void {
  for (const [rx, ry, a] of [
    [13, 5, 0],
    [9.5, 3.6, 0.3],
  ] as [number, number, number][]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, a * 0.1, 0, Math.PI * 2);
    ctx.strokeStyle = shade(A.jute, 0.25);
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = A.jute;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawFernFlat(ctx: Ctx): void {
  sheet(ctx, FERN.base, FERN.deep, () => {
    frond(ctx, -80, 0, -50, -14, 0.3, P.cream, 0.3, 0.7);
    frond(ctx, 52, 2, 84, -12, -0.3, P.cream, 0.3, 0.7);
    ctx.fillStyle = rgba(FERN.deep, 0.4);
    ctx.fillRect(-110, 0, 220, 8);
  });
  stick(ctx, -66, -6, 38, -12, P.bark);
  ctx.beginPath();
  ctx.arc(40, -12, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = P.butter;
  ctx.fill();
  ctx.strokeStyle = shade(P.butter, 0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ropeCoil(ctx, 66, -5);
}

function drawDomeFlat(ctx: Ctx): void {
  sheet(ctx, DOME.base, mix(DOME.base, P.bark, 0.25), () => {
    // Folded fly over the right half.
    ctx.fillStyle = vGrad(ctx, -18, 6, [
      [0, tint(DOME.fly, 0.3)],
      [1, DOME.fly],
    ]);
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.quadraticCurveTo(10, -6, 22, 8);
    ctx.lineTo(120, 8);
    ctx.lineTo(120, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(DOME.fly, 0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.quadraticCurveTo(10, -6, 22, 8);
    ctx.stroke();
    ctx.fillStyle = rgba(DOME.tub, 0.6);
    ctx.fillRect(-110, 0, 124, 8);
  });
  stick(ctx, -82, -4, 20, -9, tint(P.bark, 0.45), 3.2);
  stick(ctx, -70, 0, 34, -4, tint(P.bark, 0.45), 3.2);
  ropeCoil(ctx, 70, -6);
}

function drawCabinFlat(ctx: Ctx): void {
  sheet(ctx, A.jute, shade(A.jute, 0.1), () => {
    ctx.strokeStyle = rgba(shade(A.jute, 0.25), 0.35);
    ctx.lineWidth = 1;
    for (let x = -100; x < 110; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.lineTo(x - 2, 8);
      ctx.stroke();
    }
  });
  // Stacked planks.
  for (let i = 0; i < 3; i++) {
    const p = new Path2D();
    roundRectPath(p, -78 + i * 4, -11 - i * 7, 92 - i * 6, 9, 4);
    filled(ctx, p, vGrad(ctx, -11 - i * 7, -2 - i * 7, [
      [0, tint(CAB.wood, 0.3)],
      [1, CAB.wood],
    ]), CAB.wood, () => {
      ctx.strokeStyle = rgba(shade(CAB.wood, 0.3), 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-74 + i * 4, -7 - i * 7);
      ctx.lineTo(8 - i * 3, -6 - i * 7);
      ctx.stroke();
    }, 2);
  }
  // Folded rose tin sheet.
  const tin = new Path2D();
  roundRectPath(tin, 22, -16, 58, 14, 6);
  filled(ctx, tin, vGrad(ctx, -16, -2, [
    [0, tint(CAB.roof, 0.3)],
    [1, CAB.roof],
  ]), CAB.roof, () => {
    ctx.strokeStyle = rgba(P.cream, 0.35);
    ctx.lineWidth = 3;
    for (let x = 26; x < 82; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, -18);
      ctx.lineTo(x - 2, 0);
      ctx.stroke();
    }
  }, 2.2);
  ropeCoil(ctx, 90, -4);
}

// ---------------------------------------------------------------------------
// Masks for the warm doorway / window light (white, tinted + ADD at runtime).
// ---------------------------------------------------------------------------

function mask(ctx: Ctx, path: Path2D): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(path);
}

export function bake(b: Baker): void {
  ptex(b, 'prop_tent_leaf_tent', 216, 168, 108, 160, drawFern);
  ptex(b, 'prop_tent_dome_tent', 226, 172, 113, 162, drawDome);
  ptex(b, 'prop_tent_cabin_kit', 276, 232, 138, 222, drawCabin);
  ptex(b, 'prop_tent_leaf_tent_door', 216, 168, 108, 160, (ctx) => mask(ctx, fernDoorPath()));
  ptex(b, 'prop_tent_dome_tent_door', 226, 172, 113, 162, (ctx) => mask(ctx, domeDoorPath()));
  ptex(b, 'prop_tent_cabin_kit_door', 276, 232, 138, 222, (ctx) => mask(ctx, cabinDoorPath()));
  ptex(b, 'prop_tent_cabin_kit_win', 276, 232, 138, 222, (ctx) => mask(ctx, winPath()));
  ptex(b, 'prop_tent_leaf_tent_flat', FLAT.w, FLAT.h, FLAT.ax, FLAT.ay, drawFernFlat);
  ptex(b, 'prop_tent_dome_tent_flat', FLAT.w, FLAT.h, FLAT.ax, FLAT.ay, drawDomeFlat);
  ptex(b, 'prop_tent_cabin_kit_flat', FLAT.w, FLAT.h, FLAT.ax, FLAT.ay, drawCabinFlat);

  // Spot: a soft dotted ellipse (white; tinted glow + ADD).
  ptex(b, 'prop_tent_spot', 224, 48, 112, 24, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 0, 0, 0, 100, [
      [0, '#FFFFFF', 0.28],
      [0.75, '#FFFFFF', 0.12],
      [1, '#FFFFFF', 0],
    ]);
    withState(ctx, () => {
      ctx.scale(1, 0.16);
      ctx.beginPath();
      ctx.arc(0, 0, 100, 0, Math.PI * 2);
      ctx.fill();
    });
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * 98;
      const y = Math.sin(a) * 15;
      ctx.fillStyle = rGrad(ctx, x, y, 0, 4.6, [
        [0, '#FFFFFF', 1],
        [0.55, '#FFFFFF', 0.85],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(x, y, 4.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Peg: a wooden stake with a butter knob and a jute loop.
  ptex(b, 'prop_peg', 18, 34, 9, 28, (ctx) => {
    const p = new Path2D();
    p.moveTo(-3.4, -20);
    p.lineTo(3.4, -20);
    p.lineTo(2.6, 0);
    p.quadraticCurveTo(0, 5, -2.6, 0);
    p.closePath();
    filled(ctx, p, lGrad(ctx, -4, 0, 4, 0, [
      [0, tint(P.bark, 0.2)],
      [1, tint(P.bark, 0.5)],
    ]), P.bark, undefined, 1.6);
    ctx.beginPath();
    ctx.ellipse(0, -13, 4.6, 1.8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = shade(A.jute, 0.2);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    const k = new Path2D();
    k.arc(0, -22, 5, 0, Math.PI * 2);
    filled(ctx, k, rGrad(ctx, -1.5, -24, 0, 6, [
      [0, tint(P.butter, 0.5)],
      [1, P.butter],
    ]), P.butter, undefined, 1.6);
  });
}
