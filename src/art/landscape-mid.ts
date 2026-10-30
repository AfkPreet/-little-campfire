/**
 * Landscape bakers, middle: the tea and hill-town ridge (M) and the far-shore
 * forest (N: dhupi cones, rhododendron domes, malingo bamboo fans, reed line),
 * each with half-resolution rim textures for golden/dawn/night relighting.
 */
import { Baker, Ctx, artRng, fbm, roundRectPath, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';
import { BAND, BX0, HOUSES, MID_RIDGE, WINDOWS, bandW } from './landscape-geo';
import { dir, erase, litCircle, rimOf, teardrop, underCurve } from './landscape-util';

const SUN: [number, number] = dir(1, -0.55);
const MOON: [number, number] = dir(-0.8, -0.6);

// ---------------------------------------------------------------------------
// M: mid ridge
// ---------------------------------------------------------------------------

const W_MID = bandW(0.25);
const MID_X0 = BX0 - 4;
const MID_X1 = BX0 + W_MID + 4;

function midShape(c: Ctx): void {
  underCurve(c, MID_RIDGE, MID_X0, MID_X1, BAND.mid.y1 + 4, 3);
  const r = artRng(611);
  let x = MID_X0;
  while (x < MID_X1) {
    const rr = 2.6 + r() * 2.6;
    if (r() < 0.55) {
      const by = MID_RIDGE(x) + rr * 0.5;
      c.moveTo(x + rr, by);
      c.arc(x, by, rr, 0, Math.PI * 2);
    }
    x += rr * (1.3 + r() * 2.2);
  }
}

/** Tea terrace stripe centre line i (0..3) on the right flank of the main hump. */
function terrace(i: number): { x0: number; x1: number; y: (x: number) => number } {
  const x0 = 838 + i * 10;
  const x1 = 1004 - i * 4;
  const yc = 318 + i * 12.5;
  const xc = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  return { x0, x1, y: (x) => yc + ((x - xc) / half) ** 2 * 5 + (x - xc) * 0.05 };
}

function bakeMid(b: Baker): void {
  const { y0, y1 } = BAND.mid;
  const H = y1 - y0;
  const body = mix(A['ridge-near'], A.dhupi, 0.28);
  b.strip('land_mid', W_MID, H, (ctx) => {
    ctx.translate(-BX0, -y0);
    ctx.beginPath();
    midShape(ctx);
    ctx.fillStyle = vGrad(ctx, 300, y1, [
      [0, body],
      [0.45, mix(body, A['cloud-sea'], 0.18)],
      [1, mix(body, A['cloud-sea'], 0.5)],
    ]);
    ctx.fill();
    withState(ctx, () => {
      ctx.beginPath();
      midShape(ctx);
      ctx.clip();
      // Forest texture: soft darker tree dabs in loose contour rows.
      const r = artRng(612);
      const n = fbm(613, 2);
      for (let i = 0; i < 520; i++) {
        const x = MID_X0 + r() * (MID_X1 - MID_X0);
        if (x > 828 && x < 1010) continue; // keep the tea flank clean
        const yy = MID_RIDGE(x) + 5 + r() * 46;
        if (n(x / 60) < 0.42) continue;
        ctx.fillStyle = rgba(shade(body, 0.08), 0.08 + r() * 0.08);
        ctx.beginPath();
        ctx.ellipse(x, yy, 3 + r() * 4, 2 + r() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lighter sunlit upper slopes on the right flanks of each hump.
      ctx.fillStyle = vGrad(ctx, 296, 360, [
        [0, tint(body, 0.16), 0.5],
        [1, tint(body, 0.16), 0],
      ]);
      ctx.fillRect(MID_X0, 296, MID_X1 - MID_X0, 64);
      // Tea terraces: 4 contour stripes, alternating tea-green / 8% darker.
      const tea = mix(A['tea-green'], body, 0.3);
      const tea2 = shade(tea, 0.08);
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const t = terrace(i);
        ctx.beginPath();
        for (let x = t.x0; x <= t.x1; x += 3) {
          const yy = t.y(x);
          if (x === t.x0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.strokeStyle = i % 2 === 0 ? tea : tea2;
        ctx.lineWidth = 10.5;
        ctx.stroke();
        // bush-row bumps along the top edge, lighter
        ctx.fillStyle = rgba(tint(tea, 0.25), 0.5);
        for (let x = t.x0 + 2; x <= t.x1 - 2; x += 5.5) {
          ctx.beginPath();
          ctx.arc(x, t.y(x) - 4.2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        // a thin path line between stripes
        ctx.strokeStyle = rgba(shade(body, 0.05), 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = t.x0 + 4; x <= t.x1 - 4; x += 3) {
          const yy = t.y(x) + 6.1;
          if (x === t.x0 + 4) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      // A few tiny dhupi spires around the hill town.
      for (const [x, s] of [
        [768, 1],
        [856, 0.8],
        [930, 0.9],
        [812, 0.7],
      ] as [number, number][]) {
        const by = MID_RIDGE(x) + 12 + s * 6;
        ctx.beginPath();
        teardrop(ctx, x, by - 14 * s, 6 * s, 14 * s);
        ctx.fillStyle = shade(body, 0.16);
        ctx.fill();
      }
    });
    // Hill houses: 14 x 10 rounded walls, pastel tin roof wedges.
    for (const h of HOUSES) {
      const wx = h.x - 7;
      const wy = h.y - 10;
      ctx.beginPath();
      roundRectPath(ctx, wx, wy, 14, 10, 2.2);
      ctx.fillStyle = A.lokta;
      ctx.fill();
      ctx.strokeStyle = shade(A.lokta, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      // roof wedge
      const roof = A[h.roof] ?? P.butter;
      ctx.beginPath();
      ctx.moveTo(wx - 2.5, wy + 1.2);
      ctx.quadraticCurveTo(wx - 3.2, wy + 0.2, wx - 1.6, wy - 1.2);
      ctx.lineTo(wx + 4, wy - 6);
      ctx.quadraticCurveTo(wx + 7, wy - 7.6, wx + 10, wy - 6);
      ctx.lineTo(wx + 15.6, wy - 1.2);
      ctx.quadraticCurveTo(wx + 17.2, wy + 0.2, wx + 16.5, wy + 1.2);
      ctx.closePath();
      ctx.fillStyle = roof;
      ctx.fill();
      ctx.strokeStyle = shade(roof, 0.3);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.strokeStyle = rgba(tint(roof, 0.6), 0.9);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(wx + 1, wy - 1.6);
      ctx.lineTo(wx + 5, wy - 5.2);
      ctx.stroke();
      // door
      ctx.fillStyle = shade(A['shop-wood'], 0.15);
      ctx.beginPath();
      roundRectPath(ctx, h.x + 2.2, wy + 4.4, 3.2, 5.6, 1.2);
      ctx.fill();
    }
    // Unlit windows (the night necklace glows over these).
    for (const w of WINDOWS) {
      ctx.fillStyle = mix(P.ink, A['ridge-near'], 0.45);
      ctx.beginPath();
      roundRectPath(ctx, w.x - 1.6, w.y - 1.6, 3.2, 3.2, 1);
      ctx.fill();
    }
  });
  const rimH = 384 - y0;
  const rim = (key: string, l: [number, number]) =>
    b.strip(key, Math.ceil(W_MID / 2), Math.ceil(rimH / 2), (ctx) => {
      ctx.scale(0.5, 0.5);
      ctx.translate(-BX0, -y0);
      rimOf(ctx, midShape, l[0], l[1], 3, 7);
    });
  rim('land_midRimR', SUN);
  rim('land_midRimL', MOON);
}

// ---------------------------------------------------------------------------
// N: far-shore forest
// ---------------------------------------------------------------------------

const W_NEAR = bandW(0.5);
const NEAR_X0 = BX0 - 6;
const NEAR_X1 = BX0 + W_NEAR + 6;

type Prim =
  | { k: 'c'; x: number; y: number; r: number }
  | { k: 't'; x: number; top: number; w: number; h: number; lean: number };

interface Forest {
  back: Prim[];
  front: { kind: 'dhupi' | 'dome' | 'fan'; prims: Prim[]; x: number; seed: number }[];
}

function buildForest(seed: number): Forest {
  const r = artRng(seed);
  const n = fbm(seed + 1, 3);
  const back: Prim[] = [];
  let x = NEAR_X0 - 20;
  while (x < NEAR_X1 + 20) {
    const rr = 17 + r() * 14;
    back.push({ k: 'c', x, y: 408 + (n(x / 90) - 0.5) * 22 + r() * 6, r: rr });
    x += rr * (0.8 + r() * 0.5);
  }
  x = NEAR_X0 + 40;
  while (x < NEAR_X1) {
    const h = 64 + r() * 34;
    back.push({ k: 't', x, top: 432 - h, w: 22 + r() * 8, h, lean: (r() - 0.5) * 3 });
    x += 90 + r() * 140;
  }
  const front: Forest['front'] = [];
  x = NEAR_X0 + 10;
  let last = '';
  let i = 0;
  while (x < NEAR_X1) {
    const roll = r();
    let kind: 'dhupi' | 'dome' | 'fan' = roll < 0.42 ? 'dhupi' : roll < 0.82 ? 'dome' : 'fan';
    if (kind === 'fan' && last === 'fan') kind = 'dome';
    if (kind === last && kind !== 'dome' && r() < 0.5) kind = 'dome';
    last = kind;
    const prims: Prim[] = [];
    let w = 0;
    if (kind === 'dhupi') {
      const count = 2 + Math.floor(r() * 3);
      let cx = x;
      for (let k = 0; k < count; k++) {
        const mid = 1 - Math.abs(k - (count - 1) / 2) / Math.max(1, count / 2);
        const h = 90 + r() * 22 + mid * 28;
        const cw = 30 + r() * 16;
        prims.push({ k: 't', x: cx, top: 452 - h, w: cw, h, lean: (r() - 0.5) * 4 });
        cx += cw * (0.55 + r() * 0.2);
      }
      w = cx - x + 18;
    } else if (kind === 'dome') {
      const count = 3 + Math.floor(r() * 3);
      const span = 50 + count * 16;
      for (let k = 0; k < count; k++) {
        const t = count === 1 ? 0.5 : k / (count - 1);
        const top = k % 2 === 1;
        const rr = 16 + r() * 12 + (top ? 0 : 3);
        prims.push({ k: 'c', x: x + 16 + t * span + (r() - 0.5) * 6, y: (top ? 404 : 424) + (r() - 0.5) * 8, r: rr });
      }
      w = span + 30;
    } else {
      w = 70;
    }
    front.push({ kind, prims, x: x + w / 2, seed: seed * 31 + i++ });
    x += w * (0.62 + r() * 0.25) + r() * 22;
  }
  return { back, front };
}

const FOREST = buildForest(907);

function primPath(c: Ctx, p: Prim): void {
  if (p.k === 'c') {
    c.moveTo(p.x + p.r, p.y);
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  } else teardrop(c, p.x, p.top, p.w, p.h, p.lean);
}

function nearShape(c: Ctx): void {
  for (const p of FOREST.back) primPath(c, p);
  c.rect(NEAR_X0, 414, NEAR_X1 - NEAR_X0, 50);
  for (const g of FOREST.front) for (const p of g.prims) primPath(c, p);
}

function drawCone(ctx: Ctx, p: Extract<Prim, { k: 't' }>, base: string, lit: string, outline: number): void {
  withState(ctx, () => {
    ctx.beginPath();
    teardrop(ctx, p.x, p.top, p.w, p.h, p.lean);
    ctx.fillStyle = lit;
    ctx.fill();
    if (outline > 0) {
      ctx.strokeStyle = rgba(shade(base, 0.25), outline);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.clip();
    ctx.beginPath();
    teardrop(ctx, p.x - p.w * 0.2, p.top + p.h * 0.06, p.w, p.h, p.lean);
    ctx.fillStyle = vGrad(ctx, p.top, p.top + p.h, [
      [0, base],
      [1, shade(base, 0.08)],
    ]);
    ctx.fill();
    // tier hints: soft downward scallops
    ctx.strokeStyle = rgba(shade(base, 0.14), 0.4);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    const tiers = Math.round(p.h / 30);
    for (let t = 1; t <= tiers; t++) {
      const yy = p.top + (p.h * t) / (tiers + 0.6);
      const half = p.w * (0.18 + 0.3 * Math.min(1, t / tiers));
      ctx.beginPath();
      ctx.moveTo(p.x - half, yy);
      ctx.quadraticCurveTo(p.x - half * 0.5, yy + 4, p.x, yy + 1);
      ctx.quadraticCurveTo(p.x + half * 0.5, yy + 4, p.x + half, yy);
      ctx.stroke();
    }
  });
}

function drawFan(ctx: Ctx, cx: number, seed: number): void {
  const r = artRng(seed);
  const n = 9 + Math.floor(r() * 4);
  const baseY = 452;
  const col = A.malingo;
  const leaves: [number, number, number, string][] = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const ang = -Math.PI * (0.86 - t * 0.72) + (r() - 0.5) * 0.08;
    const len = 80 + r() * 34 - Math.abs(t - 0.5) * 34;
    const back = k % 2 === 0;
    const c = back ? mix(col, P.moss, 0.35) : col;
    const sx = cx + (t - 0.5) * 8;
    const ex = cx + Math.cos(ang) * len;
    const ey = baseY + Math.sin(ang) * len;
    const out = (t - 0.5) * 2;
    const qx = cx + Math.cos(ang) * len * 0.55;
    const qy = baseY + Math.sin(ang) * len * 0.8;
    const tx = ex + out * 14;
    const ty = ey + 10 + Math.abs(out) * 16;
    ctx.strokeStyle = shade(c, 0.12);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(sx, baseY);
    ctx.quadraticCurveTo(qx, qy, tx, ty);
    ctx.stroke();
    for (let j = 0; j < 7; j++) {
      const u = 0.38 + j * 0.095;
      const lx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * qx + u * u * tx;
      const ly = (1 - u) * (1 - u) * baseY + 2 * (1 - u) * u * qy + u * u * ty;
      const la = Math.atan2(ty - qy, tx - qx) + (j % 2 ? 0.75 : -0.75) * (1 - u * 0.3) + 0.5 * Math.sign(out || 1);
      leaves.push([lx, ly, la, j % 3 === 0 ? mix(c, P.sage, 0.4) : c]);
    }
  }
  for (const [lx, ly, la, c] of leaves) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(la);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -3, 13, 0.5);
    ctx.quadraticCurveTo(6, 2.6, 0, 0);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  }
}

function bakeNear(b: Baker): void {
  const { y0, y1 } = BAND.near;
  const H = y1 - y0;
  const backCol = mix(mix(P.moss, A['ridge-near'], 0.4), A['cloud-sea'], 0.12);
  const backDhupi = mix(mix(A.dhupi, A['ridge-near'], 0.36), A['cloud-sea'], 0.1);
  b.strip('land_near', W_NEAR, H, (ctx) => {
    ctx.translate(-BX0, -y0);
    // Back canopy wall (hazier) + base.
    ctx.fillStyle = vGrad(ctx, 410, 462, [
      [0, backCol],
      [1, mix(backCol, A.dhupi, 0.35)],
    ]);
    ctx.fillRect(NEAR_X0, 414, NEAR_X1 - NEAR_X0, 50);
    for (const p of FOREST.back) {
      if (p.k === 't') drawCone(ctx, p, backDhupi, tint(backDhupi, 0.14), 0);
    }
    for (const p of FOREST.back) {
      if (p.k === 'c') litCircle(ctx, p.x, p.y, p.r, backCol, tint(backCol, 0.16), SUN[0], SUN[1], 0.16);
    }
    // Front groups.
    for (const g of FOREST.front) {
      if (g.kind === 'fan') {
        drawFan(ctx, g.x, g.seed);
        continue;
      }
      if (g.kind === 'dhupi') {
        for (const p of g.prims) if (p.k === 't') drawCone(ctx, p, A.dhupi, mix(A.dhupi, P.sage, 0.36), 0.45);
        continue;
      }
      const r = artRng(g.seed);
      const domes = g.prims.filter((p): p is Extract<Prim, { k: 'c' }> => p.k === 'c');
      // shadowed underside first so overlaps read
      for (const p of domes) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 0.8, 0, Math.PI * 2);
        ctx.fillStyle = rgba(shade(P.moss, 0.28), 0.45);
        ctx.fill();
      }
      for (const p of domes) litCircle(ctx, p.x, p.y, p.r, P.moss, mix(P.moss, P.sage, 0.5), SUN[0], SUN[1], 0.2);
      // at most 3 gurans dabs (3-dot clusters) per mass
      const dabs = 1 + Math.floor(r() * 3);
      for (let k = 0; k < dabs; k++) {
        const p = domes[Math.floor(r() * domes.length)];
        const a = -Math.PI * (0.2 + r() * 0.6);
        const dx = p.x + Math.cos(a) * p.r * 0.55;
        const dy = p.y + Math.sin(a) * p.r * 0.55;
        for (let j = 0; j < 3; j++) {
          const ja = (j / 3) * Math.PI * 2 + r();
          ctx.fillStyle = j === 0 ? A.gurans : mix(A.gurans, A['gurans-deep'], 0.4);
          ctx.beginPath();
          ctx.arc(dx + Math.cos(ja) * 2.6, dy + Math.sin(ja) * 2.6, 2.2 + r() * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(P.cream, 0.7);
        ctx.beginPath();
        ctx.arc(dx - 0.6, dy - 1.2, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Reed line where the forest meets the water.
    const r = artRng(931);
    ctx.lineCap = 'round';
    for (let x = NEAR_X0; x < NEAR_X1; x += 2.2 + r() * 2.4) {
      const h = 5 + r() * 12;
      const lean = (r() - 0.5) * 4;
      ctx.strokeStyle = rgba(r() < 0.5 ? A.reed : shade(A.reed, 0.12), 0.85);
      ctx.lineWidth = 1 + r() * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, 452);
      ctx.quadraticCurveTo(x + lean * 0.3, 452 - h * 0.6, x + lean, 452 - h);
      ctx.stroke();
    }
    ctx.fillStyle = vGrad(ctx, 446, 452, [
      [0, A.reed, 0],
      [1, tint(A.reed, 0.3), 0.85],
    ]);
    ctx.fillRect(NEAR_X0, 446, NEAR_X1 - NEAR_X0, 6);
  });
  const rimH = 444 - y0;
  const rim = (key: string, l: [number, number]) =>
    b.strip(key, Math.ceil(W_NEAR / 2), Math.ceil(rimH / 2), (ctx) => {
      ctx.scale(0.5, 0.5);
      ctx.translate(-BX0, -y0);
      rimOf(ctx, nearShape, l[0], l[1], 2.6, 6);
      erase(ctx, (c) => c.rect(NEAR_X0, 438, NEAR_X1 - NEAR_X0, 20));
    });
  rim('land_nearRimR', SUN);
  rim('land_nearRimL', MOON);
}

export function bakeMidBands(b: Baker): void {
  bakeMid(b);
  bakeNear(b);
}
