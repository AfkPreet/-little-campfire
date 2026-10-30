/**
 * Gear, decor and special item icons (Moon Scale, rupee coin, mini doko).
 * Drawn into a 96 x 96 logical square; see items.ts for baking. Looks follow
 * docs/WORLD.md 7.1 (gear), 7.6 (decor), 7.8 (Moon Scale), 2 (coin art) and
 * 6 "UI touches" (mini doko).
 */
import { A, P } from '@/palette';
import { glowDisc, lGrad, rGrad, withState, starPath, eye, blush, mouth, type Ctx } from './kit';
import {
  type Draw,
  type Pt,
  OL,
  shape,
  fillOnly,
  line,
  oval,
  hi,
  dot,
  ground,
  ball,
  steam,
  twinkle,
  clipTo,
  smoothPath,
  fillPath,
  leaf,
  mix,
  tint,
  shade,
  rgba,
} from './items-kit';

/** Horizontal gradient: lit left, base, deeper right. */
function hg(ctx: Ctx, x0: number, x1: number, base: string, lift = 0.35, sink = 0.12): CanvasGradient {
  return lGrad(ctx, x0, 0, x1, 0, [[0, tint(base, lift)], [0.45, base], [1, shade(base, sink)]]);
}

// ---------------------------------------------------------------------------
// Tents
// ---------------------------------------------------------------------------

function frond(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, alpha: number): void {
  const n = 6;
  line(ctx, (c) => {
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
  }, rgba(color, alpha), 1.6);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const s = 6 * (1 - t * 0.6);
    fillOnly(ctx, (c) => c.ellipse(x - s * 0.6, y - s * 0.1, s * 0.7, s * 0.28, -0.5, 0, Math.PI * 2), rgba(color, alpha));
    fillOnly(ctx, (c) => c.ellipse(x + s * 0.6, y - s * 0.1, s * 0.7, s * 0.28, 0.5, 0, Math.PI * 2), rgba(color, alpha));
  }
}

const fernTent: Draw = (ctx) => {
  ground(ctx, 82, 40);
  const base = P.sage;
  const deep = mix(P.sage, P.moss, 0.55);
  // Body: rounded A-frame.
  const body = smoothPath([
    [48, 14],
    [60, 34],
    [76, 62],
    [86, 80],
    [48, 82],
    [10, 80],
    [20, 62],
    [36, 34],
  ], 0.35);
  fillPath(ctx, body, lGrad(ctx, 10, 20, 86, 80, [[0, tint(base, 0.35)], [0.5, base], [1, deep]]), deep);
  clipTo(ctx, body, () => {
    frond(ctx, 28, 70, 40, 40, P.cream, 0.4);
    frond(ctx, 68, 70, 58, 42, P.cream, 0.3);
  });
  // Door (inside) and tied-back flaps.
  const inside = mix(shade(P.moss, 0.42), P.ink, 0.12);
  shape(ctx, (c) => {
    c.moveTo(48, 32);
    c.quadraticCurveTo(40, 58, 36, 81);
    c.lineTo(60, 81);
    c.quadraticCurveTo(56, 58, 48, 32);
    c.closePath();
  }, lGrad(ctx, 0, 32, 0, 80, [[0, inside], [1, mix(inside, P.glow, 0.15)]]), deep, 2);
  shape(ctx, (c) => {
    c.moveTo(48, 32);
    c.quadraticCurveTo(40, 52, 34, 81);
    c.quadraticCurveTo(30, 66, 38, 58);
    c.quadraticCurveTo(44, 46, 48, 32);
    c.closePath();
  }, tint(base, 0.2), deep, 2);
  shape(ctx, (c) => {
    c.moveTo(48, 32);
    c.quadraticCurveTo(56, 52, 62, 81);
    c.quadraticCurveTo(66, 66, 58, 58);
    c.quadraticCurveTo(52, 46, 48, 32);
    c.closePath();
  }, base, deep, 2);
  // Rose ties.
  dot(ctx, 37.5, 59, 2.4, P.rose);
  dot(ctx, 58.5, 59, 2.4, P.rose);
  // Pole tip and pennant.
  line(ctx, (c) => {
    c.moveTo(48, 16);
    c.lineTo(48, 6);
  }, P.bark, 2.6);
  shape(ctx, (c) => {
    c.moveTo(48, 6);
    c.quadraticCurveTo(56, 8, 60, 10);
    c.quadraticCurveTo(54, 12, 48, 13);
    c.closePath();
  }, P.butter, P.butter, 1.6);
  hi(ctx, 34, 40, 3, 8, 0.6, 0.5);
};

const monsoonDome: Draw = (ctx) => {
  ground(ctx, 82, 42);
  const base = mix(P.butter, P.peach, 0.34);
  const fly = A['tin-blue'];
  // Dome body.
  const body = new Path2D();
  body.moveTo(8, 80);
  body.bezierCurveTo(8, 34, 26, 22, 48, 22);
  body.bezierCurveTo(70, 22, 88, 34, 88, 80);
  body.quadraticCurveTo(48, 84, 8, 80);
  body.closePath();
  fillPath(ctx, body, rGrad(ctx, 40, 40, 0, 60, [[0, tint(base, 0.4)], [0.6, base], [1, shade(base, 0.12)]], 30, 30), base);
  clipTo(ctx, body, () => {
    // Rain fly cap.
    shape(ctx, (c) => {
      c.moveTo(0, 48);
      c.bezierCurveTo(20, 10, 76, 10, 96, 48);
      c.quadraticCurveTo(48, 36, 0, 48);
      c.closePath();
    }, hg(ctx, 10, 86, fly, 0.3, 0.1), fly, 2);
    // Pole seams.
    line(ctx, (c) => {
      c.moveTo(20, 82);
      c.bezierCurveTo(20, 46, 36, 24, 48, 22);
      c.moveTo(76, 82);
      c.bezierCurveTo(76, 46, 60, 24, 48, 22);
    }, rgba(shade(base, 0.25), 0.5), 1.6);
  });
  ctx.strokeStyle = shade(base, 0.28);
  ctx.lineWidth = OL;
  ctx.stroke(body);
  // Round door.
  shape(ctx, (c) => {
    c.moveTo(34, 81);
    c.bezierCurveTo(34, 52, 62, 52, 62, 81);
    c.closePath();
  }, mix(P.bark, P.ink, 0.3), shade(base, 0.1), 2);
  shape(ctx, (c) => {
    c.moveTo(34, 81);
    c.bezierCurveTo(34, 60, 44, 54, 50, 55);
    c.quadraticCurveTo(40, 66, 40, 81);
    c.closePath();
  }, tint(base, 0.15), base, 2);
  dot(ctx, 41, 68, 2.2, P.rose);
  hi(ctx, 26, 36, 6, 3, -0.7, 0.6);
  // A few raindrops sliding off the fly.
  for (const [x, y] of [[10, 44], [86, 42]] as const) {
    shape(ctx, (c) => {
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 3, y + 5, x, y + 7);
      c.quadraticCurveTo(x - 3, y + 5, x, y);
      c.closePath();
    }, tint(P.powder, 0.3), P.powder, 1.4);
  }
};

const tinRoofCabin: Draw = (ctx) => {
  ground(ctx, 84, 40);
  const wood = A['shop-wood'];
  // Walls.
  shape(ctx, (c) => c.roundRect(18, 44, 60, 38, 4), hg(ctx, 18, 78, wood, 0.3, 0.1), wood);
  line(ctx, (c) => {
    for (const y of [54, 63, 72]) {
      c.moveTo(20, y);
      c.lineTo(76, y);
    }
  }, rgba(shade(wood, 0.25), 0.45), 1.3);
  // Chimney.
  shape(ctx, (c) => c.roundRect(62, 16, 9, 18, 2), hg(ctx, 62, 71, A['stone'], 0.3), A['stone'], 2);
  // Tin roof (pastel rose, corrugated).
  const roof = A['tin-rose'];
  const roofPath = new Path2D();
  roofPath.moveTo(10, 50);
  roofPath.lineTo(46, 20);
  roofPath.quadraticCurveTo(48, 18, 50, 20);
  roofPath.lineTo(86, 50);
  roofPath.quadraticCurveTo(88, 54, 84, 54);
  roofPath.lineTo(12, 54);
  roofPath.quadraticCurveTo(8, 54, 10, 50);
  roofPath.closePath();
  fillPath(ctx, roofPath, lGrad(ctx, 0, 18, 0, 54, [[0, tint(roof, 0.35)], [1, roof]]), roof);
  clipTo(ctx, roofPath, () => {
    for (let x = 14; x < 86; x += 6) {
      line(ctx, (c) => {
        c.moveTo(48 + (x - 48) * 0.1, 20);
        c.lineTo(x, 54);
      }, rgba(shade(roof, 0.2), 0.4), 1.2);
    }
  });
  // Lit window.
  glowDisc(ctx, 34, 64, 16, P.glow, 0.5);
  shape(ctx, (c) => c.roundRect(26, 57, 16, 14, 3), lGrad(ctx, 0, 57, 0, 71, [[0, tint(P.glow, 0.4)], [1, P.glow]]), wood, 2);
  line(ctx, (c) => {
    c.moveTo(34, 57);
    c.lineTo(34, 71);
    c.moveTo(26, 64);
    c.lineTo(42, 64);
  }, shade(wood, 0.2), 1.6);
  // Door.
  shape(ctx, (c) => {
    c.moveTo(52, 82);
    c.lineTo(52, 64);
    c.quadraticCurveTo(52, 58, 59, 58);
    c.quadraticCurveTo(66, 58, 66, 64);
    c.lineTo(66, 82);
    c.closePath();
  }, mix(P.bark, wood, 0.4), P.bark, 2);
  dot(ctx, 63, 71, 1.4, P.butter);
  // Smoke curl.
  steam(ctx, 66, 12, 10, 0.55);
  hi(ctx, 30, 32, 7, 2, -0.7, 0.55);
};

// ---------------------------------------------------------------------------
// Rods and bait
// ---------------------------------------------------------------------------

interface RodOpts {
  color: string;
  width: number;
  nodes?: boolean;
  wraps?: string;
  grip: string;
  tip?: 'glow';
}

function rod(ctx: Ctx, o: RodOpts): void {
  const x0 = 16;
  const y0 = 84;
  const x1 = 80;
  const y1 = 14;
  ground(ctx, 86, 26, 0.12, 30);
  // Line down to a float.
  line(ctx, (c) => {
    c.moveTo(x1, y1);
    c.quadraticCurveTo(86, 40, 78, 62);
  }, rgba(A['cream-line'], 0.95), 1.3);
  // Float (rose and cream).
  withState(ctx, () => {
    ctx.translate(78, 66);
    shape(ctx, (c) => c.ellipse(0, 0, 4.6, 6, 0, 0, Math.PI * 2), lGrad(ctx, 0, -6, 0, 6, [[0, P.rose], [0.5, P.rose], [0.51, P.cream], [1, P.cream]]), P.rose, 1.8);
  });
  // Rod shaft (tapered).
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  withState(ctx, () => {
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    const w0 = o.width;
    const w1 = Math.max(1.6, o.width * 0.35);
    shape(ctx, (c) => {
      c.moveTo(0, -w0 / 2);
      c.lineTo(len, -w1 / 2);
      c.quadraticCurveTo(len + w1, 0, len, w1 / 2);
      c.lineTo(0, w0 / 2);
      c.quadraticCurveTo(-w0 * 0.6, 0, 0, -w0 / 2);
      c.closePath();
    }, lGrad(ctx, 0, -w0 / 2, 0, w0 / 2, [[0, tint(o.color, 0.4)], [0.5, o.color], [1, shade(o.color, 0.1)]]), o.color, 2);
    if (o.nodes) {
      for (const t of [0.3, 0.52, 0.72, 0.88]) {
        const w = w0 + (w1 - w0) * t;
        line(ctx, (c) => {
          c.moveTo(len * t, -w / 2 - 0.8);
          c.lineTo(len * t, w / 2 + 0.8);
        }, shade(o.color, 0.3), 1.8);
      }
    }
    if (o.wraps) {
      for (const t of [0.34, 0.48, 0.62, 0.76, 0.9]) {
        const w = w0 + (w1 - w0) * t;
        shape(ctx, (c) => c.roundRect(len * t - 1.8, -w / 2 - 1.2, 3.6, w + 2.4, 1.5), o.wraps!, o.wraps, 1.2);
      }
    }
    // Grip with wrap lines.
    shape(ctx, (c) => c.roundRect(-2, -w0 / 2 - 1.5, len * 0.24, w0 + 3, (w0 + 3) / 2), lGrad(ctx, 0, -w0, 0, w0, [[0, tint(o.grip, 0.35)], [1, o.grip]]), o.grip, 2);
    line(ctx, (c) => {
      for (let k = 1; k < 5; k++) {
        c.moveTo(k * len * 0.045, -w0 / 2 - 1);
        c.lineTo(k * len * 0.045 + 2, w0 / 2 + 1);
      }
    }, rgba(shade(o.grip, 0.3), 0.6), 1.2);
    // Line guide ring.
    oval(ctx, len * 0.55, -(w0 + (w1 - w0) * 0.55) / 2 - 2.5, 1.8, 1.8, A['steamer'], A['steamer'], 0, 1.1);
    hi(ctx, len * 0.45, -w0 * 0.18, len * 0.2, 0.9, 0, 0.6);
  });
  if (o.tip === 'glow') {
    glowDisc(ctx, x1, y1, 18, P.glow, 0.95);
    dot(ctx, x1, y1, 3.6, tint(P.glow, 0.5));
    twinkle(ctx, 66, 10, 3.4);
    twinkle(ctx, 88, 28, 2.6);
    for (const [x, y] of [[58, 22], [70, 30]] as const) {
      glowDisc(ctx, x, y, 5, P.glow, 0.9);
      dot(ctx, x, y, 1.4, tint(P.glow, 0.5));
    }
  }
}

const malingoRod: Draw = (ctx) => rod(ctx, { color: A['malingo'], width: 7, nodes: true, grip: A['jute'] });
const rattanRod: Draw = (ctx) => rod(ctx, { color: A['ghum-cane'], width: 7.5, wraps: P.rose, grip: mix(P.bark, A['ghum-cane'], 0.4) });
const fireflyRod: Draw = (ctx) => rod(ctx, { color: mix(P.lavender, A['ridge-near'], 0.4), width: 7.5, wraps: P.butter, grip: mix(P.bark, P.lavender, 0.3), tip: 'glow' });

const attaBait: Draw = (ctx) => {
  ground(ctx, 82, 34);
  // Little wooden dish.
  const wood = A['shop-wood'];
  shape(ctx, (c) => {
    c.moveTo(14, 62);
    c.quadraticCurveTo(18, 82, 48, 82);
    c.quadraticCurveTo(78, 82, 82, 62);
    c.closePath();
  }, hg(ctx, 14, 82, wood, 0.3, 0.12), wood);
  shape(ctx, (c) => c.ellipse(48, 62, 34, 8, 0, 0, Math.PI * 2), mix(wood, P.bark, 0.3), wood, 2);
  const dough = mix(A['oat'], P.cream, 0.45);
  const balls: [number, number, number][] = [[34, 58, 10], [60, 58, 10], [47, 60, 11], [41, 46, 10], [56, 45, 9.5]];
  for (const [x, y, r] of balls) {
    oval(ctx, x, y, r, r * 0.95, ball(ctx, x, y, r, dough, 0.45, 0.1), A['oat'], 0, 2.2);
    hi(ctx, x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, -0.6, 0.85);
  }
  // A happy face on the front ball.
  eye(ctx, 43.5, 59, 1.7, 2.1);
  eye(ctx, 50.5, 59, 1.7, 2.1);
  blush(ctx, 41, 63, 2.2, 1.3, 0.6);
  blush(ctx, 53, 63, 2.2, 1.3, 0.6);
  mouth(ctx, 47, 62.5, 2.6, 'smile', 1.2);
  // Flour dust.
  for (const [x, y] of [[24, 40], [70, 36], [30, 32], [76, 48]] as const) dot(ctx, x, y, 1.6, P.cream, 0.85);
};

function micaFlake(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pts: Pt[] = [[0, -r], [r * 0.8, -r * 0.35], [r * 0.7, r * 0.6], [0, r], [-r * 0.75, r * 0.5], [-r * 0.8, -r * 0.4]];
    const p = smoothPath(pts, 0.25);
    fillPath(ctx, p, lGrad(ctx, -r, -r, r, r, [[0, A['scale-glow']], [0.35, tint(P.powder, 0.35)], [0.65, tint(P.lavender, 0.25)], [1, tint(P.peach, 0.3)]]), P.lavender, 2);
    clipTo(ctx, p, () => {
      fillOnly(ctx, (c) => {
        c.moveTo(-r, -r * 0.2);
        c.lineTo(r, -r * 0.8);
        c.lineTo(r, -r * 0.4);
        c.lineTo(-r, r * 0.2);
        c.closePath();
      }, rgba(P.cream, 0.6));
    });
  });
}

const micaLure: Draw = (ctx) => {
  ground(ctx, 82, 30);
  glowDisc(ctx, 48, 50, 40, A['scale-glow'], 0.6);
  // Flakes threaded on a short line from a little cork bead.
  line(ctx, (c) => {
    c.moveTo(48, 6);
    c.quadraticCurveTo(46, 30, 34, 50);
    c.moveTo(48, 14);
    c.quadraticCurveTo(56, 40, 62, 56);
  }, rgba(A['cream-line'], 0.95), 1.3);
  oval(ctx, 48, 12, 4.5, 5, ball(ctx, 48, 12, 4.5, P.rose), P.rose, 0, 1.6);
  micaFlake(ctx, 32, 58, 15, -0.4);
  micaFlake(ctx, 63, 64, 13, 0.5);
  micaFlake(ctx, 50, 36, 11, 0.2);
  twinkle(ctx, 72, 30, 6);
  twinkle(ctx, 22, 34, 4);
  twinkle(ctx, 44, 74, 3.4);
};

// ---------------------------------------------------------------------------
// Cookware
// ---------------------------------------------------------------------------

const chiyaKettle: Draw = (ctx) => {
  ground(ctx, 84, 34);
  const al = A['steamer'];
  // Handle arch.
  line(ctx, (c) => {
    c.moveTo(30, 40);
    c.bezierCurveTo(30, 14, 66, 14, 66, 40);
  }, shade(al, 0.25), 6);
  line(ctx, (c) => {
    c.moveTo(30, 40);
    c.bezierCurveTo(30, 14, 66, 14, 66, 40);
  }, tint(al, 0.15), 3);
  // Spout.
  shape(ctx, (c) => {
    c.moveTo(26, 62);
    c.quadraticCurveTo(14, 56, 10, 40);
    c.quadraticCurveTo(10, 36, 14, 37);
    c.quadraticCurveTo(20, 50, 30, 52);
    c.closePath();
  }, hg(ctx, 10, 30, al), al);
  // Body.
  const body = new Path2D();
  body.moveTo(30, 40);
  body.bezierCurveTo(16, 50, 16, 82, 30, 82);
  body.lineTo(66, 82);
  body.bezierCurveTo(80, 82, 80, 50, 66, 40);
  body.closePath();
  fillPath(ctx, body, rGrad(ctx, 40, 54, 0, 40, [[0, tint(al, 0.55)], [0.55, al], [1, shade(al, 0.15)]], 36, 50), al);
  clipTo(ctx, body, () => {
    // The dent.
    fillOnly(ctx, (c) => c.ellipse(62, 64, 7, 5, 0.4, 0, Math.PI * 2), rgba(shade(al, 0.18), 0.55));
    line(ctx, (c) => c.ellipse(62, 64, 7, 5, 0.4, Math.PI * 1.1, Math.PI * 1.8), rgba(P.cream, 0.8), 1.4);
  });
  // Lid and knob.
  shape(ctx, (c) => c.ellipse(48, 40, 18, 5, 0, 0, Math.PI * 2), tint(al, 0.3), al, 2);
  oval(ctx, 48, 35, 4.5, 3.5, P.bark, P.bark, 0, 2);
  hi(ctx, 30, 58, 3, 9, 0.2, 0.75);
  steam(ctx, 12, 30, 14, 0.7);
};

const copperKasaudi: Draw = (ctx) => {
  ground(ctx, 84, 34);
  const cu = A['copper'];
  // Belly.
  const body = new Path2D();
  body.moveTo(34, 36);
  body.bezierCurveTo(10, 44, 10, 82, 48, 82);
  body.bezierCurveTo(86, 82, 86, 44, 62, 36);
  body.closePath();
  fillPath(ctx, body, rGrad(ctx, 42, 56, 0, 40, [[0, tint(cu, 0.5)], [0.25, mix(cu, P.butter, 0.25)], [0.6, cu], [1, shade(cu, 0.15)]], 34, 50), cu);
  clipTo(ctx, body, () => {
    line(ctx, (c) => {
      c.moveTo(14, 56);
      c.quadraticCurveTo(48, 66, 82, 56);
      c.moveTo(16, 61);
      c.quadraticCurveTo(48, 71, 80, 61);
    }, rgba(A['copper-line'], 0.6), 1.6);
  });
  // Neck.
  shape(ctx, (c) => {
    c.moveTo(34, 36);
    c.quadraticCurveTo(36, 30, 32, 26);
    c.lineTo(64, 26);
    c.quadraticCurveTo(60, 30, 62, 36);
    c.closePath();
  }, hg(ctx, 32, 64, cu, 0.3, 0.12), cu);
  // Flared lip.
  shape(ctx, (c) => c.ellipse(48, 26, 20, 5.5, 0, 0, Math.PI * 2), lGrad(ctx, 0, 21, 0, 31, [[0, tint(cu, 0.4)], [1, cu]]), cu, 2);
  fillOnly(ctx, (c) => c.ellipse(48, 26, 14, 3, 0, 0, Math.PI * 2), shade(cu, 0.35));
  hi(ctx, 28, 52, 4, 11, 0.35, 0.75);
  dot(ctx, 34, 68, 2, P.butter, 0.8);
};

const ironTawa: Draw = (ctx) => {
  ground(ctx, 80, 40);
  const iron = A['tawa-iron'];
  // Handle.
  withState(ctx, () => {
    ctx.translate(70, 54);
    ctx.rotate(-0.35);
    shape(ctx, (c) => c.roundRect(0, -3.5, 22, 7, 3.5), hg(ctx, 0, 22, iron, 0.3), iron, 2);
    shape(ctx, (c) => c.roundRect(10, -5, 16, 10, 5), lGrad(ctx, 0, -5, 0, 5, [[0, tint(P.bark, 0.3)], [1, P.bark]]), P.bark, 2);
  });
  // Rim (thickness).
  shape(ctx, (c) => c.ellipse(44, 60, 36, 16, 0, 0, Math.PI * 2), shade(iron, 0.05), iron);
  // Cooking surface.
  shape(ctx, (c) => c.ellipse(44, 57, 33, 13.5, 0, 0, Math.PI * 2), rGrad(ctx, 38, 53, 0, 34, [[0, tint(iron, 0.4)], [0.6, tint(iron, 0.15)], [1, iron]], 30, 50), iron, 2);
  // Plum-grey sheen.
  hi(ctx, 32, 52, 10, 3, -0.15, 0.4);
  line(ctx, (c) => c.ellipse(44, 57, 24, 9, 0, Math.PI * 1.1, Math.PI * 1.5), rgba(P.lavender, 0.6), 1.6);
  // A little sizzle.
  for (const [x, y] of [[50, 36], [60, 32], [40, 30]] as const) dot(ctx, x, y, 1.8, P.cream, 0.8);
  steam(ctx, 50, 44, 14, 0.5);
};

function steamerTier(ctx: Ctx, y: number, w: number, h: number, base: string): void {
  shape(ctx, (c) => {
    c.moveTo(48 - w, y);
    c.lineTo(48 - w, y + h);
    c.quadraticCurveTo(48, y + h + 8, 48 + w, y + h);
    c.lineTo(48 + w, y);
    c.quadraticCurveTo(48, y + 8, 48 - w, y);
    c.closePath();
  }, hg(ctx, 48 - w, 48 + w, base, 0.4, 0.12), base, 2.2);
  line(ctx, (c) => {
    c.moveTo(48 - w + 2, y + h * 0.5);
    c.quadraticCurveTo(48, y + h * 0.5 + 7, 48 + w - 2, y + h * 0.5);
  }, rgba(shade(base, 0.2), 0.45), 1.2);
}

const momoSteamer: Draw = (ctx) => {
  ground(ctx, 86, 36);
  const al = A['steamer'];
  steamerTier(ctx, 66, 32, 13, al);
  steamerTier(ctx, 52, 32, 13, al);
  steamerTier(ctx, 38, 32, 13, al);
  // Domed lid.
  shape(ctx, (c) => {
    c.moveTo(14, 40);
    c.bezierCurveTo(16, 20, 80, 20, 82, 40);
    c.quadraticCurveTo(48, 48, 14, 40);
    c.closePath();
  }, rGrad(ctx, 40, 30, 0, 40, [[0, tint(al, 0.55)], [1, shade(al, 0.08)]], 34, 26), al, 2.2);
  oval(ctx, 48, 22, 6, 3.5, P.bark, P.bark, 0, 2);
  hi(ctx, 28, 31, 7, 2.4, -0.4, 0.75);
  hi(ctx, 22, 74, 2, 3.5, 0, 0.6);
  steam(ctx, 30, 22, 14, 0.7);
  steam(ctx, 66, 20, 12, 0.6);
};

// ---------------------------------------------------------------------------
// Decor (small icon versions)
// ---------------------------------------------------------------------------

function geraniumHead(ctx: Ctx, x: number, y: number, r: number): void {
  const pet = P.rose;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 0.55;
    const py = y + Math.sin(a) * r * 0.5;
    oval(ctx, px, py, r * 0.42, r * 0.4, ball(ctx, px, py, r * 0.42, pet, 0.4, 0.08), pet, 0, 1.5);
  }
  oval(ctx, x, y, r * 0.42, r * 0.4, ball(ctx, x, y, r * 0.42, tint(pet, 0.15), 0.4), pet, 0, 1.5);
  dot(ctx, x - r * 0.3, y - r * 0.3, r * 0.12, P.cream, 0.8);
}

function roundLeaf(ctx: Ctx, x: number, y: number, r: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * (i % 2 === 0 ? 1 : 0.9);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]);
  }
  fillPath(ctx, smoothPath(pts, 0.5), ball(ctx, x, y, r, P.sage, 0.3, 0.08), P.sage, 2);
  line(ctx, (c) => c.ellipse(x, y, r * 0.55, r * 0.45, 0, 0, Math.PI * 2), rgba(P.moss, 0.45), 1.6);
}

const geraniumTin: Draw = (ctx) => {
  ground(ctx, 84, 28);
  roundLeaf(ctx, 30, 50, 11);
  roundLeaf(ctx, 66, 48, 11);
  roundLeaf(ctx, 48, 52, 10);
  line(ctx, (c) => {
    c.moveTo(44, 52);
    c.quadraticCurveTo(40, 36, 36, 26);
    c.moveTo(52, 52);
    c.quadraticCurveTo(58, 34, 62, 22);
  }, P.moss, 2.4);
  geraniumHead(ctx, 36, 24, 13);
  geraniumHead(ctx, 62, 20, 12);
  // Ghee tin.
  const tin = mix(P.butter, A['steamer'], 0.35);
  shape(ctx, (c) => {
    c.moveTo(26, 56);
    c.lineTo(29, 80);
    c.quadraticCurveTo(48, 85, 67, 80);
    c.lineTo(70, 56);
    c.closePath();
  }, hg(ctx, 26, 70, tin, 0.35, 0.12), tin);
  shape(ctx, (c) => {
    c.moveTo(27.5, 64);
    c.quadraticCurveTo(48, 68, 68.5, 64);
    c.lineTo(68, 72);
    c.quadraticCurveTo(48, 76, 28.5, 72);
    c.closePath();
  }, A['tin-blue'], A['tin-blue'], 1.6);
  shape(ctx, (c) => c.ellipse(48, 56, 22, 4.5, 0, 0, Math.PI * 2), mix(P.bark, P.moss, 0.3), tin, 2);
  hi(ctx, 33, 68, 2, 7, 0, 0.6);
};

const littleLaltin: Draw = (ctx) => {
  glowDisc(ctx, 48, 52, 42, P.glow, 0.55);
  ground(ctx, 88, 24);
  const tin = A['tin-blue'];
  // Wire handle.
  line(ctx, (c) => {
    c.moveTo(34, 34);
    c.bezierCurveTo(30, 6, 66, 6, 62, 34);
  }, shade(A['steamer'], 0.3), 2.4);
  // Glass globe.
  const globe = new Path2D();
  globe.moveTo(36, 34);
  globe.bezierCurveTo(24, 44, 26, 64, 38, 70);
  globe.lineTo(58, 70);
  globe.bezierCurveTo(70, 64, 72, 44, 60, 34);
  globe.closePath();
  ctx.fillStyle = rGrad(ctx, 48, 54, 0, 22, [[0, tint(P.glow, 0.6)], [0.5, P.glow, 0.85], [1, mix(P.glow, P.cream, 0.4), 0.7]]);
  ctx.fill(globe);
  // Flame.
  shape(ctx, (c) => {
    c.moveTo(48, 44);
    c.quadraticCurveTo(55, 54, 48, 60);
    c.quadraticCurveTo(41, 54, 48, 44);
    c.closePath();
  }, lGrad(ctx, 0, 44, 0, 60, [[0, tint(P.glow, 0.5)], [1, P.ember]]), P.ember, 1.4);
  ctx.strokeStyle = shade(P.glow, 0.25);
  ctx.lineWidth = 2;
  ctx.stroke(globe);
  hi(ctx, 36, 50, 2.2, 7, 0.2, 0.7);
  // Wire guards.
  line(ctx, (c) => {
    c.moveTo(42, 34);
    c.quadraticCurveTo(38, 52, 42, 70);
    c.moveTo(54, 34);
    c.quadraticCurveTo(58, 52, 54, 70);
  }, rgba(shade(A['steamer'], 0.3), 0.8), 1.5);
  // Top cap.
  shape(ctx, (c) => {
    c.moveTo(34, 36);
    c.quadraticCurveTo(48, 22, 62, 36);
    c.quadraticCurveTo(48, 40, 34, 36);
    c.closePath();
  }, hg(ctx, 34, 62, tin), tin, 2);
  // Tank base.
  shape(ctx, (c) => {
    c.moveTo(30, 70);
    c.quadraticCurveTo(26, 84, 36, 84);
    c.lineTo(60, 84);
    c.quadraticCurveTo(70, 84, 66, 70);
    c.closePath();
  }, hg(ctx, 26, 70, tin), tin);
  hi(ctx, 34, 76, 4, 2, 0, 0.6);
};

const pirkaStool: Draw = (ctx) => {
  ground(ctx, 84, 36);
  const wood = mix(P.bark, A['shop-wood'], 0.35);
  // Legs.
  for (const [x, w] of [[20, 7], [72, 7], [34, 6], [60, 6]] as const) {
    shape(ctx, (c) => c.roundRect(x - w / 2, 54, w, 26, 3), hg(ctx, x - w / 2, x + w / 2, wood), wood, 2);
  }
  // Seat slab with woven jute top.
  shape(ctx, (c) => c.roundRect(10, 50, 76, 12, 6), hg(ctx, 10, 86, wood, 0.3), wood);
  shape(ctx, (c) => c.ellipse(48, 48, 38, 9, 0, 0, Math.PI * 2), rGrad(ctx, 40, 46, 0, 40, [[0, tint(A['jute'], 0.4)], [1, A['jute']]]), A['jute'], 2);
  clipTo(ctx, (() => {
    const p = new Path2D();
    p.ellipse(48, 48, 36, 7.5, 0, 0, Math.PI * 2);
    return p;
  })(), () => {
    line(ctx, (c) => {
      for (let x = 6; x < 96; x += 6) {
        c.moveTo(x, 40);
        c.lineTo(x + 8, 56);
        c.moveTo(x + 8, 40);
        c.lineTo(x, 56);
      }
    }, rgba(shade(A['jute'], 0.25), 0.5), 1.1);
  });
  hi(ctx, 26, 46, 8, 2, -0.1, 0.55);
};

const woolBunting: Draw = (ctx) => {
  ground(ctx, 84, 30, 0.08);
  // Two little posts so it reads as hung.
  for (const x of [10, 86]) shape(ctx, (c) => c.roundRect(x - 3, 20, 6, 62, 3), hg(ctx, x - 3, x + 3, P.bark), P.bark, 2);
  const y = (x: number) => 26 + Math.sin(((x - 10) / 76) * Math.PI) * 16;
  line(ctx, (c) => {
    c.moveTo(10, 26);
    c.quadraticCurveTo(48, 58, 86, 26);
  }, A['jute'], 2.4);
  const cols = [P.rose, P.butter, A['tin-mint']];
  [24, 40, 56, 72].forEach((x, i) => {
    const top = y(x) + 1;
    const col = cols[i % 3];
    const tri = smoothPath([[x - 8, top], [x + 8, top + 1], [x + 0.5, top + 24]], 0.12);
    fillPath(ctx, tri, lGrad(ctx, 0, top, 0, top + 24, [[0, tint(col, 0.3)], [1, col]]), col, 2);
    clipTo(ctx, tri, () => {
      // Knit V stitches.
      line(ctx, (c) => {
        for (let r = 0; r < 3; r++) {
          const yy = top + 5 + r * 5;
          c.moveTo(x - 4, yy);
          c.lineTo(x - 2, yy + 2.5);
          c.lineTo(x, yy);
          c.moveTo(x, yy);
          c.lineTo(x + 2, yy + 2.5);
          c.lineTo(x + 4, yy);
        }
      }, rgba(shade(col, 0.2), 0.5), 1);
    });
  });
};

const bambooChime: Draw = (ctx) => {
  ground(ctx, 88, 22, 0.1);
  // Hanging loop.
  line(ctx, (c) => {
    c.moveTo(48, 20);
    c.lineTo(48, 8);
  }, A['jute'], 2);
  // Top disc.
  shape(ctx, (c) => c.ellipse(48, 22, 26, 6, 0, 0, Math.PI * 2), hg(ctx, 22, 74, A['shop-wood']), A['shop-wood'], 2);
  const tubes: [number, number][] = [[30, 46], [40, 56], [50, 62], [60, 52], [68, 42]];
  for (const [x, len] of tubes) {
    line(ctx, (c) => {
      c.moveTo(x, 24);
      c.lineTo(x, 32);
    }, rgba(A['jute'], 0.9), 1.4);
    shape(ctx, (c) => c.roundRect(x - 3.6, 32, 7.2, len - 10, 3.6), hg(ctx, x - 3.6, x + 3.6, A['malingo'], 0.35), A['malingo'], 2);
    line(ctx, (c) => {
      c.moveTo(x - 3.6, 32 + (len - 10) * 0.55);
      c.lineTo(x + 3.6, 32 + (len - 10) * 0.55);
    }, shade(A['malingo'], 0.25), 1.4);
  }
  // Striker and little wind sail.
  line(ctx, (c) => {
    c.moveTo(48, 24);
    c.lineTo(48, 78);
  }, rgba(A['jute'], 0.9), 1.4);
  oval(ctx, 48, 60, 5, 2.4, A['shop-wood'], A['shop-wood'], 0, 1.6);
  shape(ctx, (c) => {
    c.moveTo(48, 76);
    c.quadraticCurveTo(56, 80, 48, 90);
    c.quadraticCurveTo(40, 80, 48, 76);
    c.closePath();
  }, P.rose, P.rose, 1.6);
  // Sound notes as two little arcs.
  line(ctx, (c) => {
    c.arc(18, 52, 5, -0.9, 0.9);
    c.moveTo(80, 50);
    c.arc(76, 58, 5, -0.9, 0.9);
  }, rgba(P.lavender, 0.7), 1.6);
};

const radiRug: Draw = (ctx) => {
  ground(ctx, 82, 40, 0.12);
  const rug = new Path2D();
  rug.moveTo(16, 40);
  rug.lineTo(80, 40);
  rug.quadraticCurveTo(84, 40, 85, 44);
  rug.lineTo(90, 70);
  rug.quadraticCurveTo(91, 76, 86, 76);
  rug.lineTo(10, 76);
  rug.quadraticCurveTo(5, 76, 6, 70);
  rug.lineTo(11, 44);
  rug.quadraticCurveTo(12, 40, 16, 40);
  rug.closePath();
  fillPath(ctx, rug, A['lokta'], A['cream-line']);
  clipTo(ctx, rug, () => {
    const stripes = [P.rose, P.butter, P.lavender, P.rose, P.butter, P.lavender, P.rose];
    stripes.forEach((c0, i) => {
      const x = 4 + i * 13.4;
      fillOnly(ctx, (c) => c.rect(x + 3, 38, 7, 40), c0);
      line(ctx, (c) => {
        for (let y = 42; y < 76; y += 5) {
          c.moveTo(x + 4, y);
          c.lineTo(x + 6.5, y + 2.5);
          c.lineTo(x + 9, y);
        }
      }, rgba(shade(c0, 0.2), 0.45), 1);
    });
    hi(ctx, 30, 46, 16, 2, 0, 0.35);
  });
  ctx.strokeStyle = shade(A['lokta'], 0.28);
  ctx.lineWidth = OL;
  ctx.stroke(rug);
  // Fringe.
  line(ctx, (c) => {
    for (let x = 12; x <= 84; x += 6) {
      c.moveTo(x, 76);
      c.lineTo(x - 0.5, 83);
      c.moveTo(x + 2 + (x - 48) * 0.08, 40);
      c.lineTo(x + 2 + (x - 48) * 0.1, 34);
    }
  }, A['cream-line'], 1.8);
};

const junkiriLights: Draw = (ctx) => {
  line(ctx, (c) => {
    c.moveTo(6, 22);
    c.quadraticCurveTo(48, 78, 90, 22);
  }, mix(P.moss, P.bark, 0.4), 2.8);
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const x = (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * 48 + t * t * 90;
    const y = (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * 78 + t * t * 22;
    pts.push([x, y]);
  }
  for (const [x, y] of pts) glowDisc(ctx, x, y + 6, 15, P.glow, 0.8);
  pts.forEach(([x, y], i) => {
    line(ctx, (c) => {
      c.moveTo(x, y);
      c.lineTo(x, y + 3);
    }, mix(P.moss, P.bark, 0.4), 2);
    const col = i % 2 === 0 ? P.glow : mix(P.glow, P.butter, 0.5);
    shape(ctx, (c) => {
      c.moveTo(x - 3.5, y + 3);
      c.quadraticCurveTo(x - 7.5, y + 11, x, y + 15);
      c.quadraticCurveTo(x + 7.5, y + 11, x + 3.5, y + 3);
      c.closePath();
    }, lGrad(ctx, 0, y + 3, 0, y + 15, [[0, tint(col, 0.6)], [1, col]]), mix(P.glow, P.ember, 0.3), 1.8);
    dot(ctx, x - 1.6, y + 7.5, 1.3, P.cream);
  });
  twinkle(ctx, 22, 70, 3.4);
  twinkle(ctx, 76, 74, 2.8);
};

const teaChestShelf: Draw = (ctx) => {
  ground(ctx, 86, 36);
  const wood = A['shop-wood'];
  // Chest frame on its side.
  shape(ctx, (c) => c.roundRect(14, 20, 68, 64, 6), hg(ctx, 14, 82, wood, 0.3, 0.12), wood);
  // Inside.
  fillOnly(ctx, (c) => c.roundRect(21, 27, 54, 50, 3), mix(P.bark, wood, 0.25));
  // Shelf board.
  shape(ctx, (c) => c.roundRect(19, 50, 58, 5, 2), tint(wood, 0.2), wood, 1.8);
  // Books, top shelf.
  const books: [number, number, number, string][] = [
    [24, 32, 7, P.rose],
    [31.5, 30, 7, P.powder],
    [39, 34, 6, P.butter],
    [45.5, 31, 7, A['tea-green']],
  ];
  for (const [x, top, w, c0] of books) {
    shape(ctx, (c) => c.roundRect(x, top, w, 50 - top, 2), hg(ctx, x, x + w, c0, 0.3), c0, 1.6);
    line(ctx, (c) => {
      c.moveTo(x + 1.5, top + 4);
      c.lineTo(x + w - 1.5, top + 4);
    }, rgba(P.cream, 0.7), 1.2);
  }
  // A leaning book and a tiny plant.
  withState(ctx, () => {
    ctx.translate(60, 50);
    ctx.rotate(0.35);
    shape(ctx, (c) => c.roundRect(-3.5, -17, 7, 17, 2), hg(ctx, -3.5, 3.5, P.lavender, 0.3), P.lavender, 1.6);
  });
  // Bottom shelf: stacked lying books.
  shape(ctx, (c) => c.roundRect(24, 70, 30, 6, 2), hg(ctx, 24, 54, P.peach), P.peach, 1.6);
  shape(ctx, (c) => c.roundRect(27, 64, 26, 6, 2), hg(ctx, 27, 53, A['tin-blue']), A['tin-blue'], 1.6);
  leaf(ctx, 66, 76, 10, 3.6, -1.9, P.sage);
  leaf(ctx, 66, 76, 10, 3.6, -1.2, P.sage);
  shape(ctx, (c) => c.roundRect(60, 70, 12, 7, 2.5), A['copper'], A['copper'], 1.6);
  // Corner brackets.
  for (const [x, y] of [[14, 20], [74, 20], [14, 76], [74, 76]] as const) fillOnly(ctx, (c) => c.roundRect(x, y, 8, 8, 2), rgba(A['steamer'], 0.75));
  hi(ctx, 20, 36, 2, 9, 0, 0.5);
};

const shawlHammock: Draw = (ctx) => {
  ground(ctx, 84, 40, 0.12);
  // Two rhodo stubs.
  for (const x of [12, 84]) {
    shape(ctx, (c) => c.roundRect(x - 4.5, 18, 9, 66, 4.5), hg(ctx, x - 4.5, x + 4.5, P.bark), P.bark, 2);
    for (const dx of [-4, 4]) leaf(ctx, x, 20, 11, 4, dx < 0 ? -2.6 : -0.5, P.moss);
  }
  // Ropes.
  line(ctx, (c) => {
    c.moveTo(14, 30);
    c.lineTo(24, 44);
    c.moveTo(82, 30);
    c.lineTo(72, 44);
  }, A['jute'], 2);
  // Shawl sling.
  const col = mix(P.rose, P.lavender, 0.35);
  const sling = new Path2D();
  sling.moveTo(22, 42);
  sling.quadraticCurveTo(48, 54, 74, 42);
  sling.quadraticCurveTo(76, 48, 72, 52);
  sling.quadraticCurveTo(48, 84, 24, 52);
  sling.quadraticCurveTo(20, 48, 22, 42);
  sling.closePath();
  fillPath(ctx, sling, lGrad(ctx, 0, 42, 0, 72, [[0, tint(col, 0.35)], [1, col]]), col);
  clipTo(ctx, sling, () => {
    line(ctx, (c) => {
      c.moveTo(20, 54);
      c.quadraticCurveTo(48, 74, 76, 54);
      c.moveTo(20, 60);
      c.quadraticCurveTo(48, 80, 76, 60);
    }, rgba(P.cream, 0.7), 2.4);
    line(ctx, (c) => {
      c.moveTo(20, 48);
      c.quadraticCurveTo(48, 66, 76, 48);
    }, rgba(P.butter, 0.75), 2.4);
  });
  // Fringe.
  line(ctx, (c) => {
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const x = 26 + t * 44;
      const y = 52 + Math.sin(t * Math.PI) * 14;
      c.moveTo(x, y);
      c.lineTo(x, y + 5);
    }
  }, col, 1.6);
};

const brassStarScope: Draw = (ctx) => {
  ground(ctx, 86, 32);
  const brass = A['bell'];
  const wood = A['shop-wood'];
  // Tripod.
  line(ctx, (c) => {
    c.moveTo(46, 54);
    c.lineTo(26, 84);
    c.moveTo(46, 54);
    c.lineTo(64, 84);
    c.moveTo(46, 54);
    c.lineTo(48, 86);
  }, shade(wood, 0.2), 5);
  line(ctx, (c) => {
    c.moveTo(46, 54);
    c.lineTo(26, 84);
    c.moveTo(46, 54);
    c.lineTo(64, 84);
    c.moveTo(46, 54);
    c.lineTo(48, 86);
  }, wood, 2.6);
  // Tube.
  withState(ctx, () => {
    ctx.translate(46, 50);
    ctx.rotate(-0.55);
    shape(ctx, (c) => c.roundRect(-26, -6, 40, 12, 5), lGrad(ctx, 0, -6, 0, 6, [[0, tint(brass, 0.5)], [0.5, brass], [1, shade(brass, 0.15)]]), brass);
    shape(ctx, (c) => c.roundRect(12, -8, 20, 16, 5), lGrad(ctx, 0, -8, 0, 8, [[0, tint(brass, 0.5)], [0.5, brass], [1, shade(brass, 0.15)]]), brass);
    shape(ctx, (c) => c.roundRect(-34, -4, 10, 8, 3), lGrad(ctx, 0, -4, 0, 4, [[0, tint(brass, 0.4)], [1, shade(brass, 0.1)]]), brass, 2);
    line(ctx, (c) => {
      c.moveTo(-10, -6);
      c.lineTo(-10, 6);
      c.moveTo(4, -6);
      c.lineTo(4, 6);
    }, shade(brass, 0.3), 1.4);
    oval(ctx, 32, 0, 3, 8, rgba(A['moon-snow'], 0.95), brass, 0, 2);
    hi(ctx, 6, -3.5, 14, 1.2, 0, 0.7);
  });
  oval(ctx, 46, 52, 4, 4, P.bark, P.bark, 0, 1.8);
  // A star in its sight.
  withState(ctx, () => {
    glowDisc(ctx, 82, 16, 14, P.glow, 0.8);
    ctx.beginPath();
    starPath(ctx, 82, 16, 8);
    fillOutline2(ctx, P.butter);
  });
  twinkle(ctx, 66, 8, 3);
};

function fillOutline2(ctx: Ctx, col: string): void {
  ctx.fillStyle = lGrad(ctx, 0, 8, 0, 24, [[0, tint(col, 0.4)], [1, col]]);
  ctx.fill();
  ctx.strokeStyle = shade(col, 0.28);
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function scalePath(cx: number, cy: number, w: number, h: number): Path2D {
  // Rounded scallop: broad rounded top edge, softly pointed base.
  const p = new Path2D();
  p.moveTo(cx, cy + h * 0.5);
  p.bezierCurveTo(cx - w * 0.36, cy + h * 0.36, cx - w * 0.52, cy + h * 0.02, cx - w * 0.5, cy - h * 0.18);
  p.bezierCurveTo(cx - w * 0.46, cy - h * 0.52, cx + w * 0.46, cy - h * 0.52, cx + w * 0.5, cy - h * 0.18);
  p.bezierCurveTo(cx + w * 0.52, cy + h * 0.02, cx + w * 0.36, cy + h * 0.36, cx, cy + h * 0.5);
  p.closePath();
  return p;
}

function moonScaleAt(ctx: Ctx, cx: number, cy: number, w: number, h: number): void {
  glowDisc(ctx, cx, cy, w * 0.9, A['fish-glow'], 0.9, 1.2);
  const p = scalePath(cx, cy, w, h);
  ctx.fillStyle = lGrad(ctx, cx - w * 0.4, cy - h * 0.5, cx + w * 0.3, cy + h * 0.5, [
    [0, A['moonmilk']],
    [0.55, A['fish-glow']],
    [1, A['fish-glow-edge']],
  ]);
  ctx.fill(p);
  clipTo(ctx, p, () => {
    // Soft lavender base so it reads on cream paper.
    fillOnly(ctx, (c) => c.ellipse(cx + w * 0.1, cy + h * 0.42, w * 0.6, h * 0.36, 0, 0, Math.PI * 2), rgba(A['mist-lavender'], 0.3));
    // Nested growth lines following the rounded edge.
    for (const k of [0.74, 0.5]) {
      const inner = scalePath(cx, cy + h * 0.5 * (1 - k), w * k, h * k);
      ctx.strokeStyle = rgba(A['mistfish-line'], 0.32);
      ctx.lineWidth = 1.5;
      ctx.stroke(inner);
    }
    // Iridescent sheen.
    fillOnly(ctx, (c) => c.ellipse(cx - w * 0.12, cy - h * 0.2, w * 0.3, h * 0.12, -0.3, 0, Math.PI * 2), rgba(P.cream, 0.7));
    fillOnly(ctx, (c) => c.ellipse(cx + w * 0.22, cy + h * 0.05, w * 0.12, h * 0.2, 0.4, 0, Math.PI * 2), rgba(tint(P.rose, 0.4), 0.25));
  });
  // scale-glow rim.
  ctx.strokeStyle = A['scale-glow'];
  ctx.lineWidth = 4;
  ctx.stroke(p);
  ctx.strokeStyle = A['mistfish-line'];
  ctx.lineWidth = 2.2;
  ctx.stroke(p);
}

const kuhiroLantern: Draw = (ctx) => {
  glowDisc(ctx, 48, 54, 46, A['fish-glow'], 0.8, 1.1);
  ground(ctx, 90, 22, 0.12);
  // Hanger loop.
  line(ctx, (c) => {
    c.moveTo(48, 22);
    c.bezierCurveTo(36, 4, 60, 4, 48, 22);
  }, A['mistfish-line'], 2.2);
  // Cap.
  shape(ctx, (c) => c.roundRect(38, 20, 20, 7, 3), hg(ctx, 38, 58, A['mistfish']), A['mistfish'], 2);
  moonScaleAt(ctx, 48, 56, 50, 56);
  // The star inside.
  glowDisc(ctx, 48, 54, 14, P.glow, 0.9);
  ctx.beginPath();
  starPath(ctx, 48, 54, 8);
  ctx.fillStyle = tint(P.glow, 0.4);
  ctx.fill();
  // Tassel.
  line(ctx, (c) => {
    c.moveTo(48, 84);
    c.lineTo(48, 92);
  }, A['mist-lavender'], 2.4);
  twinkle(ctx, 76, 30, 4);
  twinkle(ctx, 20, 40, 3);
};

// ---------------------------------------------------------------------------
// Specials
// ---------------------------------------------------------------------------

const moonScale: Draw = (ctx) => {
  ground(ctx, 82, 24, 0.12);
  withState(ctx, () => {
    ctx.translate(48, 48);
    ctx.rotate(-0.3);
    moonScaleAt(ctx, 0, 0, 60, 62);
  });
  twinkle(ctx, 74, 24, 6.5);
  twinkle(ctx, 22, 70, 3.5);
  twinkle(ctx, 80, 62, 2.6);
};

/** The rupee sign drawn as vector strokes. */
function rupee(ctx: Ctx, x: number, y: number, s: number, color: string, lw: number): void {
  line(ctx, (c) => {
    c.moveTo(x - 7 * s, y - 11 * s);
    c.lineTo(x + 7 * s, y - 11 * s);
    c.moveTo(x - 7 * s, y - 5 * s);
    c.lineTo(x + 7 * s, y - 5 * s);
    c.moveTo(x - 7 * s, y - 11 * s);
    c.lineTo(x - 2 * s, y - 11 * s);
    c.quadraticCurveTo(x + 4.5 * s, y - 11 * s, x + 4.5 * s, y - 5 * s);
    c.quadraticCurveTo(x + 4.5 * s, y + 0.5 * s, x - 2 * s, y + 0.5 * s);
    c.lineTo(x - 7 * s, y + 0.5 * s);
    c.lineTo(x + 5 * s, y + 11 * s);
  }, color, lw);
}

const rupeeCoin: Draw = (ctx) => {
  ground(ctx, 86, 30, 0.16);
  const cu = A['copper'];
  // Edge (thickness).
  shape(ctx, (c) => c.ellipse(48, 51, 36, 36, 0, 0, Math.PI * 2), shade(cu, 0.12), cu);
  // Face.
  shape(ctx, (c) => c.ellipse(48, 47, 36, 36, 0, 0, Math.PI * 2), rGrad(ctx, 48, 47, 0, 38, [[0, tint(cu, 0.3)], [0.7, cu], [1, shade(cu, 0.05)]], 36, 34), cu);
  // Butter rim highlight.
  line(ctx, (c) => c.arc(48, 47, 31, Math.PI * 0.95, Math.PI * 1.65), P.butter, 3.2);
  line(ctx, (c) => c.arc(48, 47, 31, 0, Math.PI * 2), rgba(A['copper-line'], 0.45), 1.4);
  // 5-dot gurans emboss.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    dot(ctx, 48 + Math.cos(a) * 20, 47 + Math.sin(a) * 20, 3.2, A['gurans-deep'], 0.5);
  }
  // Stamped rupee sign (with a cream bevel offset).
  rupee(ctx, 49, 48.5, 0.95, rgba(tint(cu, 0.6), 0.8), 3);
  rupee(ctx, 48, 47.5, 0.95, A['copper-line'], 3);
  hi(ctx, 34, 30, 7, 3.2, -0.7, 0.7);
};

const miniDoko: Draw = (ctx) => {
  ground(ctx, 88, 24);
  const dk = A['doko'];
  const band = A['doko-band'];
  // Namlo strap loop.
  line(ctx, (c) => {
    c.moveTo(24, 30);
    c.bezierCurveTo(14, 2, 82, 2, 72, 30);
  }, shade(A['jute'], 0.25), 6);
  line(ctx, (c) => {
    c.moveTo(24, 30);
    c.bezierCurveTo(14, 2, 82, 2, 72, 30);
  }, A['jute'], 3.4);
  // Grass and a gurans peeking out.
  leaf(ctx, 40, 30, 18, 3.4, -2.0, P.sage);
  leaf(ctx, 56, 30, 18, 3.4, -1.1, mix(P.sage, P.moss, 0.4));
  leaf(ctx, 48, 30, 16, 3, -1.6, P.sage);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    oval(ctx, 60 + Math.cos(a) * 3.6, 20 + Math.sin(a) * 3.6, 3.4, 3, A['gurans'], A['gurans'], a, 1.2);
  }
  dot(ctx, 60, 20, 1.8, P.butter);
  // Conical basket.
  const body = new Path2D();
  body.moveTo(16, 30);
  body.quadraticCurveTo(48, 36, 80, 30);
  body.quadraticCurveTo(70, 66, 58, 82);
  body.quadraticCurveTo(48, 86, 38, 82);
  body.quadraticCurveTo(26, 66, 16, 30);
  body.closePath();
  fillPath(ctx, body, hg(ctx, 16, 80, dk, 0.35, 0.1), A['doko-line']);
  clipTo(ctx, body, () => {
    // Weave.
    line(ctx, (c) => {
      for (let x = -20; x < 120; x += 7) {
        c.moveTo(x, 28);
        c.lineTo(x + 30, 90);
        c.moveTo(x + 30, 28);
        c.lineTo(x, 90);
      }
    }, rgba(A['doko-line'], 0.35), 1.2);
    // Bands.
    for (const [y, w] of [[44, 5], [62, 4.5]] as const) {
      fillOnly(ctx, (c) => {
        c.moveTo(0, y);
        c.quadraticCurveTo(48, y + 5, 96, y);
        c.lineTo(96, y + w);
        c.quadraticCurveTo(48, y + 5 + w, 0, y + w);
        c.closePath();
      }, band);
    }
    hi(ctx, 28, 46, 3, 10, 0.25, 0.4);
  });
  ctx.strokeStyle = A['doko-line'];
  ctx.lineWidth = OL;
  ctx.stroke(body);
  // Rim.
  shape(ctx, (c) => c.ellipse(48, 31, 32, 5, 0, 0, Math.PI * 2), band, A['doko-line'], 2.2);
  // Little foot ring.
  shape(ctx, (c) => c.ellipse(48, 83, 10, 3, 0, 0, Math.PI * 2), band, A['doko-line'], 2);
};

export const GEAR_ICONS: Record<string, Draw> = {
  // Gear
  leaf_tent: fernTent,
  dome_tent: monsoonDome,
  cabin_kit: tinRoofCabin,
  bamboo_rod: malingoRod,
  willow_rod: rattanRod,
  moonlight_rod: fireflyRod,
  wiggly_bait: attaBait,
  sparkle_bait: micaLure,
  kettle: chiyaKettle,
  clay_pot: copperKasaudi,
  skillet: ironTawa,
  steamer: momoSteamer,
  // Decor
  potted_flower: geraniumTin,
  paper_lantern: littleLaltin,
  floor_cushion: pirkaStool,
  bunting: woolBunting,
  wind_chime: bambooChime,
  woven_rug: radiRug,
  string_lights: junkiriLights,
  bookshelf: teaChestShelf,
  hammock: shawlHammock,
  telescope: brassStarScope,
  guardian_lantern: kuhiroLantern,
  // Specials
  moon_scale: moonScale,
  coin: rupeeCoin,
  doko: miniDoko,
};
