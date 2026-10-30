/**
 * Fish, forage, pantry and dish icons. Drawn into a 96 x 96 logical square;
 * see items.ts for baking. Fish follow docs/WORLD.md 7.3 "Look", forage 7.4,
 * pantry 7.2 and dishes 7.5 "Plate art".
 */
import { A, P } from '@/palette';
import { eye, blush, mouth, glowDisc, lGrad, rGrad, withState, eyeHappy, type Ctx } from './kit';
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

// ---------------------------------------------------------------------------
// Fish: one cute side-view body builder, head on the left.
// ---------------------------------------------------------------------------

interface FishGeo {
  nx: number;
  px: number;
  bl: number;
  h: number;
  cy: number;
  path: Path2D;
}

interface FishOpts {
  /** Body length (nose to tail root) and height. */
  bl: number;
  h: number;
  /** Tail length and half-spread. */
  tl: number;
  th: number;
  base: string;
  /** Belly colour (toward cream). */
  belly?: string;
  fin: string;
  finEdge?: string;
  finAlpha?: number;
  /** Where the top of the back peaks (0..1 of body length). */
  peak?: number;
  /** Rounded paddle tail instead of a forked one. */
  roundTail?: boolean;
  dorsal?: number;
  eyeR?: number;
  cy?: number;
  /** Shift the whole fish horizontally. */
  dx?: number;
  deco?: (ctx: Ctx, g: FishGeo) => void;
  over?: (ctx: Ctx, g: FishGeo) => void;
  mouthKind?: 'smile' | 'o' | 'w';
  cheek?: string;
}

function finFill(ctx: Ctx, o: FishOpts, y0: number, y1: number): CanvasGradient {
  const a = o.finAlpha ?? 1;
  return lGrad(ctx, 0, y0, 0, y1, [
    [0, o.fin, a],
    [1, o.finEdge ?? o.fin, a],
  ]);
}

function drawFish(ctx: Ctx, o: FishOpts): void {
  const cy = o.cy ?? 50;
  const total = o.bl + o.tl * 0.85;
  const nx = 48 - total / 2 + (o.dx ?? 0);
  const bl = o.bl;
  const h = o.h;
  const px = nx + bl;
  const pk = o.peak ?? 0.4;
  const finLine = shade(o.finEdge ?? o.fin, 0.22);

  ground(ctx, cy + h * 0.5 + 12, total * 0.42, 0.13);

  // Tail.
  const tl = o.tl;
  const th = o.th;
  const tailPts: Pt[] = o.roundTail
    ? [
        [px - 4, cy - h * 0.14],
        [px + tl * 0.6, cy - th],
        [px + tl, cy - th * 0.35],
        [px + tl, cy + th * 0.35],
        [px + tl * 0.6, cy + th],
        [px - 4, cy + h * 0.14],
      ]
    : [
        [px - 4, cy - h * 0.13],
        [px + tl * 0.55, cy - th * 0.8],
        [px + tl, cy - th],
        [px + tl * 0.88, cy - th * 0.25],
        [px + tl * 0.6, cy],
        [px + tl * 0.88, cy + th * 0.25],
        [px + tl, cy + th],
        [px + tl * 0.55, cy + th * 0.8],
        [px - 4, cy + h * 0.13],
      ];
  fillPath(ctx, smoothPath(tailPts, 0.45), lGrad(ctx, px, 0, px + tl, 0, [[0, o.fin, o.finAlpha ?? 1], [1, o.finEdge ?? o.fin, o.finAlpha ?? 1]]), finLine);
  // Tail rays.
  line(ctx, (c) => {
    c.moveTo(px + 2, cy - 2);
    c.lineTo(px + tl * 0.7, cy - th * 0.6);
    c.moveTo(px + 2, cy + 2);
    c.lineTo(px + tl * 0.7, cy + th * 0.6);
  }, rgba(finLine, 0.35), 1.3);

  // Dorsal fin.
  const df = o.dorsal ?? h * 0.28;
  const dorsal = smoothPath([
    [nx + bl * (pk - 0.12), cy - h * 0.44],
    [nx + bl * (pk + 0.02), cy - h * 0.5 - df],
    [nx + bl * (pk + 0.24), cy - h * 0.44 - df * 0.75],
    [nx + bl * (pk + 0.34), cy - h * 0.26],
    [nx + bl * pk, cy - h * 0.3],
  ]);
  fillPath(ctx, dorsal, finFill(ctx, o, cy - h * 0.3, cy - h * 0.5 - df), finLine);

  // Belly fin.
  const pelvic = smoothPath([
    [nx + bl * 0.5, cy + h * 0.36],
    [nx + bl * 0.6, cy + h * 0.5 + h * 0.22],
    [nx + bl * 0.74, cy + h * 0.46 + h * 0.18],
    [nx + bl * 0.76, cy + h * 0.28],
  ]);
  fillPath(ctx, pelvic, finFill(ctx, o, cy + h * 0.3, cy + h * 0.72), finLine);

  // Body.
  const path = smoothPath([
    [nx, cy + h * 0.02],
    [nx + bl * 0.1, cy - h * 0.36],
    [nx + bl * pk, cy - h * 0.5],
    [nx + bl * 0.78, cy - h * 0.32],
    [px, cy - h * 0.13],
    [px, cy + h * 0.13],
    [nx + bl * 0.78, cy + h * 0.3],
    [nx + bl * 0.42, cy + h * 0.5],
    [nx + bl * 0.08, cy + h * 0.36],
  ], 0.55);
  const belly = o.belly ?? tint(o.base, 0.55);
  const g: FishGeo = { nx, px, bl, h, cy, path };
  ctx.fillStyle = lGrad(ctx, 0, cy - h * 0.5, 0, cy + h * 0.5, [
    [0, shade(o.base, 0.04)],
    [0.45, o.base],
    [0.8, mix(o.base, belly, 0.7)],
    [1, belly],
  ]);
  ctx.fill(path);
  clipTo(ctx, path, () => {
    o.deco?.(ctx, g);
    // Soft top-left sheen and a gill crescent.
    hi(ctx, nx + bl * 0.36, cy - h * 0.3, bl * 0.2, h * 0.09, -0.12, 0.55);
    line(ctx, (c) => {
      c.moveTo(nx + bl * 0.22, cy - h * 0.28);
      c.quadraticCurveTo(nx + bl * 0.3, cy, nx + bl * 0.22, cy + h * 0.28);
    }, rgba(shade(o.base, 0.3), 0.35), 1.6);
  });
  ctx.lineWidth = OL;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = shade(o.base, 0.3);
  ctx.stroke(path);

  // Pectoral fin on the side.
  withState(ctx, () => {
    // Small translucent fin tucked behind the gill, sweeping back.
    ctx.translate(nx + bl * 0.27, cy + h * 0.08);
    ctx.rotate(0.35);
    const fl = Math.min(12, h * 0.3);
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.quadraticCurveTo(fl * 0.7, -fl * 0.35, fl, fl * 0.1);
    ctx.quadraticCurveTo(fl * 0.5, fl * 0.3, 0, 1.5);
    ctx.closePath();
    ctx.fillStyle = rgba(o.finEdge ?? o.fin, 0.7);
    ctx.fill();
    ctx.strokeStyle = rgba(finLine, 0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  // Face.
  const er = o.eyeR ?? Math.max(4, Math.min(5.4, h * 0.13));
  const ex = nx + bl * 0.14 + er * 0.2;
  const ey = cy - h * 0.1;
  eye(ctx, ex, ey, er * 0.88, er);
  blush(ctx, ex + er * 0.6, ey + er * 1.7, er * 0.9, er * 0.55, 0.55);
  mouth(ctx, nx + 3.2, cy + h * 0.1, o.mouthKind === 'o' ? 4 : 4.4, o.mouthKind ?? 'smile', 1.6);
  o.over?.(ctx, g);
}

/** Rounded scale arcs in rows along the body. */
function scaleArcs(ctx: Ctx, g: FishGeo, rows: number, color: string, alpha: number, r: number): void {
  for (let rI = 0; rI < rows; rI++) {
    const yy = g.cy - g.h * 0.24 + (rI * g.h * 0.48) / Math.max(1, rows - 1) - (rows === 2 ? -g.h * 0.06 : 0);
    const off = rI % 2 === 0 ? 0 : r;
    for (let x = g.nx + g.bl * 0.34 + off; x < g.px - 2; x += r * 2) {
      line(ctx, (c) => c.arc(x, yy, r, -Math.PI * 0.5, Math.PI * 0.5), rgba(color, alpha), 1.5);
    }
  }
}

const pebbleGarra: Draw = (ctx) =>
  drawFish(ctx, {
    bl: 58,
    h: 44,
    tl: 18,
    th: 14,
    peak: 0.36,
    base: A['garra'],
    belly: tint(A['garra'], 0.7),
    fin: tint(A['garra'], 0.25),
    finEdge: mix(A['garra'], P.peach, 0.35),
    mouthKind: 'o',
    deco: (c, g) => {
      for (const t of [0.48, 0.72]) {
        fillOnly(c, (cc) => cc.ellipse(g.nx + g.bl * t, g.cy - g.h * 0.32, g.bl * 0.09, g.h * 0.3, 0.15, 0, Math.PI * 2), rgba(shade(A['garra'], 0.3), 0.32));
      }
    },
    over: (c, g) => {
      // Rose sucker-lip disc under the chin.
      oval(c, g.nx + 9, g.cy + g.h * 0.42, 6.5, 3.6, ball(c, g.nx + 9, g.cy + g.h * 0.42, 6, P.rose, 0.4), P.rose, 0, 1.8);
      dot(c, g.nx + 7, g.cy + g.h * 0.4, 1.2, P.cream, 0.8);
    },
  });

const bubbleBarb: Draw = (ctx) => {
  drawFish(ctx, {
    bl: 58,
    h: 48,
    tl: 18,
    th: 15,
    peak: 0.42,
    dx: 6,
    cy: 52,
    base: A['bubble-barb'],
    fin: mix(P.butter, A['bubble-barb'], 0.25),
    finEdge: P.butter,
    mouthKind: 'o',
  });
  // Three cream bubbles trailing up from the mouth.
  for (const [x, y, r] of [[13, 36, 5], [9, 22, 3.8], [16, 11, 2.8]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(tint(P.powder, 0.55), 0.55);
    ctx.fill();
    ctx.strokeStyle = rgba(P.powder, 0.95);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    dot(ctx, x - r * 0.35, y - r * 0.35, r * 0.32, P.cream, 0.95);
  }
};

const blushingAsala: Draw = (ctx) =>
  drawFish(ctx, {
    bl: 68,
    h: 30,
    tl: 18,
    th: 12,
    peak: 0.42,
    dorsal: 9,
    base: A['asala'],
    belly: mix(A['moonmilk'], P.cream, 0.4),
    fin: tint(A['asala'], 0.3),
    finEdge: mix(A['asala'], P.peach, 0.4),
    deco: (c, g) => {
      // Faint powder sheen line.
      fillOnly(c, (cc) => cc.ellipse(g.nx + g.bl * 0.55, g.cy + 1, g.bl * 0.4, 2.2, 0, 0, Math.PI * 2), rgba(P.powder, 0.35));
      // 6 tiny ridge-near speckles.
      const sp: Pt[] = [[0.42, -0.28], [0.52, -0.18], [0.6, -0.3], [0.68, -0.16], [0.76, -0.26], [0.84, -0.12]];
      for (const [t, v] of sp) dot(c, g.nx + g.bl * t, g.cy + g.h * v, 1.5, A['ridge-near'], 0.9);
    },
    over: (c, g) => {
      // Peach cheek.
      fillOnly(c, (cc) => cc.ellipse(g.nx + g.bl * 0.2, g.cy + g.h * 0.16, 5.5, 3.6, 0, 0, Math.PI * 2), rgba(P.peach, 0.75));
    },
  });

const twilightDanio: Draw = (ctx) =>
  drawFish(ctx, {
    bl: 66,
    h: 30,
    tl: 18,
    th: 12,
    peak: 0.44,
    dorsal: 9,
    base: A['danio'],
    belly: mix(A['danio'], P.cream, 0.6),
    fin: tint(A['danio'], 0.2),
    finEdge: P.butter,
    deco: (c, g) => {
      const ys = [-0.2, 0.0, 0.18];
      ys.forEach((v, i) => {
        line(c, (cc) => {
          cc.moveTo(g.nx + g.bl * (0.3 + i * 0.04), g.cy + g.h * v);
          cc.quadraticCurveTo(g.nx + g.bl * 0.65, g.cy + g.h * v - 1.5, g.px + 2, g.cy + g.h * v * 0.35);
        }, A['danio-bar'], i === 1 ? 3.6 : 2.6);
      });
    },
  });

const monsoonLoach: Draw = (ctx) => {
  drawFish(ctx, {
    bl: 72,
    h: 24,
    tl: 13,
    th: 10,
    peak: 0.45,
    roundTail: true,
    dorsal: 6,
    eyeR: 4,
    base: A['loach'],
    belly: mix(A['loach'], P.cream, 0.6),
    fin: tint(A['loach'], 0.3),
    finEdge: mix(A['loach'], P.butter, 0.4),
    deco: (c, g) => {
      for (let i = 0; i < 5; i++) {
        const x = g.nx + g.bl * (0.36 + i * 0.13);
        fillOnly(c, (cc) => cc.ellipse(x, g.cy - g.h * 0.12, g.bl * 0.04, g.h * 0.55, 0.1, 0, Math.PI * 2), rgba(P.moss, 0.42));
      }
    },
    over: (c, g) => {
      // 4 tiny whiskers.
      const lc = shade(A['loach'], 0.35);
      line(c, (cc) => {
        cc.moveTo(g.nx + 3, g.cy + 3);
        cc.quadraticCurveTo(g.nx - 3, g.cy + 6, g.nx - 4, g.cy + 11);
        cc.moveTo(g.nx + 5, g.cy + 4);
        cc.quadraticCurveTo(g.nx + 2, g.cy + 9, g.nx + 2, g.cy + 13);
        cc.moveTo(g.nx + 2, g.cy - 1);
        cc.quadraticCurveTo(g.nx - 4, g.cy - 1, g.nx - 7, g.cy + 3);
        cc.moveTo(g.nx + 7, g.cy + 5);
        cc.quadraticCurveTo(g.nx + 7, g.cy + 10, g.nx + 9, g.cy + 13);
      }, lc, 1.5);
    },
  });
};

const junkiriGlowfin: Draw = (ctx) => {
  glowDisc(ctx, 48, 50, 44, A['fish-glow'], 0.35);
  drawFish(ctx, {
    bl: 62,
    h: 38,
    tl: 18,
    th: 14,
    peak: 0.4,
    base: A['glowfin'],
    belly: mix(A['glowfin'], A['fish-glow'], 0.55),
    fin: A['fish-glow-edge'],
    finEdge: A['fish-glow'],
    finAlpha: 0.6,
    deco: (c, g) => {
      const fr: Pt[] = [[0.42, -0.22], [0.55, 0.05], [0.66, -0.26], [0.76, 0.0], [0.86, -0.14]];
      for (const [t, v] of fr) {
        const x = g.nx + g.bl * t;
        const y = g.cy + g.h * v;
        glowDisc(c, x, y, 7, P.glow, 0.9);
        dot(c, x, y, 2.2, tint(P.glow, 0.5));
      }
    },
  });
  twinkle(ctx, 80, 20, 5, P.cream, 0.9);
};

const petalKatle: Draw = (ctx) =>
  drawFish(ctx, {
    bl: 62,
    h: 48,
    tl: 18,
    th: 15,
    peak: 0.38,
    base: A['katle'],
    belly: mix(A['katle'], P.cream, 0.6),
    fin: tint(A['gurans'], 0.35),
    finEdge: mix(A['katle'], A['gurans'], 0.6),
    deco: (c, g) => {
      const m: [number, number, number, number][] = [[0.5, -0.3, 8, 6], [0.72, -0.1, 7, 5], [0.38, 0.12, 5, 4], [0.86, -0.28, 5, 4]];
      for (const [t, v, rx, ry] of m) fillOnly(c, (cc) => cc.ellipse(g.nx + g.bl * t, g.cy + g.h * v, rx, ry, 0.4, 0, Math.PI * 2), rgba(A['gurans'], 0.5));
      scaleArcs(c, g, 2, shade(A['katle'], 0.3), 0.55, 6);
    },
  });

const goldenMahseer: Draw = (ctx) =>
  drawFish(ctx, {
    bl: 68,
    h: 42,
    tl: 18,
    th: 15,
    peak: 0.4,
    base: A['mahseer'],
    belly: mix(P.butter, P.cream, 0.5),
    fin: mix(A['mahseer'], P.peach, 0.35),
    finEdge: mix(P.peach, A['mahseer'], 0.3),
    deco: (c, g) => {
      scaleArcs(c, g, 3, shade(A['mahseer'], 0.32), 0.55, 5.2);
      hi(c, g.nx + g.bl * 0.55, g.cy - g.h * 0.18, 10, 3, -0.1, 0.55);
      dot(c, g.nx + g.bl * 0.75, g.cy - g.h * 0.06, 1.6, P.butter);
    },
    over: (c, g) => {
      // 2 short cream barbels.
      const lc = mix(P.cream, A['cream-line'], 0.4);
      line(c, (cc) => {
        cc.moveTo(g.nx + 4, g.cy + 5);
        cc.quadraticCurveTo(g.nx - 1, g.cy + 9, g.nx - 2, g.cy + 15);
        cc.moveTo(g.nx + 8, g.cy + 7);
        cc.quadraticCurveTo(g.nx + 6, g.cy + 12, g.nx + 7, g.cy + 17);
      }, lc, 2.4);
    },
  });

// ---------------------------------------------------------------------------
// Forage
// ---------------------------------------------------------------------------

function raspberry(ctx: Ctx, x: number, y: number, r: number, base: string): void {
  oval(ctx, x, y, r, r * 1.08, base, base, 0, 2.2);
  const dr = r * 0.34;
  const pts: Pt[] = [];
  for (let row = -2; row <= 2; row++) {
    const w = Math.sqrt(Math.max(0, 1 - (row / 2.6) ** 2)) * r * 0.82;
    const n = row === -2 || row === 2 ? 2 : 3;
    for (let i = 0; i < n; i++) pts.push([x - w + (2 * w * (i + 0.5)) / n, y + row * dr * 1.45]);
  }
  for (const [px, py] of pts) {
    ctx.fillStyle = ball(ctx, px, py, dr, base, 0.5, 0.1);
    ctx.beginPath();
    ctx.arc(px, py, dr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(base, 0.25), 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    dot(ctx, px - dr * 0.35, py - dr * 0.35, dr * 0.28, P.cream, 0.85);
  }
}

function calyx(ctx: Ctx, x: number, y: number, s: number): void {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + ((i - 2) * Math.PI) / 5.5;
    leaf(ctx, x, y, s, s * 0.32, a + Math.PI / 2 + Math.PI, P.sage);
  }
}

const ainseluBerries: Draw = (ctx) => {
  ground(ctx, 84, 30);
  leaf(ctx, 50, 30, 30, 10, -0.5, P.sage);
  leaf(ctx, 46, 32, 28, 9, -2.5, mix(P.sage, P.moss, 0.4));
  line(ctx, (c) => {
    c.moveTo(48, 30);
    c.quadraticCurveTo(40, 40, 32, 50);
    c.moveTo(48, 30);
    c.quadraticCurveTo(58, 40, 62, 52);
    c.moveTo(48, 30);
    c.lineTo(48, 40);
  }, P.moss, 2.4);
  raspberry(ctx, 30, 62, 15, A['ainselu']);
  raspberry(ctx, 64, 63, 15, A['ainselu']);
  raspberry(ctx, 48, 50, 15, tint(A['ainselu'], 0.1));
  calyx(ctx, 48, 36, 7);
};

function mushroom(ctx: Ctx, x: number, y: number, r: number, seed: number): void {
  const capCol = A['chyau'];
  // Stem.
  shape(ctx, (c) => {
    c.moveTo(x - r * 0.32, y - r * 0.1);
    c.quadraticCurveTo(x - r * 0.42, y + r * 0.7, x - r * 0.38, y + r * 0.95);
    c.quadraticCurveTo(x, y + r * 1.1, x + r * 0.38, y + r * 0.95);
    c.quadraticCurveTo(x + r * 0.42, y + r * 0.7, x + r * 0.32, y - r * 0.1);
    c.closePath();
  }, lGrad(ctx, x - r * 0.4, 0, x + r * 0.4, 0, [[0, P.cream], [1, A['cream-line']]]), A['cream-line'], 2.2);
  // Gill band.
  shape(ctx, (c) => c.ellipse(x, y, r * 0.95, r * 0.28, 0, 0, Math.PI * 2), tint(A['cream-line'], 0.4), A['cream-line'], 2);
  line(ctx, (c) => {
    for (let i = -3; i <= 3; i++) {
      c.moveTo(x + i * r * 0.22, y - r * 0.05);
      c.lineTo(x + i * r * 0.28, y + r * 0.18);
    }
  }, rgba(shade(A['cream-line'], 0.2), 0.7), 1.1);
  // Domed cap.
  shape(ctx, (c) => {
    c.moveTo(x - r, y - r * 0.02);
    c.bezierCurveTo(x - r * 1.02, y - r * 1.05, x + r * 1.02, y - r * 1.05, x + r, y - r * 0.02);
    c.quadraticCurveTo(x, y + r * 0.18, x - r, y - r * 0.02);
    c.closePath();
  }, ball(ctx, x, y - r * 0.45, r, capCol, 0.4, 0.15), capCol, 2.4);
  hi(ctx, x - r * 0.38, y - r * 0.55, r * 0.26, r * 0.13, -0.5, 0.8);
  void seed;
  dot(ctx, x + r * 0.3, y - r * 0.5, r * 0.09, P.cream, 0.7);
  dot(ctx, x + r * 0.05, y - r * 0.7, r * 0.07, P.cream, 0.6);
}

const puffcapChyau: Draw = (ctx) => {
  ground(ctx, 84, 34);
  leaf(ctx, 20, 80, 16, 5, -0.6, P.moss);
  leaf(ctx, 76, 80, 16, 5, -2.5, P.sage);
  mushroom(ctx, 70, 62, 14, 2);
  mushroom(ctx, 26, 64, 12, 3);
  mushroom(ctx, 46, 46, 22, 1);
};

function scallopLeaf(ctx: Ctx, x: number, y: number, len: number, wid: number, rot: number, base: string): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pts: Pt[] = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      // Ovate leaf with gentle scallops (never jagged).
      const along = (1 - Math.cos(t)) / 2;
      const r = Math.sin(t) * wid * Math.sin(along * Math.PI) ** 0.7 * (i % 2 === 0 ? 1 : 0.86);
      pts.push([along * len, r]);
    }
    const p = smoothPath(pts, 0.5);
    fillPath(ctx, p, lGrad(ctx, 0, -wid, 0, wid, [[0, tint(base, 0.3)], [1, shade(base, 0.04)]]), base, 2);
    line(ctx, (c) => {
      c.moveTo(len * 0.05, 0);
      c.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.85, 0);
      for (const t of [0.3, 0.5, 0.68]) {
        c.moveTo(len * t, 0);
        c.lineTo(len * (t + 0.12), -wid * 0.45);
        c.moveTo(len * t, 0);
        c.lineTo(len * (t + 0.12), wid * 0.45);
      }
    }, rgba(shade(base, 0.25), 0.55), 1.2);
  });
}

const sisnuNettles: Draw = (ctx) => {
  ground(ctx, 86, 22);
  line(ctx, (c) => {
    c.moveTo(46, 86);
    c.quadraticCurveTo(50, 50, 46, 16);
  }, shade(A['sisnu'], 0.15), 3.4);
  const L = A['sisnu'];
  scallopLeaf(ctx, 48, 70, 30, 11, -2.6, mix(L, P.moss, 0.25));
  scallopLeaf(ctx, 49, 68, 30, 11, -0.55, mix(L, P.moss, 0.25));
  scallopLeaf(ctx, 49, 50, 28, 10, -2.75, L);
  scallopLeaf(ctx, 49, 48, 28, 10, -0.4, L);
  scallopLeaf(ctx, 48, 32, 22, 8, -2.85, tint(L, 0.12));
  scallopLeaf(ctx, 48, 30, 22, 8, -0.3, tint(L, 0.12));
  scallopLeaf(ctx, 47, 22, 16, 7, -1.6, tint(L, 0.25));
};

function burr(ctx: Ctx, x: number, y: number, r: number): void {
  const base = A['katus'];
  const pts: Pt[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (i % 2 === 0 ? 1.06 : 0.9);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  fillPath(ctx, smoothPath(pts, 0.5), ball(ctx, x, y, r, base, 0.35, 0.12), base, 2.3);
  // Lighter fuzz ring.
  ctx.strokeStyle = rgba(tint(base, 0.55), 0.85);
  ctx.lineWidth = 2;
  ctx.setLineDash([1.6, 2.6]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.1;
    dot(ctx, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, 1.1, tint(base, 0.6), 0.9);
  }
  hi(ctx, x - r * 0.4, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0.6);
}

function chestnut(ctx: Ctx, x: number, y: number, r: number): void {
  const nut = mix(P.bark, A['katus'], 0.3);
  shape(ctx, (c) => {
    c.moveTo(x, y - r * 1.05);
    c.bezierCurveTo(x + r * 0.5, y - r * 0.9, x + r * 1.05, y - r * 0.1, x + r * 0.95, y + r * 0.55);
    c.quadraticCurveTo(x, y + r * 0.95, x - r * 0.95, y + r * 0.55);
    c.bezierCurveTo(x - r * 1.05, y - r * 0.1, x - r * 0.5, y - r * 0.9, x, y - r * 1.05);
    c.closePath();
  }, ball(ctx, x, y, r, nut, 0.35, 0.1), nut, 2.3);
  // Pale base patch.
  shape(ctx, (c) => {
    c.moveTo(x - r * 0.88, y + r * 0.42);
    c.quadraticCurveTo(x, y + r * 0.2, x + r * 0.88, y + r * 0.42);
    c.quadraticCurveTo(x, y + r * 0.92, x - r * 0.88, y + r * 0.42);
    c.closePath();
  }, mix(A['chyau'], P.cream, 0.35), A['chyau'], 1.6);
  hi(ctx, x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.12, -0.9, 0.75);
  dot(ctx, x, y - r * 1.02, 1.8, shade(nut, 0.2));
}

const katusNuts: Draw = (ctx) => {
  ground(ctx, 82, 32);
  burr(ctx, 33, 56, 18);
  burr(ctx, 60, 44, 15);
  chestnut(ctx, 62, 66, 13);
};

function gurans5(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  const base = A['moon-gurans'];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    withState(ctx, () => {
      ctx.translate(x, y);
      ctx.rotate(a);
      shape(ctx, (c) => {
        c.moveTo(0, 0);
        c.bezierCurveTo(-r * 0.55, -r * 0.2, -r * 0.5, -r * 1.05, 0, -r);
        c.bezierCurveTo(r * 0.5, -r * 1.05, r * 0.55, -r * 0.2, 0, 0);
        c.closePath();
      }, lGrad(ctx, 0, -r, 0, 0, [[0, base], [1, mix(base, P.blush, 0.18)]]), mix(A['cream-line'], A['mist-lavender'], 0.35), 1.7);
    });
  }
  dot(ctx, x, y, r * 0.22, mix(P.butter, A['gurans'], 0.25));
  for (let i = 0; i < 3; i++) {
    const a = rot - 0.5 + i * 0.5;
    line(ctx, (c) => {
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
    }, rgba(A['gurans-deep'], 0.5), 1);
    dot(ctx, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, 1.1, A['gurans-deep'], 0.7);
  }
}

const moonGurans: Draw = (ctx) => {
  glowDisc(ctx, 48, 44, 46, A['fish-glow'], 0.9, 1.2);
  ground(ctx, 86, 24, 0.12);
  leaf(ctx, 48, 62, 30, 8, 2.4, P.moss);
  leaf(ctx, 48, 62, 30, 8, 0.75, P.moss);
  leaf(ctx, 48, 62, 26, 7, 1.57, mix(P.moss, P.sage, 0.4));
  gurans5(ctx, 32, 46, 13, 0.2);
  gurans5(ctx, 64, 46, 13, -0.3);
  gurans5(ctx, 40, 30, 13, 0.6);
  gurans5(ctx, 58, 28, 12, 0.1);
  gurans5(ctx, 48, 48, 13, 0);
  twinkle(ctx, 80, 16, 5);
  twinkle(ctx, 16, 22, 3.5);
};

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

function sack(ctx: Ctx, x: number, top: number, bottom: number, w: number, cloth: string): void {
  shape(ctx, (c) => {
    c.moveTo(x - w * 0.36, top);
    c.bezierCurveTo(x - w * 0.62, top + (bottom - top) * 0.35, x - w * 0.6, bottom, x - w * 0.3, bottom);
    c.lineTo(x + w * 0.3, bottom);
    c.bezierCurveTo(x + w * 0.6, bottom, x + w * 0.62, top + (bottom - top) * 0.35, x + w * 0.36, top);
    c.closePath();
  }, lGrad(ctx, x - w * 0.5, 0, x + w * 0.5, 0, [[0, tint(cloth, 0.35)], [0.5, cloth], [1, shade(cloth, 0.08)]]), shade(cloth, 0.05));
}

const hillRice: Draw = (ctx) => {
  ground(ctx, 84, 30);
  const cloth = mix(A['lokta'], A['jute'], 0.45);
  sack(ctx, 48, 34, 82, 62, cloth);
  // Rolled cuff.
  shape(ctx, (c) => c.ellipse(48, 34, 24, 8, 0, 0, Math.PI * 2), tint(cloth, 0.2), cloth);
  // Rice mound.
  shape(ctx, (c) => {
    c.moveTo(27, 34);
    c.bezierCurveTo(32, 18, 64, 18, 69, 34);
    c.quadraticCurveTo(48, 40, 27, 34);
    c.closePath();
  }, ball(ctx, 48, 28, 16, P.cream, 0.4, 0.06), A['cream-line'], 2);
  for (const [x, y, r] of [[38, 28, 0.4], [46, 24, -0.3], [54, 27, 0.8], [60, 31, 0.2], [44, 32, 1.2], [52, 33, -0.6], [34, 32, -0.2]] as const) {
    fillOnly(ctx, (c) => c.ellipse(x, y, 2.6, 1.4, r, 0, Math.PI * 2), rgba(A['cream-line'], 0.9));
  }
  // Stitched rice ear on the sack.
  line(ctx, (c) => {
    c.moveTo(48, 74);
    c.quadraticCurveTo(46, 60, 52, 50);
  }, A['tea-green'], 2.2);
  for (let i = 0; i < 4; i++) {
    oval(ctx, 48 + i * 1.2 - 3.5, 66 - i * 5, 3, 1.7, A['ainselu'], A['ainselu'], -0.6, 1.2);
    oval(ctx, 48 + i * 1.2 + 3.5, 64 - i * 5, 3, 1.7, A['ainselu'], A['ainselu'], 0.6, 1.2);
  }
  // Spilled grains.
  for (const [x, y] of [[20, 82], [26, 85], [72, 84], [77, 81]] as const) fillOnly(ctx, (c) => c.ellipse(x, y, 2.4, 1.3, 0.3, 0, Math.PI * 2), P.cream);
  hi(ctx, 34, 52, 4, 10, 0.2, 0.45);
};

const maidaFlour: Draw = (ctx) => {
  ground(ctx, 84, 28);
  const cloth = mix(P.cream, A['lokta'], 0.5);
  // Gathered neck and frill.
  shape(ctx, (c) => {
    c.moveTo(40, 30);
    c.quadraticCurveTo(34, 18, 38, 12);
    c.quadraticCurveTo(48, 18, 58, 12);
    c.quadraticCurveTo(62, 18, 56, 30);
    c.closePath();
  }, tint(cloth, 0.3), A['cream-line']);
  // Body.
  shape(ctx, (c) => {
    c.moveTo(40, 28);
    c.bezierCurveTo(20, 40, 18, 82, 32, 83);
    c.lineTo(64, 83);
    c.bezierCurveTo(78, 82, 76, 40, 56, 28);
    c.closePath();
  }, lGrad(ctx, 22, 0, 76, 0, [[0, tint(cloth, 0.4)], [0.55, cloth], [1, mix(cloth, A['cream-line'], 0.6)]]), A['cream-line']);
  // Powder-blue stripes (classic flour sack).
  clipTo(ctx, (() => {
    const p = new Path2D();
    p.moveTo(40, 28);
    p.bezierCurveTo(20, 40, 18, 82, 32, 83);
    p.lineTo(64, 83);
    p.bezierCurveTo(78, 82, 76, 40, 56, 28);
    p.closePath();
    return p;
  })(), () => {
    fillOnly(ctx, (c) => c.rect(10, 50, 80, 4), rgba(P.powder, 0.85));
    fillOnly(ctx, (c) => c.rect(10, 70, 80, 4), rgba(P.powder, 0.85));
    // Wheat-ish sprig in rose (no text).
    line(ctx, (c) => {
      c.moveTo(48, 68);
      c.lineTo(48, 57);
    }, A['gurans-deep'], 1.6);
    for (let i = 0; i < 3; i++) {
      oval(ctx, 45.5, 64 - i * 3.5, 2.4, 1.3, rgba(A['gurans'], 0.9), A['gurans'], -0.6, 0.8);
      oval(ctx, 50.5, 64 - i * 3.5, 2.4, 1.3, rgba(A['gurans'], 0.9), A['gurans'], 0.6, 0.8);
    }
  });
  // Jute tie.
  line(ctx, (c) => {
    c.moveTo(38, 29);
    c.quadraticCurveTo(48, 33, 58, 29);
  }, shade(A['jute'], 0.15), 3.4);
  oval(ctx, 43, 32, 4, 2.6, A['jute'], A['jute'], -0.5, 1.6);
  oval(ctx, 53, 32, 4, 2.6, A['jute'], A['jute'], 0.5, 1.6);
  // Flour puff.
  for (const [x, y, r] of [[72, 24, 6], [79, 18, 4], [68, 16, 3.4]] as const) fillOnly(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), rgba(P.cream, 0.85));
  hi(ctx, 32, 48, 3.5, 9, 0.2, 0.5);
};

function teaSprig(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    line(ctx, (c) => {
      c.moveTo(0, 14);
      c.quadraticCurveTo(1, 4, 0, -8);
    }, shade(A['tea-green'], 0.2), 2);
    leaf(ctx, 0, 6, 15, 5.5, -2.5, A['tea-green']);
    leaf(ctx, 0, 2, 15, 5.5, -0.65, A['tea-green']);
    oval(ctx, 0, -10, 2.6, 5, tint(A['tea-green'], 0.35), A['tea-green'], 0, 1.4);
  });
}

const firstFlushTea: Draw = (ctx) => {
  ground(ctx, 84, 28);
  const tin = A['tin-mint'];
  // Tin body.
  shape(ctx, (c) => {
    c.moveTo(26, 36);
    c.lineTo(26, 76);
    c.quadraticCurveTo(26, 83, 48, 83);
    c.quadraticCurveTo(70, 83, 70, 76);
    c.lineTo(70, 36);
    c.closePath();
  }, lGrad(ctx, 26, 0, 70, 0, [[0, tint(tin, 0.35)], [0.4, tin], [1, shade(tin, 0.12)]]), tin);
  // Label band.
  shape(ctx, (c) => {
    c.moveTo(26, 48);
    c.quadraticCurveTo(48, 52, 70, 48);
    c.lineTo(70, 70);
    c.quadraticCurveTo(48, 74, 26, 70);
    c.closePath();
  }, A['lokta'], A['cream-line'], 2);
  teaSprig(ctx, 48, 60, 0.75, 0.15);
  // Lid.
  shape(ctx, (c) => {
    c.moveTo(24, 30);
    c.lineTo(24, 38);
    c.quadraticCurveTo(24, 43, 48, 43);
    c.quadraticCurveTo(72, 43, 72, 38);
    c.lineTo(72, 30);
    c.closePath();
  }, lGrad(ctx, 24, 0, 72, 0, [[0, tint(A['tea-green'], 0.3)], [1, shade(A['tea-green'], 0.1)]]), A['tea-green']);
  shape(ctx, (c) => c.ellipse(48, 30, 24, 7, 0, 0, Math.PI * 2), tint(A['tea-green'], 0.35), A['tea-green']);
  hi(ctx, 32, 58, 2.5, 9, 0, 0.6);
  hi(ctx, 36, 29, 8, 2, 0, 0.6);
  // A real sprig peeking over the tin.
  teaSprig(ctx, 70, 26, 1, 0.5);
};

const combHoney: Draw = (ctx) => {
  ground(ctx, 84, 28);
  const glass = rgba(P.cream, 0.55);
  // Honey inside.
  const jar = new Path2D();
  jar.moveTo(28, 34);
  jar.bezierCurveTo(22, 46, 22, 80, 34, 82);
  jar.lineTo(62, 82);
  jar.bezierCurveTo(74, 80, 74, 46, 68, 34);
  jar.closePath();
  ctx.fillStyle = glass;
  ctx.fill(jar);
  clipTo(ctx, jar, () => {
    ctx.fillStyle = lGrad(ctx, 0, 40, 0, 82, [[0, P.glow], [1, mix(A['ainselu'], P.ember, 0.25)]]);
    ctx.fillRect(10, 42, 80, 50);
    // Comb hexagons.
    ctx.strokeStyle = rgba(P.butter, 0.85);
    ctx.lineWidth = 1.6;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const hx = 30 + col * 10 + (row % 2) * 5;
        const hy = 50 + row * 8.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          const px = hx + Math.cos(a) * 5;
          const py = hy + Math.sin(a) * 5;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    fillOnly(ctx, (c) => c.ellipse(48, 42, 30, 3, 0, 0, Math.PI * 2), rgba(tint(P.glow, 0.4), 0.9));
  });
  ctx.strokeStyle = shade(A['cream-line'], 0.1);
  ctx.lineWidth = OL;
  ctx.stroke(jar);
  hi(ctx, 32, 58, 3, 13, 0.08, 0.7);
  // Cloth lid tied with jute.
  shape(ctx, (c) => {
    c.moveTo(24, 34);
    c.quadraticCurveTo(22, 22, 32, 20);
    c.quadraticCurveTo(48, 14, 64, 20);
    c.quadraticCurveTo(74, 22, 72, 34);
    c.quadraticCurveTo(76, 38, 70, 40);
    c.quadraticCurveTo(48, 34, 26, 40);
    c.quadraticCurveTo(20, 38, 24, 34);
    c.closePath();
  }, ball(ctx, 48, 26, 24, P.rose, 0.3, 0.06), P.rose);
  // Gingham dots on the cloth.
  for (const [x, y] of [[34, 26], [44, 23], [54, 23], [63, 27], [39, 32], [50, 30], [59, 33]] as const) dot(ctx, x, y, 1.6, P.cream, 0.7);
  line(ctx, (c) => {
    c.moveTo(25, 36);
    c.quadraticCurveTo(48, 31, 71, 36);
  }, A['jute'], 3);
  // Honey drip.
  shape(ctx, (c) => {
    c.moveTo(62, 38);
    c.quadraticCurveTo(66, 44, 64, 50);
    c.quadraticCurveTo(62, 54, 60, 50);
    c.quadraticCurveTo(58, 44, 62, 38);
    c.closePath();
  }, P.glow, mix(A['ainselu'], P.ember, 0.3), 1.6);
};

const masalaPouch: Draw = (ctx) => {
  ground(ctx, 84, 30);
  const cloth = mix(P.peach, P.rose, 0.4);
  // Frill above the tie.
  shape(ctx, (c) => {
    c.moveTo(38, 34);
    c.quadraticCurveTo(28, 22, 34, 16);
    c.quadraticCurveTo(42, 22, 48, 14);
    c.quadraticCurveTo(54, 22, 62, 16);
    c.quadraticCurveTo(68, 22, 58, 34);
    c.closePath();
  }, tint(cloth, 0.25), cloth);
  // Pouch.
  shape(ctx, (c) => {
    c.moveTo(38, 32);
    c.bezierCurveTo(18, 44, 20, 82, 48, 82);
    c.bezierCurveTo(76, 82, 78, 44, 58, 32);
    c.closePath();
  }, ball(ctx, 46, 58, 26, cloth, 0.3, 0.1), cloth);
  // Little stitched star of cardamom/timur dots.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    dot(ctx, 48 + Math.cos(a) * 7, 62 + Math.sin(a) * 7, 2, P.butter, 0.9);
  }
  dot(ctx, 48, 62, 2.3, P.cream, 0.9);
  hi(ctx, 34, 52, 4, 9, 0.3, 0.45);
  // Jute tie and bow.
  line(ctx, (c) => {
    c.moveTo(36, 33);
    c.quadraticCurveTo(48, 38, 60, 33);
  }, shade(A['jute'], 0.1), 3.4);
  oval(ctx, 54, 36, 5, 3, A['jute'], A['jute'], 0.6, 1.6);
  line(ctx, (c) => {
    c.moveTo(56, 36);
    c.quadraticCurveTo(60, 44, 57, 50);
    c.moveTo(56, 36);
    c.quadraticCurveTo(64, 42, 65, 47);
  }, shade(A['jute'], 0.1), 2.2);
  // A big cardamom pod beside the pouch.
  withState(ctx, () => {
    ctx.translate(76, 76);
    ctx.rotate(-0.5);
    const pod = mix(P.bark, A['katus'], 0.4);
    oval(ctx, 0, 0, 10, 6, ball(ctx, 0, 0, 9, pod, 0.3, 0.1), pod, 0, 2);
    line(ctx, (c) => {
      for (const k of [-3, 0, 3]) {
        c.moveTo(-8, k * 0.7);
        c.quadraticCurveTo(0, k * 1.4, 8, k * 0.7);
      }
    }, rgba(shade(pod, 0.3), 0.6), 1);
  });
  // Two timur peppercorns.
  oval(ctx, 18, 80, 3.2, 3.2, ball(ctx, 18, 80, 3, A['gurans-deep']), A['gurans-deep'], 0, 1.5);
  oval(ctx, 24, 83, 2.8, 2.8, ball(ctx, 24, 83, 3, A['gurans-deep']), A['gurans-deep'], 0, 1.5);
};

// ---------------------------------------------------------------------------
// Dishes: drinks in a chiya glass, soups in a copper-rimmed bowl, etc.
// ---------------------------------------------------------------------------

/** Small chiya glass with a liquid; returns the liquid top y. */
function chiyaGlass(ctx: Ctx, liquid: string, fill = 0.78, foam?: string): { top: number } {
  ground(ctx, 85, 24);
  const x0 = 30;
  const x1 = 66;
  const yTop = 26;
  const yBot = 82;
  const glass = new Path2D();
  glass.moveTo(x0, yTop);
  glass.lineTo(x0 + 3, yBot - 6);
  glass.quadraticCurveTo(x0 + 4, yBot, x0 + 10, yBot);
  glass.lineTo(x1 - 10, yBot);
  glass.quadraticCurveTo(x1 - 4, yBot, x1 - 3, yBot - 6);
  glass.lineTo(x1, yTop);
  glass.closePath();
  ctx.fillStyle = rgba(P.cream, 0.7);
  ctx.fill(glass);
  const top = yBot - (yBot - yTop) * fill;
  clipTo(ctx, glass, () => {
    ctx.fillStyle = lGrad(ctx, x0, 0, x1, 0, [[0, tint(liquid, 0.25)], [0.5, liquid], [1, shade(liquid, 0.08)]]);
    ctx.fillRect(x0 - 2, top, x1 - x0 + 4, yBot - top + 2);
    fillOnly(ctx, (c) => c.ellipse(48, top, 20, 3.4, 0, 0, Math.PI * 2), foam ?? tint(liquid, 0.4));
    // Glass facets.
    for (const fx of [37, 48, 59]) fillOnly(ctx, (c) => c.rect(fx - 0.8, yTop, 1.6, yBot - yTop), rgba(P.cream, 0.28));
    hi(ctx, 35, (top + yBot) / 2, 2.4, (yBot - top) * 0.35, 0.04, 0.55);
  });
  ctx.strokeStyle = A['cream-line'];
  ctx.lineWidth = OL;
  ctx.lineJoin = 'round';
  ctx.stroke(glass);
  // Rim.
  line(ctx, (c) => c.ellipse(48, yTop, 18, 2.6, 0, Math.PI, Math.PI * 2), rgba(A['cream-line'], 0.8), 1.6);
  return { top };
}

const sisnuTea: Draw = (ctx) => {
  const { top } = chiyaGlass(ctx, mix(A['sisnu'], P.butter, 0.35), 0.74);
  scallopLeaf(ctx, 40, top - 1, 16, 6, -0.25, A['sisnu']);
  steam(ctx, 48, 20, 14, 0.7);
};

const honeyChiya: Draw = (ctx) => {
  const chiya = mix(mix(A['katus'], P.glow, 0.45), P.cream, 0.25);
  chiyaGlass(ctx, chiya, 0.76, tint(chiya, 0.55));
  // Honey dipper leaning in.
  withState(ctx, () => {
    ctx.translate(66, 22);
    ctx.rotate(0.45);
    shape(ctx, (c) => c.roundRect(-2.5, -14, 5, 40, 2.5), A['shop-wood'], A['shop-wood'], 2);
    for (let i = 0; i < 3; i++) oval(ctx, 0, -18 - i * 4.5, 6 - i * 0.4, 2.6, P.glow, mix(P.glow, A['ainselu'], 0.5), 0, 1.6);
  });
  shape(ctx, (c) => {
    c.moveTo(60, 12);
    c.quadraticCurveTo(62, 18, 60, 22);
    c.quadraticCurveTo(58, 18, 60, 12);
    c.closePath();
  }, P.glow, A['ainselu'], 1.2);
  steam(ctx, 44, 20, 13, 0.7);
};

const ainseluSharbat: Draw = (ctx) => {
  const c0 = mix(A['ainselu'], P.peach, 0.35);
  const { top } = chiyaGlass(ctx, c0, 0.72, tint(c0, 0.35));
  raspberry(ctx, 42, top + 2, 6.5, A['ainselu']);
  raspberry(ctx, 54, top + 3, 5.5, tint(A['ainselu'], 0.1));
  for (const [x, y] of [[40, 66], [52, 72], [56, 60]] as const) dot(ctx, x, y, 1.7, P.cream, 0.6);
  leaf(ctx, 58, top - 2, 14, 5, -0.9, P.sage);
};

const masalaChiya: Draw = (ctx) => {
  const chiya = mix(A['katus'], P.peach, 0.3);
  chiyaGlass(ctx, chiya, 0.78, tint(chiya, 0.5));
  steam(ctx, 48, 20, 15, 0.75);
  // Cardamom pods and timur beside the glass.
  for (const [x, y, r] of [[76, 80, -0.4], [20, 82, 0.5]] as const) {
    withState(ctx, () => {
      ctx.translate(x, y);
      ctx.rotate(r);
      const pod = mix(P.bark, A['katus'], 0.4);
      oval(ctx, 0, 0, 7.5, 4.6, ball(ctx, 0, 0, 7, pod, 0.3, 0.1), pod, 0, 1.8);
      line(ctx, (c) => {
        c.moveTo(-6, 0);
        c.quadraticCurveTo(0, 1.5, 6, 0);
      }, rgba(shade(pod, 0.3), 0.6), 1);
    });
  }
  oval(ctx, 82, 72, 2.6, 2.6, A['gurans-deep'], A['gurans-deep'], 0, 1.2);
};

/** Copper-rimmed bowl; draws the contents via `fill` clipped to the mouth. */
function bowl(ctx: Ctx, soup: string, toppings?: (ctx: Ctx) => void, mound = 0, body: string = A['lokta']): void {
  ground(ctx, 84, 34);
  const rimY = 50;
  const rx = 36;
  // Foot.
  shape(ctx, (c) => c.ellipse(48, 80, 14, 4, 0, 0, Math.PI * 2), shade(body, 0.06), body, 2);
  // Body.
  shape(ctx, (c) => {
    c.moveTo(48 - rx, rimY);
    c.bezierCurveTo(48 - rx, rimY + 26, 48 - rx * 0.4, rimY + 30, 48, rimY + 30);
    c.bezierCurveTo(48 + rx * 0.4, rimY + 30, 48 + rx, rimY + 26, 48 + rx, rimY);
    c.closePath();
  }, lGrad(ctx, 12, 0, 84, 0, [[0, tint(body, 0.4)], [0.45, body], [1, shade(body, 0.12)]]), body);
  // Copper band on the body (just under the rim).
  shape(ctx, (c) => {
    c.moveTo(48 - rx, rimY);
    c.quadraticCurveTo(48, rimY + 14, 48 + rx, rimY);
    c.lineTo(48 + rx - 1, rimY + 6);
    c.quadraticCurveTo(48, rimY + 20, 48 - rx + 1, rimY + 6);
    c.closePath();
  }, lGrad(ctx, 12, 0, 84, 0, [[0, tint(A['copper'], 0.4)], [0.5, A['copper']], [1, shade(A['copper'], 0.1)]]), A['copper'], 2);
  // Contents (soup surface, mounded).
  shape(ctx, (c) => {
    c.moveTo(48 - rx + 3, rimY);
    c.bezierCurveTo(48 - rx + 6, rimY - 9 - mound, 48 + rx - 6, rimY - 9 - mound, 48 + rx - 3, rimY);
    c.quadraticCurveTo(48, rimY + 6, 48 - rx + 3, rimY);
    c.closePath();
  }, rGrad(ctx, 42, rimY - 6 - mound * 0.6, 0, rx, [[0, tint(soup, 0.35)], [0.6, soup], [1, shade(soup, 0.08)]]), soup, 2);
  toppings?.(ctx);
  // Copper rim ellipse front lip.
  line(ctx, (c) => {
    c.moveTo(48 - rx, rimY);
    c.quadraticCurveTo(48, rimY + 12, 48 + rx, rimY);
  }, shade(A['copper'], 0.1), 2.2);
  line(ctx, (c) => {
    c.moveTo(48 - rx + 4, rimY + 2.5);
    c.quadraticCurveTo(48 - 14, rimY + 8, 48 - 6, rimY + 8.6);
  }, rgba(P.butter, 0.85), 1.8);
  hi(ctx, 22, rimY + 16, 3, 6, 0.6, 0.5);
}

const chyauSoup: Draw = (ctx) => {
  bowl(ctx, mix(A['sisnu'], A['chyau'], 0.3), (c) => {
    for (const [x, y, s] of [[37, 44, 1.35], [59, 45, 1.2]] as const) {
      // Mushroom slice (cap + stem silhouette).
      withState(c, () => {
        c.translate(x, y);
        c.scale(s, s);
        shape(c, (cc) => {
          cc.moveTo(-8, 0);
          cc.bezierCurveTo(-8, -9, 8, -9, 8, 0);
          cc.lineTo(3, 0);
          cc.lineTo(3, 6);
          cc.quadraticCurveTo(0, 8, -3, 6);
          cc.lineTo(-3, 0);
          cc.closePath();
        }, mix(A['chyau'], P.cream, 0.3), A['chyau'], 1.8);
      });
    }
    scallopLeaf(c, 44, 46, 16, 6, -0.5, A['sisnu']);
    dot(c, 30, 47, 1.6, P.cream, 0.7);
    dot(c, 66, 44, 1.4, P.cream, 0.7);
  }, 2);
  steam(ctx, 48, 30, 14, 0.7);
};

const fishJaulo: Draw = (ctx) => {
  bowl(ctx, mix(P.cream, A['lokta'], 0.6), (c) => {
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      const r = 6 + (i % 5) * 4.5;
      fillOnly(c, (cc) => cc.ellipse(48 + Math.cos(a) * r, 44 + Math.sin(a) * r * 0.25, 2.4, 1.3, a, 0, Math.PI * 2), rgba(A['cream-line'], 0.75));
    }
    // Flakes of pink fish.
    for (const [x, y, r] of [[42, 41, 0.3], [56, 42, -0.4], [49, 36, 0.1]] as const) oval(c, x, y, 7, 4.4, mix(A['katle'], P.peach, 0.45), mix(A['katle'], P.peach, 0.5), r, 1.6);
    // Green herb bits.
    for (const [x, y] of [[34, 44], [62, 46], [50, 46]] as const) oval(c, x, y, 2.6, 1.6, A['sisnu'], A['sisnu'], 0.5, 1);
  }, 4, A['lokta']);
  steam(ctx, 48, 28, 14, 0.65);
};

const campfireJhol: Draw = (ctx) => {
  bowl(ctx, mix(P.peach, P.ember, 0.18), (c) => {
    oval(c, 39, 42, 10.5, 6, mix(A['asala'], P.cream, 0.45), A['asala'], 0.1, 1.8);
    hi(c, 36, 40, 4, 1.4, 0.1, 0.8);
    withState(c, () => {
      c.translate(59, 44);
      shape(c, (cc) => {
        cc.moveTo(-8, 0);
        cc.bezierCurveTo(-8, -10, 8, -10, 8, 0);
        cc.closePath();
      }, A['chyau'], A['chyau'], 1.6);
    });
    scallopLeaf(c, 46, 47, 12, 5, 0.2, A['sisnu']);
    for (const [x, y] of [[32, 46], [64, 48], [52, 40]] as const) dot(c, x, y, 2, tint(P.glow, 0.3), 0.85);
  }, 1);
  steam(ctx, 40, 30, 16, 0.7);
  steam(ctx, 58, 28, 12, 0.5);
};

const ainseluKhir: Draw = (ctx) => {
  bowl(ctx, mix(P.cream, P.butter, 0.25), (c) => {
    leaf(c, 56, 36, 15, 5, -0.4, P.sage);
    raspberry(c, 39, 38, 8, A['ainselu']);
    raspberry(c, 56, 39, 7.5, A['ainselu']);
    raspberry(c, 47, 32, 8, tint(A['ainselu'], 0.1));
    for (const [x, y] of [[32, 46], [64, 45]] as const) fillOnly(c, (cc) => cc.ellipse(x, y, 2.4, 1.3, 0.4, 0, Math.PI * 2), rgba(A['cream-line'], 0.8));
  }, 6);
};

const katusPorridge: Draw = (ctx) => {
  bowl(ctx, mix(A['oat'], P.cream, 0.4), (c) => {
    // Honey drizzle.
    line(c, (cc) => {
      cc.moveTo(30, 44);
      cc.bezierCurveTo(40, 36, 46, 48, 54, 40);
      cc.quadraticCurveTo(60, 36, 66, 44);
    }, rgba(P.glow, 0.95), 4);
    chestnut(c, 40, 41, 7.5);
    chestnut(c, 57, 42, 7);
    chestnut(c, 49, 34, 6.5);
  }, 4);
  steam(ctx, 48, 28, 12, 0.55);
};

function cookedFish(ctx: Ctx, x: number, y: number, len: number, hgt: number, rot: number): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    const skin = mix(A['mahseer'], P.peach, 0.45);
    const tail = smoothPath([[len * 0.42, -2], [len * 0.62, -hgt * 0.55], [len * 0.56, 0], [len * 0.62, hgt * 0.55], [len * 0.42, 2]], 0.4);
    fillPath(ctx, tail, mix(skin, P.bark, 0.2), skin);
    const body = smoothPath([[-len * 0.5, 0], [-len * 0.3, -hgt * 0.48], [len * 0.15, -hgt * 0.45], [len * 0.45, -hgt * 0.12], [len * 0.45, hgt * 0.12], [len * 0.15, hgt * 0.45], [-len * 0.3, hgt * 0.44]], 0.5);
    fillPath(ctx, body, lGrad(ctx, 0, -hgt / 2, 0, hgt / 2, [[0, mix(skin, P.bark, 0.25)], [0.5, skin], [1, tint(skin, 0.45)]]), skin);
    clipTo(ctx, body, () => {
      // Grill marks.
      for (let i = -2; i <= 2; i++) {
        line(ctx, (c) => {
          c.moveTo(i * len * 0.16 - 4, -hgt * 0.6);
          c.lineTo(i * len * 0.16 + 6, hgt * 0.6);
        }, rgba(mix(P.bark, P.ink, 0.25), 0.55), 2.6);
      }
      hi(ctx, -len * 0.1, -hgt * 0.25, len * 0.2, hgt * 0.08, 0, 0.55);
    });
    eyeHappy(ctx, -len * 0.33, -hgt * 0.1, 5, 1.8);
  });
}

function bigLeaf(ctx: Ctx, cx: number, cy: number, len: number, wid: number, rot: number): void {
  withState(ctx, () => {
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    shape(ctx, (c) => {
      c.moveTo(-len / 2, 0);
      c.bezierCurveTo(-len * 0.3, -wid, len * 0.3, -wid, len / 2, 0);
      c.bezierCurveTo(len * 0.3, wid, -len * 0.3, wid, -len / 2, 0);
      c.closePath();
    }, lGrad(ctx, 0, -wid, 0, wid, [[0, tint(P.sage, 0.25)], [1, mix(P.sage, P.moss, 0.4)]]), P.sage);
    line(ctx, (c) => {
      c.moveTo(-len * 0.46, 0);
      c.lineTo(len * 0.46, 0);
      for (let i = -3; i <= 3; i++) {
        c.moveTo(i * len * 0.1, 0);
        c.lineTo(i * len * 0.1 + len * 0.08, -wid * 0.6);
        c.moveTo(i * len * 0.1, 0);
        c.lineTo(i * len * 0.1 + len * 0.08, wid * 0.6);
      }
    }, rgba(shade(P.sage, 0.25), 0.4), 1.3);
  });
}

const tawaFish: Draw = (ctx) => {
  ground(ctx, 82, 38);
  bigLeaf(ctx, 48, 62, 86, 22, -0.08);
  cookedFish(ctx, 47, 54, 64, 26, -0.08);
  steam(ctx, 40, 36, 14, 0.6);
};

const timurFish: Draw = (ctx) => {
  ground(ctx, 82, 38);
  // Cream plate with copper-line rim.
  shape(ctx, (c) => c.ellipse(48, 62, 42, 15, 0, 0, Math.PI * 2), rGrad(ctx, 40, 58, 0, 44, [[0, P.cream], [1, A['lokta']]]), A['cream-line']);
  line(ctx, (c) => c.ellipse(48, 62, 34, 11, 0, 0, Math.PI * 2), rgba(A['copper-line'], 0.45), 1.6);
  cookedFish(ctx, 48, 56, 60, 24, -0.05);
  // Nettle butter pat.
  shape(ctx, (c) => c.roundRect(44, 40, 14, 10, 4), mix(P.butter, P.cream, 0.3), P.butter, 2);
  for (const [x, y] of [[48, 44], [53, 46], [50, 47]] as const) dot(ctx, x, y, 1.2, A['sisnu']);
  scallopLeaf(ctx, 24, 66, 14, 5, 0.3, A['sisnu']);
  for (const [x, y] of [[70, 68], [74, 64], [66, 70]] as const) oval(ctx, x, y, 2.4, 2.4, ball(ctx, x, y, 2.4, A['gurans-deep']), A['gurans-deep'], 0, 1.2);
};

function malpuaStack(ctx: Ctx, n: number): void {
  ground(ctx, 84, 34);
  // Plate.
  shape(ctx, (c) => c.ellipse(48, 74, 38, 10, 0, 0, Math.PI * 2), rGrad(ctx, 44, 72, 0, 40, [[0, P.cream], [1, A['lokta']]]), A['cream-line']);
  const gold = mix(A['ainselu'], P.butter, 0.3);
  for (let i = 0; i < n; i++) {
    const y = 66 - i * 9;
    shape(ctx, (c) => {
      c.ellipse(48, y, 30, 8, 0, 0, Math.PI);
      c.lineTo(18, y - 4);
      c.ellipse(48, y - 4, 30, 8, 0, Math.PI, 0, false);
      c.closePath();
    }, lGrad(ctx, 18, 0, 78, 0, [[0, tint(gold, 0.2)], [0.5, mix(gold, P.peach, 0.3)], [1, shade(gold, 0.1)]]), gold, 2);
    // Crisp lacy edge.
    line(ctx, (c) => c.ellipse(48, y - 0.5, 29, 7, 0, 0.1, Math.PI - 0.1), rgba(mix(P.peach, P.bark, 0.25), 0.55), 1.4);
  }
  const ty = 66 - (n - 1) * 9 - 4;
  shape(ctx, (c) => c.ellipse(48, ty, 30, 8, 0, 0, Math.PI * 2), rGrad(ctx, 44, ty - 2, 0, 30, [[0, tint(gold, 0.45)], [1, gold]]), gold, 2);
}

const honeyMalpua: Draw = (ctx) => {
  malpuaStack(ctx, 3);
  // Honey pool and drips.
  shape(ctx, (c) => {
    c.moveTo(30, 44);
    c.bezierCurveTo(32, 36, 64, 36, 66, 44);
    c.quadraticCurveTo(66, 48, 62, 47);
    c.quadraticCurveTo(62, 56, 59, 55);
    c.quadraticCurveTo(57, 50, 54, 49);
    c.quadraticCurveTo(44, 50, 38, 48);
    c.quadraticCurveTo(36, 58, 33, 56);
    c.quadraticCurveTo(31, 52, 30, 44);
    c.closePath();
  }, rgba(P.glow, 0.92), mix(P.glow, A['ainselu'], 0.6), 1.8);
  hi(ctx, 42, 41, 6, 1.6, 0, 0.8);
};

const ainseluMalpua: Draw = (ctx) => {
  malpuaStack(ctx, 3);
  raspberry(ctx, 40, 40, 6.5, A['ainselu']);
  raspberry(ctx, 56, 39, 6.5, A['ainselu']);
  raspberry(ctx, 48, 34, 6.5, tint(A['ainselu'], 0.1));
  leaf(ctx, 58, 34, 13, 4.5, -0.5, P.sage);
  dot(ctx, 30, 44, 2, P.glow);
};

const chyauSekuwa: Draw = (ctx) => {
  ground(ctx, 82, 34);
  withState(ctx, () => {
    ctx.translate(48, 50);
    ctx.rotate(-0.42);
    // Bamboo stick.
    shape(ctx, (c) => c.roundRect(-46, -3, 92, 6, 3), lGrad(ctx, 0, -3, 0, 3, [[0, tint(A['malingo'], 0.3)], [1, A['malingo']]]), A['malingo'], 2);
    line(ctx, (c) => {
      c.moveTo(-34, -3);
      c.lineTo(-34, 3);
    }, shade(A['malingo'], 0.3), 1.4);
    // 3 cubes (chyau, char-marked) with green between.
    const xs = [-20, 0, 20];
    xs.forEach((x, i) => {
      const col = i === 1 ? mix(A['chyau'], P.peach, 0.3) : A['chyau'];
      shape(ctx, (c) => c.roundRect(x - 8.5, -9, 17, 17, 4.5), lGrad(ctx, x - 8, -9, x + 8, 8, [[0, tint(col, 0.35)], [0.6, col], [1, mix(col, P.bark, 0.25)]]), col, 2.2);
      line(ctx, (c) => {
        c.moveTo(x - 5, -6);
        c.lineTo(x + 2, 5);
        c.moveTo(x + 1, -7);
        c.lineTo(x + 6, 2);
      }, rgba(mix(P.bark, P.ink, 0.3), 0.55), 2);
      hi(ctx, x - 3.5, -5, 2.6, 1.4, -0.6, 0.7);
    });
    for (const x of [-10, 10]) oval(ctx, x, -1, 2.6, 6, A['sisnu'], A['sisnu'], 0, 1.4);
  });
  // Masala sprinkle.
  for (const [x, y] of [[30, 30], [62, 22], [70, 36], [24, 46]] as const) dot(ctx, x, y, 1.4, P.ember, 0.6);
  steam(ctx, 50, 26, 12, 0.55);
};

const katusTingmo: Draw = (ctx) => {
  ground(ctx, 84, 32);
  // Leaf liner.
  bigLeaf(ctx, 48, 74, 80, 12, 0);
  const cream = mix(P.cream, A['lokta'], 0.3);
  shape(ctx, (c) => {
    c.moveTo(18, 70);
    c.bezierCurveTo(12, 40, 36, 22, 48, 22);
    c.bezierCurveTo(60, 22, 84, 40, 78, 70);
    c.quadraticCurveTo(48, 78, 18, 70);
    c.closePath();
  }, rGrad(ctx, 40, 38, 0, 40, [[0, tint(cream, 0.6)], [0.6, cream], [1, A['cream-line']]], 36, 32), A['cream-line']);
  // Swirl.
  line(ctx, (c) => {
    let first = true;
    for (let t = 0; t <= 1.001; t += 0.04) {
      const a = t * Math.PI * 4.2 + 0.3;
      const r = 4 + t * 22;
      const x = 48 + Math.cos(a) * r;
      const y = 48 + Math.sin(a) * r * 0.62;
      if (first) c.moveTo(x, y);
      else c.lineTo(x, y);
      first = false;
    }
  }, rgba(shade(A['cream-line'], 0.15), 0.8), 2);
  hi(ctx, 36, 36, 7, 3.4, -0.5, 0.75);
  // Katus chips.
  for (const [x, y, r] of [[56, 32, 0.4], [40, 44, -0.6], [62, 52, 1]] as const) oval(ctx, x, y, 3, 2, mix(A['katus'], P.bark, 0.2), A['katus'], r, 1.2);
  dot(ctx, 30, 58, 2, P.glow, 0.8);
  steam(ctx, 48, 18, 12, 0.6);
};

function momo(ctx: Ctx, x: number, y: number, r: number): void {
  const cream = mix(P.cream, A['lokta'], 0.3);
  // Plump body with a softly gathered top.
  shape(ctx, (c) => {
    c.moveTo(x - r, y + r * 0.42);
    c.bezierCurveTo(x - r * 1.12, y - r * 0.3, x - r * 0.5, y - r * 0.78, x, y - r * 0.72);
    c.bezierCurveTo(x + r * 0.5, y - r * 0.78, x + r * 1.12, y - r * 0.3, x + r, y + r * 0.42);
    c.quadraticCurveTo(x, y + r * 0.72, x - r, y + r * 0.42);
    c.closePath();
  }, rGrad(ctx, x, y + r * 0.12, 0, r * 1.1, [[0, mix(A['fish-glow'], P.powder, 0.35)], [0.35, A['fish-glow']], [0.72, cream], [1, mix(cream, A['cream-line'], 0.35)]]), A['cream-line'], 2);
  glowDisc(ctx, x, y + r * 0.12, r * 0.5, A['scale-glow'], 0.9);
  // Pleats: little crescents swirling into the top knot.
  line(ctx, (c) => {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.08 + i * 0.21);
      const sx = x + Math.cos(a) * r * 0.55;
      const sy = y - r * 0.5 + Math.sin(a) * r * 0.22 + r * 0.12;
      c.moveTo(sx, sy);
      c.quadraticCurveTo((sx + x) / 2, sy - r * 0.18, x, y - r * 0.68);
    }
  }, rgba(shade(A['cream-line'], 0.1), 0.8), 1.3);
  oval(ctx, x, y - r * 0.72, r * 0.2, r * 0.13, tint(cream, 0.3), A['cream-line'], 0, 1.3);
  hi(ctx, x - r * 0.5, y - r * 0.15, r * 0.16, r * 0.1, -0.8, 0.85);
}

const moonlightMomos: Draw = (ctx) => {
  glowDisc(ctx, 48, 52, 48, A['fish-glow'], 0.75, 1.1);
  ground(ctx, 86, 36);
  const st = A['steamer'];
  // Steamer tier back rim.
  shape(ctx, (c) => c.ellipse(48, 62, 40, 14, 0, 0, Math.PI * 2), shade(st, 0.1), st);
  // Inner floor (lined with a leaf-green mat).
  fillOnly(ctx, (c) => c.ellipse(48, 63, 36, 11, 0, 0, Math.PI * 2), mix(A['tea-green'], A['lokta'], 0.45));
  momo(ctx, 33, 52, 13);
  momo(ctx, 63, 51, 13);
  momo(ctx, 39, 64, 14);
  momo(ctx, 58, 65, 14);
  // Front wall of the tier.
  shape(ctx, (c) => {
    c.moveTo(8, 64);
    c.quadraticCurveTo(48, 86, 88, 64);
    c.lineTo(88, 71);
    c.quadraticCurveTo(48, 94, 8, 71);
    c.closePath();
  }, lGrad(ctx, 8, 0, 88, 0, [[0, tint(st, 0.4)], [0.5, st], [1, shade(st, 0.12)]]), st);
  hi(ctx, 20, 70, 5, 1.6, 0.35, 0.7);
  twinkle(ctx, 82, 26, 5);
  twinkle(ctx, 14, 34, 3.5);
  steam(ctx, 48, 34, 14, 0.65);
};

const mysteryMush: Draw = (ctx) => {
  const mush = mix(P.sage, P.lavender, 0.45);
  bowl(ctx, mush, (c) => {
    // Lumps.
    for (const [x, y, r] of [[34, 40, 7], [58, 38, 8], [47, 34, 6]] as const) oval(c, x, y, r, r * 0.75, ball(c, x, y, r, tint(mush, 0.1), 0.3), mush, 0, 1.8);
    // A curious fish tail and bubble.
    fillPath(c, smoothPath([[66, 40], [72, 28], [74, 34], [78, 30], [74, 42]], 0.4), A['garra'], A['garra'], 1.8);
    oval(c, 26, 36, 3.4, 3.4, rgba(P.cream, 0.6), mush, 0, 1.4);
    // Wobbly face.
    eye(c, 41, 43, 2.6, 3.2);
    eye(c, 53, 42, 3.2, 3.8);
    line(c, (cc) => {
      cc.moveTo(42, 49);
      cc.quadraticCurveTo(44.5, 47, 47, 49);
      cc.quadraticCurveTo(49.5, 51, 52, 49);
    }, P.ink, 1.6);
    blush(c, 36, 47, 3, 1.8, 0.6);
    blush(c, 58, 47, 3, 1.8, 0.6);
  }, 4, mix(A['lokta'], P.lavender, 0.15));
  // Sweat drop of confusion.
  shape(ctx, (c) => {
    c.moveTo(70, 16);
    c.quadraticCurveTo(76, 24, 73, 27);
    c.quadraticCurveTo(68, 28, 67, 24);
    c.quadraticCurveTo(67, 21, 70, 16);
    c.closePath();
  }, tint(P.powder, 0.4), P.powder, 1.6);
  line(ctx, (c) => {
    c.moveTo(28, 26);
    c.bezierCurveTo(24, 20, 34, 18, 30, 12);
  }, rgba(P.cream, 0.7), 2.6);
};

export const FOOD_ICONS: Record<string, Draw> = {
  // Fish
  pebble_minnow: pebbleGarra,
  bubble_carp: bubbleBarb,
  blushing_trout: blushingAsala,
  dusk_perch: twilightDanio,
  rain_loach: monsoonLoach,
  night_glowfin: junkiriGlowfin,
  petal_koi: petalKatle,
  golden_whisker: goldenMahseer,
  // Forage
  berries: ainseluBerries,
  mushrooms: puffcapChyau,
  herbs: sisnuNettles,
  nuts: katusNuts,
  moon_blossom: moonGurans,
  // Pantry
  rice: hillRice,
  flour: maidaFlour,
  tea: firstFlushTea,
  honey: combHoney,
  spice: masalaPouch,
  // Dishes
  herb_tea: sisnuTea,
  honey_tea: honeyChiya,
  berry_cordial: ainseluSharbat,
  spiced_tea: masalaChiya,
  mushroom_soup: chyauSoup,
  fish_congee: fishJaulo,
  campfire_stew: campfireJhol,
  berry_pudding: ainseluKhir,
  nutty_porridge: katusPorridge,
  grilled_fish: tawaFish,
  herb_butter_fish: timurFish,
  pancakes: honeyMalpua,
  berry_pancakes: ainseluMalpua,
  mushroom_skewers: chyauSekuwa,
  cloud_buns: katusTingmo,
  moon_dumplings: moonlightMomos,
  mystery_mush: mysteryMush,
};
