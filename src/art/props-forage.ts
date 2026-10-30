/**
 * Forage spots (WORLD 7.4) and the Moon Scale (WORLD 7.8). Each spot is a
 * base plant + a separate "items" layer so the picked state simply hides the
 * items. Keys: prop_katus_trunk, prop_katus_crown, prop_katus_burrs,
 * prop_sisnu_base, prop_sisnu_tops, prop_ainselu_bush, prop_ainselu_berries,
 * prop_log, prop_log_caps3, prop_log_caps6, prop_moon_bush, prop_moon_bud,
 * prop_moon_truss, prop_scale, prop_forage_sil_<kind>.
 */
import { type Baker, type Ctx, OUTLINE, artRng, rGrad, roundRectPath, smoothClosed, softShadow, vGrad, withState, lGrad } from './kit';
import { AINSELU_BERRIES, CHYAU_CAPS3, CHYAU_CAPS6, KATUS_BURRS, MOON_TRUSS, SISNU_TOPS, ptex } from './props-geo';
import { filled } from './props-tents';
import { A, P, mix, rgba, shade, tint } from '@/palette';

type Pt = [number, number];

/** Union of circles with one outline (stroke all, then fill all). */
function domes(ctx: Ctx, list: [number, number, number][], fill: string | CanvasGradient, base: string, floorY = 1, details?: () => void): void {
  withState(ctx, () => {
    ctx.beginPath();
    ctx.rect(-400, -400, 800, 400 + floorY);
    ctx.clip();
    ctx.strokeStyle = shade(base, 0.28);
    ctx.lineWidth = OUTLINE * 2;
    for (const [x, y, r] of list) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    const u = new Path2D();
    for (const [x, y, r] of list) {
      u.moveTo(x + r, y);
      u.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill(u);
    if (details)
      withState(ctx, () => {
        ctx.clip(u);
        details();
      });
  });
}

function leafDab(ctx: Ctx, x: number, y: number, len: number, wid: number, ang: number, col: string, a = 1): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(0, -wid, len / 2, 0);
    ctx.quadraticCurveTo(0, wid, -len / 2, 0);
    ctx.fillStyle = rgba(col, a);
    ctx.fill();
  });
}

/** Scalloped (never jagged) leaf from a base point. */
function scallopLeaf(ctx: Ctx, bx: number, by: number, ang: number, len: number, wid: number, col: string, bumps = 5): void {
  const N = 26;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const w = wid * Math.sin(Math.PI * Math.pow(s, 0.72)) * (1 - 0.18 * s);
    const sc = 1 - 0.14 * (0.5 + 0.5 * Math.cos(s * Math.PI * 2 * bumps));
    L.push([s * len, w * sc]);
    R.push([s * len, -w * sc]);
  }
  const pts: Pt[] = [[0, 0], ...L.slice(1, -1), [len, 0], ...R.slice(1, -1).reverse()];
  withState(ctx, () => {
    ctx.translate(bx, by);
    ctx.rotate(ang);
    const p = new Path2D();
    smoothClosed(p, pts, 0.4);
    filled(ctx, p, lGrad(ctx, 0, 0, len, 0, [
      [0, shade(col, 0.08)],
      [1, tint(col, 0.32)],
    ]), col, () => {
      ctx.strokeStyle = rgba(tint(col, 0.55), 0.8);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(len * 0.9, 0);
      for (let k = 1; k <= 3; k++) {
        const x = (len * k) / 4.2;
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 4, wid * 0.3, x + 7, wid * 0.55);
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 4, -wid * 0.3, x + 7, -wid * 0.55);
      }
      ctx.stroke();
    }, 2);
  });
}

// ---------------------------------------------------------------------------
// Katus tree: short trunk, crown of 4 moss domes, soft pom-pom burrs.
// ---------------------------------------------------------------------------

const CROWN_Y = -50;
const KATUS_DOMES: [number, number, number][] = [
  [-32, -88, 30],
  [30, -90, 30],
  [-4, -118, 33],
  [4, -78, 28],
];

function drawKatusTrunk(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 52, 8, 0.2);
  const p = new Path2D();
  p.moveTo(-15, 1);
  p.quadraticCurveTo(-9, -4, -8, -20);
  p.lineTo(-7, -58);
  p.lineTo(7, -58);
  p.lineTo(8, -20);
  p.quadraticCurveTo(9, -4, 16, 1);
  p.quadraticCurveTo(0, 4, -15, 1);
  p.closePath();
  filled(ctx, p, lGrad(ctx, -14, 0, 14, 0, [
    [0, shade(P.bark, 0.08)],
    [0.6, tint(P.bark, 0.2)],
    [1, P.bark],
  ]), P.bark, () => {
    ctx.strokeStyle = rgba(shade(P.bark, 0.3), 0.5);
    ctx.lineWidth = 1.2;
    for (const x of [-3, 3]) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.quadraticCurveTo(x + 1.5, -30, x - 0.5, -56);
      ctx.stroke();
    }
  });
  // Grass tuft at the roots.
  ctx.strokeStyle = P.sage;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const [x, a] of [
    [-14, -0.5],
    [-11, -0.15],
    [13, 0.2],
    [16, 0.55],
  ] as Pt[]) {
    ctx.beginPath();
    ctx.moveTo(x, 1);
    ctx.quadraticCurveTo(x + a * 6, -6, x + a * 10, -9);
    ctx.stroke();
  }
}

function drawKatusCrown(ctx: Ctx): void {
  ctx.translate(0, -CROWN_Y);
  const top = -151;
  domes(
    ctx,
    KATUS_DOMES,
    vGrad(ctx, top, -50, [
      [0, tint(P.moss, 0.3)],
      [1, shade(P.moss, 0.06)],
    ]),
    P.moss,
    -44,
    () => {
      ctx.fillStyle = rgba(P.sage, 0.55);
      for (const [x, y, r] of KATUS_DOMES) {
        ctx.beginPath();
        ctx.ellipse(x + r * 0.25, y - r * 0.35, r * 0.6, r * 0.45, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Under-crown shadow.
      ctx.fillStyle = vGrad(ctx, -76, -48, [
        [0, P.moss, 0],
        [1, shade(P.moss, 0.25), 0.55],
      ]);
      ctx.fillRect(-80, -80, 160, 40);
      const r = artRng(17);
      for (let i = 0; i < 26; i++) {
        const [dx, dy, dr] = KATUS_DOMES[i % 4];
        const a = r() * Math.PI * 2;
        const rr = r() * dr * 0.8;
        leafDab(ctx, dx + Math.cos(a) * rr, dy + Math.sin(a) * rr * 0.8, 9, 3.4, r() * 3, i % 3 ? tint(P.sage, 0.35) : shade(P.moss, 0.15), 0.7);
      }
    },
  );
}

function burr(ctx: Ctx, x: number, y: number, s = 1): void {
  const fuzz = tint(A.katus, 0.5);
  ctx.strokeStyle = fuzz;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.7 * s;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s);
    ctx.lineTo(x + Math.cos(a) * 9.4 * s, y + Math.sin(a) * 9.4 * s);
    ctx.stroke();
  }
  const p = new Path2D();
  p.arc(x, y, 7 * s, 0, Math.PI * 2);
  filled(ctx, p, rGrad(ctx, x - 2 * s, y - 2.5 * s, 0, 8 * s, [
    [0, tint(A.katus, 0.4)],
    [1, A.katus],
  ]), A.katus, () => {
    ctx.fillStyle = rgba(fuzz, 0.7);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 3.6 * s, y + Math.sin(a) * 3.6 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1.8);
  ctx.fillStyle = rgba(P.cream, 0.7);
  ctx.beginPath();
  ctx.arc(x - 2.4 * s, y - 2.8 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Sisnu patch: 7-9 scalloped nettle leaves.
// ---------------------------------------------------------------------------

function drawSisnuBase(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 44, 7, 0.18);
  const col = A.sisnu;
  const leaves: [number, number, number, number, number][] = [
    [-6, 0, -2.75, 26, 9],
    [6, 0, -0.4, 26, 9],
    [-3, 0, -2.2, 24, 9],
    [3, 0, -0.95, 24, 9],
    [0, 0, -1.57, 18, 7.5],
  ];
  for (const [x, y, a, l, w] of leaves) scallopLeaf(ctx, x, y, a, l, w, shade(col, 0.06));
}

function drawSisnuTops(ctx: Ctx): void {
  const col = tint(A.sisnu, 0.12);
  const stem = mix(A.sisnu, P.moss, 0.4);
  for (const [tx, ty] of SISNU_TOPS) {
    const bx = tx * 0.35;
    const by = -10;
    ctx.strokeStyle = stem;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx * 0.4, 0);
    ctx.quadraticCurveTo(bx, by, bx + (tx - bx) * 0.4, by + (ty - by) * 0.35);
    ctx.stroke();
  }
  for (const [tx, ty] of SISNU_TOPS) {
    const bx = tx * 0.35;
    const by = -10;
    const ang = Math.atan2(ty - by, tx - bx);
    const len = Math.hypot(tx - bx, ty - by) + 6;
    scallopLeaf(ctx, bx, by, ang, len, 10.5, col, 5);
    // Tiny leaf pair at the stem.
    scallopLeaf(ctx, bx + Math.cos(ang) * 6, by + Math.sin(ang) * 6, ang - 0.9, 13, 5, col, 3);
    scallopLeaf(ctx, bx + Math.cos(ang) * 6, by + Math.sin(ang) * 6, ang + 0.9, 13, 5, col, 3);
  }
}

// ---------------------------------------------------------------------------
// Ainselu bush: low sage domes with golden raspberry clusters.
// ---------------------------------------------------------------------------

const AINSELU_DOMES: [number, number, number][] = [
  [-30, -22, 25],
  [30, -22, 25],
  [0, -34, 31],
  [-14, -14, 20],
  [16, -14, 20],
];

function drawAinseluBush(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 62, 9, 0.2);
  domes(
    ctx,
    AINSELU_DOMES,
    vGrad(ctx, -66, 0, [
      [0, tint(P.sage, 0.28)],
      [1, mix(P.sage, P.moss, 0.45)],
    ]),
    mix(P.sage, P.moss, 0.4),
    1,
    () => {
      ctx.fillStyle = rgba(P.cream, 0.2);
      for (const [x, y, r] of AINSELU_DOMES.slice(0, 3)) {
        ctx.beginPath();
        ctx.ellipse(x + r * 0.2, y - r * 0.4, r * 0.55, r * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const r = artRng(23);
      for (let i = 0; i < 30; i++) {
        const [dx, dy, dr] = AINSELU_DOMES[i % 3];
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * dr * 0.85;
        leafDab(ctx, dx + Math.cos(a) * rr, dy + Math.sin(a) * rr * 0.8, 10, 3.6, -0.6 + r() * 1.2, i % 2 ? mix(P.sage, P.moss, 0.6) : tint(P.sage, 0.3), 0.75);
      }
    },
  );
  // Two tiny bramble blossoms.
  for (const [x, y] of [
    [-44, -30],
    [22, -52],
  ] as Pt[]) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = tint(P.blush, 0.6);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = P.butter;
    ctx.fill();
  }
}

function berryCluster(ctx: Ctx, x: number, y: number, seed: number): void {
  const r = artRng(seed);
  // Calyx.
  leafDab(ctx, x - 3, y - 7, 8, 2.6, -0.5, P.moss);
  leafDab(ctx, x + 3, y - 7, 8, 2.6, 0.5, P.moss);
  const dots: Pt[] = [
    [-3.2, -2.6],
    [3.2, -2.6],
    [0, -4.2],
    [-4.4, 1.8],
    [4.4, 1.8],
    [0, 0.6],
    [0, 4.8],
  ];
  const n = 5 + Math.floor(r() * 3);
  // Outline pass then fill pass so the cluster reads as one berry.
  ctx.fillStyle = shade(A.ainselu, 0.3);
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x + dots[i][0], y + dots[i][1], 3.9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < n; i++) {
    const [dx, dy] = dots[i];
    ctx.fillStyle = rGrad(ctx, x + dx - 1, y + dy - 1.2, 0, 3.4, [
      [0, tint(A.ainselu, 0.45)],
      [1, mix(A.ainselu, P.peach, 0.25)],
    ]);
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(P.cream, 0.85);
    ctx.beginPath();
    ctx.arc(x + dx - 1, y + dy - 1.1, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Mossy log with chyau caps.
// ---------------------------------------------------------------------------

function drawLog(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 64, 8, 0.2);
  const body = new Path2D();
  roundRectPath(body, -54, -31, 106, 31, 15);
  filled(ctx, body, vGrad(ctx, -31, 0, [
    [0, tint(P.bark, 0.3)],
    [0.6, P.bark],
    [1, shade(P.bark, 0.1)],
  ]), P.bark, () => {
    ctx.strokeStyle = rgba(shade(P.bark, 0.3), 0.5);
    ctx.lineWidth = 1.3;
    const r = artRng(41);
    for (let i = 0; i < 7; i++) {
      const y = -24 + r() * 20;
      const x = -46 + r() * 70;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 9, y - 1, x + 16 + r() * 10, y + 0.5);
      ctx.stroke();
    }
    // Moss blanket over the top.
    ctx.fillStyle = vGrad(ctx, -36, -14, [
      [0, tint(P.sage, 0.15)],
      [1, P.moss],
    ]);
    ctx.beginPath();
    ctx.moveTo(-60, -40);
    ctx.lineTo(60, -40);
    ctx.lineTo(60, -22);
    const bumps: Pt[] = [
      [44, -20],
      [32, -16],
      [18, -21],
      [4, -15],
      [-10, -20],
      [-24, -14],
      [-38, -19],
      [-50, -15],
    ];
    let px = 60;
    for (const [bx, by] of bumps) {
      ctx.quadraticCurveTo((px + bx) / 2, by + 5, bx, by);
      px = bx;
    }
    ctx.lineTo(-60, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(P.cream, 0.25);
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(-46 + r() * 90, -27 + r() * 6, 1 + r() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // End grain on the right.
  const cap = new Path2D();
  cap.ellipse(46, -15.5, 8.5, 14.5, 0, 0, Math.PI * 2);
  filled(ctx, cap, tint(A['shop-wood'], 0.2), A['shop-wood'], () => {
    ctx.strokeStyle = rgba(shade(A['shop-wood'], 0.25), 0.6);
    ctx.lineWidth = 1.1;
    for (const k of [0.62, 0.32]) {
      ctx.beginPath();
      ctx.ellipse(46, -15.5, 8.5 * k, 14.5 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, 2.2);
  // Two moss tufts.
  for (const [x, y] of [
    [-40, -32],
    [24, -34],
  ] as Pt[]) {
    ctx.fillStyle = P.sage;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function chyau(ctx: Ctx, x: number, y: number, s: number): void {
  // Stem.
  const st = new Path2D();
  st.moveTo(x - 3.2 * s, y + 1);
  st.quadraticCurveTo(x - 3.6 * s, y - 5 * s, x - 2.4 * s, y - 9 * s);
  st.lineTo(x + 2.4 * s, y - 9 * s);
  st.quadraticCurveTo(x + 3.8 * s, y - 5 * s, x + 3.2 * s, y + 1);
  st.closePath();
  filled(ctx, st, P.cream, A['cream-line'], undefined, 1.6);
  // Gill band.
  const g = new Path2D();
  g.ellipse(x, y - 9 * s, 11.5 * s, 3.2 * s, 0, 0, Math.PI * 2);
  filled(ctx, g, tint(A.chyau, 0.55), A.chyau, () => {
    ctx.strokeStyle = rgba(shade(A.chyau, 0.15), 0.6);
    ctx.lineWidth = 0.9;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 1.2 * s, y - 9 * s);
      ctx.lineTo(x + i * 2.6 * s, y - 6.5 * s);
      ctx.stroke();
    }
  }, 1.6);
  // Cap dome.
  const c = new Path2D();
  c.moveTo(x - 12 * s, y - 9.5 * s);
  c.bezierCurveTo(x - 12 * s, y - 22 * s, x + 12 * s, y - 22 * s, x + 12 * s, y - 9.5 * s);
  c.quadraticCurveTo(x, y - 7.5 * s, x - 12 * s, y - 9.5 * s);
  c.closePath();
  filled(ctx, c, vGrad(ctx, y - 20 * s, y - 9 * s, [
    [0, tint(A.chyau, 0.35)],
    [1, A.chyau],
  ]), A.chyau, () => {
    ctx.fillStyle = rgba(P.cream, 0.6);
    ctx.beginPath();
    ctx.ellipse(x - 4 * s, y - 16.5 * s, 3.6 * s, 2 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy] of [
      [4, -15],
      [7, -12],
      [-1, -12.5],
    ] as Pt[]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 2);
}

// ---------------------------------------------------------------------------
// Moon Gurans shore bush: leathery rosettes; bud by day, white truss at night.
// ---------------------------------------------------------------------------

function rosette(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  const r = artRng(seed);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.02 + (i / (n - 1)) * 0.96) + (r() - 0.5) * 0.15;
    const len = (24 + r() * 6) * s;
    withState(ctx, () => {
      ctx.translate(x, y);
      ctx.rotate(a);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.quadraticCurveTo(len * 0.5, -6.5 * s, len, 0);
      p.quadraticCurveTo(len * 0.5, 6.5 * s, 0, 0);
      const col = i % 2 ? P.moss : mix(P.moss, P.sage, 0.35);
      filled(ctx, p, lGrad(ctx, 0, 0, len, 0, [
        [0, shade(col, 0.1)],
        [1, tint(col, 0.2)],
      ]), col, () => {
        ctx.strokeStyle = rgba(tint(col, 0.5), 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(len - 3, 0);
        ctx.stroke();
      }, 1.8);
    });
  }
}

function drawMoonBush(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 54, 8, 0.2);
  ctx.strokeStyle = P.bark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, 1);
  ctx.quadraticCurveTo(-4, -30, 4, -58);
  ctx.moveTo(-2, -14);
  ctx.quadraticCurveTo(-14, -20, -24, -30);
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(12, -26, 22, -36);
  ctx.stroke();
  rosette(ctx, -24, -26, 0.92, 3);
  rosette(ctx, 24, -32, 0.92, 4);
  rosette(ctx, -8, -8, 0.8, 5);
  rosette(ctx, 14, -6, 0.75, 6);
  rosette(ctx, 4, -58, 1, 7);
}

function drawMoonBud(ctx: Ctx): void {
  const [x, y] = MOON_TRUSS;
  const by = y + 10;
  const p = new Path2D();
  p.moveTo(x, by - 22);
  p.bezierCurveTo(x + 9, by - 16, x + 10, by - 4, x, by);
  p.bezierCurveTo(x - 10, by - 4, x - 9, by - 16, x, by - 22);
  p.closePath();
  filled(ctx, p, vGrad(ctx, by - 22, by, [
    [0, A['moon-gurans']],
    [1, mix(A['moon-gurans'], A.pango, 0.45)],
  ]), mix(A['moon-gurans'], P.lavender, 0.5), () => {
    ctx.strokeStyle = rgba(mix(P.lavender, A['moon-gurans'], 0.3), 0.6);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, by - 20);
    ctx.quadraticCurveTo(x - 4, by - 10, x - 2, by - 1);
    ctx.moveTo(x, by - 20);
    ctx.quadraticCurveTo(x + 5, by - 10, x + 3, by - 1);
    ctx.stroke();
  }, 2);
  // Sepal cup.
  leafDab(ctx, x - 4, by - 1, 10, 3.6, 0.5, P.sage);
  leafDab(ctx, x + 4, by - 1, 10, 3.6, -0.5, P.sage);
}

function moonFlower(ctx: Ctx, x: number, y: number, s: number, rot: number): void {
  const petal = A['moon-gurans'];
  const line = mix(petal, P.lavender, 0.55);
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * Math.PI * 2) / 5;
    const p = new Path2D();
    p.ellipse(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s, 5.4 * s, 4.4 * s, a, 0, Math.PI * 2);
    filled(ctx, p, rGrad(ctx, x, y, 0, 11 * s, [
      [0, mix(petal, A['fish-glow'], 0.6)],
      [1, petal],
    ]), line, undefined, 1.5);
  }
  ctx.fillStyle = rgba(P.butter, 0.9);
  ctx.beginPath();
  ctx.arc(x, y, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(mix(P.butter, P.bark, 0.3), 0.8);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    const a = rot + 0.6 + i * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s - 2, x + Math.cos(a) * 7 * s, y + Math.sin(a) * 7 * s);
    ctx.stroke();
  }
}

function drawMoonTruss(ctx: Ctx): void {
  const [x, y] = MOON_TRUSS;
  const fl: [number, number, number, number][] = [
    [-11, 4, 0.95, 0.2],
    [11, 5, 0.95, 0.7],
    [0, -10, 1, 0.1],
    [-12, -10, 0.85, 0.5],
    [12, -9, 0.85, 0.9],
    [0, 6, 1.05, 0.4],
  ];
  for (const [dx, dy, s, r] of fl) moonFlower(ctx, x + dx, y + dy, s, r);
}

// ---------------------------------------------------------------------------
// Moon Scale: a palm-sized rounded scallop (24 x 20 world px).
// ---------------------------------------------------------------------------

function scalePath(): Path2D {
  const p = new Path2D();
  smoothClosed(p, [
    [-12, -16],
    [0, -19],
    [12, -16],
    [12.5, -9],
    [8, -2.5],
    [0, -0.5],
    [-8, -2.5],
    [-12.5, -9],
  ], 0.55);
  return p;
}

function drawScale(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 15, 3.5, 0.18);
  withState(ctx, () => {
    ctx.rotate(-0.16);
    const p = scalePath();
    filled(ctx, p, vGrad(ctx, -19, 0, [
      [0, A.moonmilk],
      [1, A['fish-glow']],
    ]), A['fish-glow-edge'], () => {
      ctx.strokeStyle = rgba(A['fish-glow-edge'], 0.9);
      ctx.lineWidth = 1.2;
      for (const k of [0.62, 0.32]) {
        ctx.beginPath();
        ctx.ellipse(0, -16, 12 * k + 4, 15 * k + 2, 0, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(P.cream, 0.95);
      ctx.beginPath();
      ctx.ellipse(-5, -13, 3, 1.6, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }, 1.8);
    ctx.strokeStyle = A['scale-glow'];
    ctx.lineWidth = 1;
    ctx.stroke(p);
  });
}

export function bake(b: Baker): void {
  ptex(b, 'prop_katus_trunk', 60, 70, 30, 62, drawKatusTrunk);
  ptex(b, 'prop_katus_crown', 140, 112, 70, 108, drawKatusCrown);
  ptex(b, 'prop_katus_burrs', 140, 112, 70, 108, (ctx) => {
    ctx.translate(0, -CROWN_Y);
    KATUS_BURRS.forEach(([x, y], i) => burr(ctx, x, y, i % 2 ? 0.92 : 1.04));
  });
  ptex(b, 'prop_sisnu_base', 80, 40, 40, 32, drawSisnuBase);
  ptex(b, 'prop_sisnu_tops', 80, 72, 40, 64, drawSisnuTops);
  ptex(b, 'prop_ainselu_bush', 128, 80, 64, 72, drawAinseluBush);
  ptex(b, 'prop_ainselu_berries', 128, 80, 64, 72, (ctx) => AINSELU_BERRIES.forEach(([x, y], i) => berryCluster(ctx, x, y, 3 + i * 5)));
  ptex(b, 'prop_log', 124, 52, 62, 44, drawLog);
  ptex(b, 'prop_log_caps3', 124, 76, 62, 68, (ctx) => CHYAU_CAPS3.forEach(([x, y, s]) => chyau(ctx, x, y, s)));
  ptex(b, 'prop_log_caps6', 124, 76, 62, 68, (ctx) => {
    // Small ones first so the big three sit in front.
    for (const [x, y, s] of CHYAU_CAPS6.slice(3)) chyau(ctx, x, y, s);
    for (const [x, y, s] of CHYAU_CAPS6.slice(0, 3)) chyau(ctx, x, y, s);
  });
  ptex(b, 'prop_moon_bush', 120, 96, 60, 88, drawMoonBush);
  ptex(b, 'prop_moon_bud', 120, 104, 60, 96, drawMoonBud);
  ptex(b, 'prop_moon_truss', 120, 112, 60, 104, drawMoonTruss);
  ptex(b, 'prop_scale', 36, 30, 18, 24, drawScale);
}
