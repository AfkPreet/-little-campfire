/**
 * Landscape bakers, front: the ground band (G) with the scalloped grass rim,
 * shop path steps, bamboo-path slabs, mossy boulders, the pebble shore and
 * reed line; plus separate textures for the two framing rhododendrons, the
 * corner of Boju's store, a malingo bamboo clump and the dock.
 */
import { Baker, Ctx, artRng, fbm, grain, roundRectPath, smoothClosed, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';
import { CAMP } from '@/data/camp';
import { BAND, BX0, shoreBackY, shoreRightX } from './landscape-geo';
import { dir, litCircle } from './landscape-util';

const SUN: [number, number] = dir(1, -0.55);

export const GROUND_W = 2360;
const GX0 = BX0;
const GX1 = BX0 + GROUND_W;

/** Where grass gives way to the pebble beach (world x at screen y). */
function beachX(y: number): number {
  return 1986 + (y - 500) * 0.55;
}

function landPath(c: Ctx): void {
  c.moveTo(GX0 - 4, 724);
  c.lineTo(GX0 - 4, 504);
  for (let x = GX0; x <= 2262; x += 4) c.lineTo(x, x < 1960 ? 504 : shoreBackY(x));
  for (let y = shoreBackY(2262); y <= 724; y += 4) c.lineTo(shoreRightX(y), y);
  c.lineTo(shoreRightX(724), 724);
  c.closePath();
}

function beachPath(c: Ctx): void {
  c.moveTo(beachX(492), 492);
  for (let x = beachX(492); x <= 2262; x += 4) c.lineTo(x, shoreBackY(x) - 1);
  for (let y = shoreBackY(2262); y <= 724; y += 4) c.lineTo(shoreRightX(y), y);
  c.lineTo(beachX(724), 724);
  // ragged grass boundary back up
  for (let y = 724; y >= 492; y -= 8) c.lineTo(beachX(y) + Math.sin(y * 0.21) * 6 + Math.sin(y * 0.07) * 5, y);
  c.closePath();
}

function mossyBoulder(ctx: Ctx, x: number, y: number, r: number, seed: number): void {
  const rnd = artRng(seed);
  softShadow(ctx, x + 3, y + r * 0.62, r * 1.6, r * 0.34, 0.16);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.28, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, y - r, y + r, [
    [0, A.stone],
    [1, A['stone-shade']],
  ]);
  ctx.fill();
  ctx.strokeStyle = shade(A['stone-shade'], 0.25);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.clip();
  // moss cap with a scalloped lower edge
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    const k = 1.1;
    pts.push([x + Math.cos(a) * r * 1.4 * k, y + Math.sin(a) * r * 1.2 * k]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    pts.push([x - r * 1.35 + t * r * 2.7, y + r * (0.05 + (i % 2) * 0.16 + rnd() * 0.08)]);
  }
  ctx.beginPath();
  smoothClosed(ctx, pts, 0.4);
  ctx.fillStyle = vGrad(ctx, y - r, y + r * 0.2, [
    [0, mix(P.sage, P.butter, 0.12)],
    [1, P.moss],
  ]);
  ctx.fill();
  // lit crescent upper right
  ctx.fillStyle = rgba(tint(P.sage, 0.4), 0.55);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.28, r, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.2, y + r * 0.22, r * 1.3, r * 1.04, 0, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}

function slab(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = artRng(seed);
  softShadow(ctx, x + 2, y + h + 4, w * 0.62, 5, 0.16);
  ctx.beginPath();
  roundRectPath(ctx, x - w / 2, y + 2, w, h + 4, (h + 4) / 2);
  ctx.fillStyle = A['stone-shade'];
  ctx.fill();
  ctx.strokeStyle = shade(A['stone-shade'], 0.25);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  roundRectPath(ctx, x - w / 2 + 1, y, w - 2, h, h / 2);
  ctx.fillStyle = vGrad(ctx, y, y + h, [
    [0, tint(A.stone, 0.25)],
    [1, A.stone],
  ]);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = rgba(A['stone-shade'], 0.35);
    ctx.beginPath();
    ctx.arc(x - w * 0.35 + rnd() * w * 0.7, y + 2 + rnd() * (h - 4), 0.8 + rnd() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tuft(ctx: Ctx, x: number, y: number, s: number, col: string, rnd: () => number): void {
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * s;
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + (rnd() - 0.5) * 0.2;
    const len = (7 + rnd() * 6) * s;
    ctx.beginPath();
    ctx.moveTo(x + (i - n / 2) * 1.4 * s, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.4, y + Math.sin(a) * len * 0.7, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

function bakeGroundStrip(b: Baker): void {
  const { y0, y1 } = BAND.ground;
  b.strip('land_ground', GROUND_W, y1 - y0, (ctx) => {
    ctx.translate(-BX0, -y0);
    const rnd = artRng(1201);
    // Back rim scallops: moss row behind, sage row in front.
    const scallops = (yy: number, rMin: number, rMax: number, col: string, seed: number) => {
      const r = artRng(seed);
      ctx.fillStyle = col;
      ctx.beginPath();
      let x = GX0 - 10;
      while (x < 1990) {
        const rr = rMin + r() * (rMax - rMin);
        ctx.moveTo(x + rr, yy + rr * 0.5);
        ctx.arc(x, yy + rr * 0.5, rr, 0, Math.PI * 2);
        x += rr * (1.25 + r() * 0.4);
      }
      ctx.fill();
    };
    scallops(494, 9, 15, mix(P.moss, P.sage, 0.2), 1202);
    scallops(500, 11, 17, tint(P.sage, 0.1), 1203);
    // Land body.
    ctx.beginPath();
    landPath(ctx);
    ctx.fillStyle = vGrad(ctx, 500, 720, [
      [0, tint(P.sage, 0.12)],
      [0.2, P.sage],
      [0.5, mix(P.sage, P.moss, 0.32)],
      [1, mix(P.sage, P.moss, 0.78)],
    ]);
    ctx.fill();
    withState(ctx, () => {
      ctx.beginPath();
      landPath(ctx);
      ctx.clip();
      // Painterly mottling.
      const n = fbm(1204, 3);
      for (let i = 0; i < 150; i++) {
        const x = GX0 + rnd() * (GX1 - GX0);
        const y = 512 + rnd() * 200;
        const light = n(x / 140 + y / 60) > 0.5;
        const rx = 40 + rnd() * 120;
        ctx.fillStyle = rgba(light ? tint(P.sage, 0.35) : P.moss, 0.07 + rnd() * 0.07);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, 6 + rx * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // A soft sunlit band just under the rim, and the trodden walk line.
      ctx.fillStyle = vGrad(ctx, 502, 540, [
        [0, P.butter, 0.18],
        [1, P.butter, 0],
      ]);
      ctx.fillRect(GX0, 502, GX1 - GX0, 40);
      // Bamboo path: a pale trodden band from the shop steps into the clearing.
      for (let x = GX0; x < 640; x += 6) {
        const fade = x < 470 ? 1 : 1 - (x - 470) / 170;
        ctx.fillStyle = rgba(mix(P.sage, A.pebble, 0.55), 0.22 * fade);
        ctx.beginPath();
        ctx.ellipse(x, 592 + Math.sin(x * 0.02) * 2, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Beach.
      ctx.beginPath();
      beachPath(ctx);
      ctx.fillStyle = vGrad(ctx, 500, 720, [
        [0, mix(A.pebble, P.sage, 0.15)],
        [1, mix(A.pebble, A['stone-shade'], 0.35)],
      ]);
      ctx.fill();
      // Wet edge along the water.
      ctx.strokeStyle = rgba(mix(A.pebble, A['lake-deep'], 0.45), 0.7);
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let x = 1990; x <= 2262; x += 4) {
        const y = shoreBackY(x);
        if (x === 1990) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let y = shoreBackY(2262); y <= 724; y += 4) ctx.lineTo(shoreRightX(y), y);
      ctx.stroke();
      // Pebbles, denser toward the water.
      const r2 = artRng(1205);
      for (let i = 0; i < 170; i++) {
        const y = 500 + r2() * 220;
        const xa = beachX(y) + 8;
        const xb = y < 584 ? 2262 : shoreRightX(y);
        const t = Math.pow(r2(), 0.6);
        const x = xa + t * (xb - xa);
        if (y < shoreBackY(x) + 3) continue;
        const rx = 2.5 + r2() * 6.5;
        const col = [A.pebble, A.stone, mix(A.pebble, A['stone-shade'], 0.4), tint(A.pebble, 0.3)][Math.floor(r2() * 4)];
        ctx.fillStyle = rgba(P.ink, 0.1);
        ctx.beginPath();
        ctx.ellipse(x + 1, y + rx * 0.45, rx, rx * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, rx * 0.62, (r2() - 0.5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(P.cream, 0.4);
        ctx.beginPath();
        ctx.ellipse(x - rx * 0.25, y - rx * 0.25, rx * 0.4, rx * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Darker foreground lip along the bottom.
      ctx.fillStyle = vGrad(ctx, 660, 720, [
        [0, P.moss, 0],
        [1, shade(P.moss, 0.1), 0.35],
      ]);
      ctx.fillRect(GX0, 660, GX1 - GX0, 64);
      grain(ctx, GX0, 500, GX1 - GX0, 220, 0.045, 1206, 0.3);
    });
    // Sunlit lip on the sage scallops.
    ctx.strokeStyle = rgba(tint(P.butter, 0.4), 0.35);
    ctx.lineWidth = 1.6;
    {
      const r = artRng(1203);
      let x = GX0 - 10;
      while (x < 1990) {
        const rr = 11 + r() * 6;
        ctx.beginPath();
        ctx.arc(x, 500 + rr * 0.5, rr - 1, -Math.PI * 0.8, -Math.PI * 0.3);
        ctx.stroke();
        x += rr * (1.25 + r() * 0.4);
      }
    }
    // Grass tufts and a few tiny flower clusters.
    const r3 = artRng(1207);
    for (let i = 0; i < 150; i++) {
      const x = GX0 + r3() * (2040 - GX0);
      const y = 512 + r3() * 200;
      tuft(ctx, x, y, 0.7 + (y - 500) / 240, rgba(shade(P.moss, 0.06), 0.45 + r3() * 0.3), r3);
    }
    for (let i = 0; i < 14; i++) {
      const x = 560 + r3() * 1400;
      const y = 520 + r3() * 180;
      const col = r3() < 0.6 ? P.cream : A.gurans;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = rgba(col, 0.9);
        ctx.beginPath();
        ctx.arc(x + k * 3.4 - 3.4, y + (k % 2) * 2, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Reeds on the shore's back edge.
    for (let x = 2140; x < 2252; x += 3 + r3() * 4) {
      const by = shoreBackY(x) + 2;
      const h = 16 + r3() * 22;
      const lean = (r3() - 0.3) * 6;
      ctx.strokeStyle = r3() < 0.5 ? A.reed : shade(A.reed, 0.14);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.quadraticCurveTo(x + lean * 0.2, by - h * 0.6, x + lean, by - h);
      ctx.stroke();
      if (r3() < 0.22) {
        ctx.fillStyle = mix(P.bark, A.reed, 0.3);
        ctx.beginPath();
        ctx.ellipse(x + lean * 0.9, by - h + 4, 1.8, 4.5, lean * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Mossy boulders on the back rim (clear of prop spots).
    mossyBoulder(ctx, 712, 520, 17, 1210);
    mossyBoulder(ctx, 1400, 522, 14, 1211);
    mossyBoulder(ctx, 1612, 520, 21, 1212);
    mossyBoulder(ctx, 1644, 530, 11, 1213);
    mossyBoulder(ctx, 128, 520, 15, 1214);
    // Shop path: 3 flat stone steps climbing off to the left.
    slab(ctx, 132, 588, 76, 11, 1220);
    slab(ctx, 74, 568, 80, 11, 1221);
    slab(ctx, 8, 548, 84, 11, 1222);
    // Bamboo-path slabs.
    CAMP.slabs.forEach((sx, i) => slab(ctx, sx, 584 + (i % 2) * 3, 66 + i * 4, 12, 1230 + i));
    // Foam: rounded cream dashes just off the shore edge.
    const r4 = artRng(1240);
    ctx.lineCap = 'round';
    for (let x = 1996; x < 2262; x += 10 + r4() * 10) {
      const y = shoreBackY(x) - 2.5;
      ctx.strokeStyle = rgba(P.cream, 0.75);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 5 + r4() * 6, y + 0.6);
      ctx.stroke();
    }
    for (let y = 594; y < 720; y += 12 + r4() * 10) {
      const x = shoreRightX(y) + 3;
      ctx.strokeStyle = rgba(P.cream, 0.7);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1.5, y + 6 + r4() * 5);
      ctx.stroke();
    }
  });
}

// ---------------------------------------------------------------------------
// Framing rhododendrons (hammock point) at x 1840 and 1990.
// ---------------------------------------------------------------------------

export const TREES = { x0: 1700, y0: 0, w: 460, h: 600 };

type Limb = [x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number];

function limbPath(c: Ctx, l: Limb): void {
  const [x0, y0, qx, qy, x1, y1, w0, w1] = l;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * qx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * qy + t * t * y1;
    const dx = 2 * (1 - t) * (qx - x0) + 2 * t * (x1 - qx);
    const dy = 2 * (1 - t) * (qy - y0) + 2 * t * (y1 - qy);
    const l2 = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2;
    left.push([x - (dy / l2) * w, y + (dx / l2) * w]);
    right.push([x + (dy / l2) * w, y - (dx / l2) * w]);
  }
  const pts = [...left, ...right.reverse()];
  smoothClosed(c, pts, 0.3);
}

const TREE_DEFS = [
  {
    x: 1840,
    limbs: [
      [1832, 596, 1812, 470, 1790, 330, 34, 14],
      [1846, 596, 1852, 450, 1838, 300, 30, 13],
      [1850, 500, 1858, 430, 1888, 386, 15, 7],
    ] as Limb[],
    domes: [
      [1792, 26, 112],
      [1858, 92, 100],
      [1752, 140, 90],
      [1840, 214, 92],
      [1770, 262, 78],
    ] as [number, number, number][],
  },
  {
    x: 1990,
    limbs: [
      [1996, 594, 2018, 460, 2030, 318, 32, 14],
      [1982, 594, 1978, 450, 1986, 296, 30, 13],
      [1980, 492, 1966, 428, 1940, 382, 15, 7],
    ] as Limb[],
    domes: [
      [2020, 30, 112],
      [1956, 110, 98],
      [2064, 150, 92],
      [1990, 228, 90],
      [2076, 262, 72],
    ] as [number, number, number][],
  },
];

function leafRosette(ctx: Ctx, x: number, y: number, s: number, rnd: () => number, base: string): void {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.15 + (i / (n - 1)) * Math.PI * 0.7 + (rnd() - 0.5) * 0.2;
    const len = (15 + rnd() * 6) * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? base : mix(base, P.sage, 0.25);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(base, 0.3), 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = rgba(tint(base, 0.35), 0.5);
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len - 3, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function gurans(ctx: Ctx, x: number, y: number, s: number, rnd: () => number): void {
  const flor = 6;
  for (let i = 0; i < flor; i++) {
    const a = (i / flor) * Math.PI * 2 + rnd() * 0.4;
    const fx = x + Math.cos(a) * 7 * s;
    const fy = y + Math.sin(a) * 5.5 * s;
    ctx.beginPath();
    ctx.arc(fx, fy, 5.2 * s, 0, Math.PI * 2);
    ctx.fillStyle = fy > y + 1 ? mix(A.gurans, A['gurans-deep'], 0.5) : A.gurans;
    ctx.fill();
    ctx.strokeStyle = rgba(shade(A['gurans-deep'], 0.15), 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y - 1, 5 * s, 0, Math.PI * 2);
  ctx.fillStyle = tint(A.gurans, 0.25);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = rgba(P.cream, 0.85);
    ctx.beginPath();
    ctx.arc(x - 4 * s + i * 2.6 * s, y - 4 * s + (i % 2) * 2 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bakeTrees(b: Baker): void {
  b.tex('land_trees', TREES.w, TREES.h, (ctx) => {
    ctx.translate(-TREES.x0, -TREES.y0);
    const bark = P.bark;
    const leafDeep = shade(P.moss, 0.12);
    for (const t of TREE_DEFS) softShadow(ctx, t.x, 594, 46, 8, 0.2);
    // trunks
    for (const t of TREE_DEFS) {
      for (const l of t.limbs) {
        withState(ctx, () => {
          ctx.beginPath();
          limbPath(ctx, l);
          ctx.fillStyle = tint(bark, 0.28);
          ctx.fill();
          ctx.strokeStyle = shade(bark, 0.3);
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.clip();
          ctx.translate(-4, 1);
          ctx.beginPath();
          limbPath(ctx, l);
          ctx.fillStyle = vGrad(ctx, 300, 600, [
            [0, shade(bark, 0.08)],
            [1, bark],
          ]);
          ctx.fill();
        });
      }
      // root flare
      ctx.beginPath();
      smoothClosed(
        ctx,
        [
          [t.x - 30, 598],
          [t.x - 14, 578],
          [t.x, 560],
          [t.x + 14, 578],
          [t.x + 30, 598],
          [t.x, 602],
        ],
        0.4,
      );
      ctx.fillStyle = bark;
      ctx.fill();
      // bark lines
      const r = artRng(t.x);
      ctx.strokeStyle = rgba(shade(bark, 0.22), 0.45);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const x = t.x - 12 + r() * 24;
        const y = 380 + r() * 190;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - 0.5) * 6, y + 12, x + (r() - 0.5) * 4, y + 22 + r() * 14);
        ctx.stroke();
      }
    }
    // canopy domes, back (top) to front (low)
    const all = TREE_DEFS.flatMap((t) => t.domes.map((d) => ({ d, t })));
    all.sort((a, b2) => a.d[1] - b2.d[1]);
    const r = artRng(1300);
    for (const { d } of all) {
      const [x, y, rr] = d;
      // leafy scalloped rim
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      const bumps = Math.round(rr / 7);
      for (let i = 0; i < bumps; i++) {
        const a = Math.PI * 0.05 + (i / bumps) * Math.PI * 0.9;
        const bx = x + Math.cos(a) * rr * 0.96;
        const by = y + Math.sin(a) * rr * 0.96;
        const br = 9 + r() * 6;
        ctx.moveTo(bx + br, by);
        ctx.arc(bx, by, br, 0, Math.PI * 2);
      }
      ctx.fillStyle = shade(leafDeep, 0.1);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(leafDeep, 0.3), 0.7);
      ctx.lineWidth = 2;
      ctx.stroke();
      litCircle(ctx, x, y, rr - 3, vGrad(ctx, y - rr, y + rr, [[0, P.moss], [1, leafDeep]]), mix(P.moss, P.sage, 0.5), SUN[0], SUN[1], 0.14);
      // inner leaf texture: soft lighter leaf strokes on the lit side
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * (0.05 + r() * 0.7);
        const dd = rr * (0.35 + r() * 0.5);
        const lx = x + Math.cos(a) * dd;
        const ly = y + Math.sin(a) * dd;
        ctx.fillStyle = rgba(tint(P.sage, 0.2), 0.32);
        ctx.beginPath();
        ctx.ellipse(lx, ly, 9, 3.2, a + 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // hanging leaf rosettes and gurans trusses (<= 8 per tree)
    const r5 = artRng(1310);
    for (const t of TREE_DEFS) {
      const spots = t.domes.slice(1).flatMap(([x, y, rr]) => [
        [x + rr * 0.5, y + rr * 0.62],
        [x - rr * 0.45, y + rr * 0.72],
      ]);
      spots.slice(0, 7).forEach(([x, y], i) => {
        leafRosette(ctx, x, y + 6, 1, r5, P.moss);
        if (i < 7) gurans(ctx, x, y, 0.95 + r5() * 0.2, r5);
      });
      const [lx, ly, lr] = t.domes[3];
      gurans(ctx, lx + lr * 0.2, ly - lr * 0.35, 0.9, r5);
    }
  });
}

// ---------------------------------------------------------------------------
// Boju's store corner (x 30-150), the bamboo clump and the dock.
// ---------------------------------------------------------------------------

export const SHOP = { x0: -30, y0: 320, w: 210, h: 260 };
export const KETTLE = { x: 140, y: 470 };
export const CHIMNEY = { x: 36, y: 340 };
export const SHOP_WINDOW = { x: 78, y: 474 };

function bakeShop(b: Baker): void {
  b.tex('land_shop', SHOP.w, SHOP.h, (ctx) => {
    ctx.translate(-SHOP.x0, -SHOP.y0);
    const wood = A['shop-wood'];
    softShadow(ctx, 60, 566, 100, 10, 0.2);
    // stilts
    for (const sx of [12, 108]) {
      ctx.beginPath();
      roundRectPath(ctx, sx - 5, 540, 10, 28, 4);
      ctx.fillStyle = mix(P.bark, wood, 0.3);
      ctx.fill();
      ctx.strokeStyle = shade(P.bark, 0.28);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // wall with 4 broad planks
    ctx.beginPath();
    roundRectPath(ctx, -40, 424, 166, 124, [0, 10, 10, 0]);
    ctx.fillStyle = vGrad(ctx, 424, 548, [
      [0, shade(wood, 0.06)],
      [1, wood],
    ]);
    ctx.fill();
    ctx.strokeStyle = shade(wood, 0.3);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = rgba(shade(wood, 0.2), 0.7);
    ctx.lineWidth = 1.6;
    for (const py of [455, 486, 517]) {
      ctx.beginPath();
      ctx.moveTo(-40, py);
      ctx.lineTo(118, py + 1);
      ctx.stroke();
    }
    // corner post
    ctx.beginPath();
    roundRectPath(ctx, 112, 424, 16, 126, 6);
    ctx.fillStyle = tint(wood, 0.2);
    ctx.fill();
    ctx.strokeStyle = shade(wood, 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    // window (glass reads warm at night via a runtime glow)
    ctx.beginPath();
    roundRectPath(ctx, SHOP_WINDOW.x - 18, SHOP_WINDOW.y - 16, 36, 32, 7);
    ctx.fillStyle = mix(P.bark, wood, 0.25);
    ctx.fill();
    ctx.strokeStyle = shade(P.bark, 0.25);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    roundRectPath(ctx, SHOP_WINDOW.x - 13, SHOP_WINDOW.y - 11, 26, 22, 5);
    ctx.fillStyle = vGrad(ctx, SHOP_WINDOW.y - 11, SHOP_WINDOW.y + 11, [
      [0, mix(P.lavender, P.powder, 0.5)],
      [1, mix(P.lavender, P.ink, 0.3)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(P.cream, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(SHOP_WINDOW.x - 8, SHOP_WINDOW.y - 4);
    ctx.lineTo(SHOP_WINDOW.x - 3, SHOP_WINDOW.y - 8);
    ctx.stroke();
    ctx.strokeStyle = mix(P.bark, wood, 0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SHOP_WINDOW.x, SHOP_WINDOW.y - 11);
    ctx.lineTo(SHOP_WINDOW.x, SHOP_WINDOW.y + 11);
    ctx.stroke();
    // chimney (tin pipe) behind the roof
    ctx.beginPath();
    roundRectPath(ctx, CHIMNEY.x - 6, CHIMNEY.y + 8, 12, 60, 3);
    ctx.fillStyle = A.steamer;
    ctx.fill();
    ctx.strokeStyle = shade(A.steamer, 0.3);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    roundRectPath(ctx, CHIMNEY.x - 9, CHIMNEY.y, 18, 9, 3.5);
    ctx.fillStyle = tint(A.steamer, 0.2);
    ctx.fill();
    ctx.stroke();
    // roof: rounded wedge of corrugated tin with 5 lighter stripes
    const roof = (c: Ctx) => {
      c.moveTo(-40, 380);
      c.quadraticCurveTo(60, 398, 142, 420);
      c.quadraticCurveTo(158, 425, 156, 436);
      c.quadraticCurveTo(152, 446, 138, 442);
      c.quadraticCurveTo(60, 424, -40, 412);
      c.closePath();
    };
    withState(ctx, () => {
      ctx.beginPath();
      roof(ctx);
      ctx.fillStyle = vGrad(ctx, 380, 446, [
        [0, tint(A['tin-blue'], 0.1)],
        [1, A['tin-blue']],
      ]);
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = rgba(tint(A['tin-blue'], 0.32), 0.9);
      for (let i = 0; i < 5; i++) {
        const sx = -14 + i * 33;
        ctx.beginPath();
        roundRectPath(ctx, sx, 370, 8, 90, 4);
        ctx.fill();
      }
      ctx.fillStyle = rgba(shade(A['tin-blue'], 0.2), 0.5);
      ctx.fillRect(-40, 432, 200, 20);
    });
    ctx.beginPath();
    roof(ctx);
    ctx.strokeStyle = shade(A['tin-blue'], 0.32);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // eave shadow on the wall
    ctx.fillStyle = vGrad(ctx, 424, 440, [
      [0, P.ink, 0.16],
      [1, P.ink, 0],
    ]);
    ctx.fillRect(-40, 425, 166, 16);
    // dented aluminium kettle sign hanging from the eave
    const k = KETTLE;
    ctx.strokeStyle = shade(P.bark, 0.1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(k.x, 441);
    ctx.lineTo(k.x, k.y - 16);
    ctx.stroke();
    const steel = A.steamer;
    // handle
    ctx.strokeStyle = shade(steel, 0.28);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(k.x, k.y - 6, 9, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // spout
    ctx.beginPath();
    ctx.moveTo(k.x + 9, k.y + 2);
    ctx.quadraticCurveTo(k.x + 16, k.y - 1, k.x + 19, k.y - 8);
    ctx.lineTo(k.x + 22, k.y - 7);
    ctx.quadraticCurveTo(k.x + 19, k.y + 4, k.x + 10, k.y + 8);
    ctx.closePath();
    ctx.fillStyle = steel;
    ctx.fill();
    ctx.strokeStyle = shade(steel, 0.3);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(k.x - 12, k.y + 10);
    ctx.quadraticCurveTo(k.x - 14, k.y - 4, k.x - 6, k.y - 7);
    ctx.lineTo(k.x + 6, k.y - 7);
    ctx.quadraticCurveTo(k.x + 14, k.y - 4, k.x + 12, k.y + 10);
    ctx.quadraticCurveTo(k.x, k.y + 14, k.x - 12, k.y + 10);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, k.y - 7, k.y + 12, [
      [0, tint(steel, 0.35)],
      [1, shade(steel, 0.06)],
    ]);
    ctx.fill();
    ctx.strokeStyle = shade(steel, 0.3);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // the dent
    ctx.strokeStyle = rgba(shade(steel, 0.25), 0.8);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(k.x - 8, k.y + 1);
    ctx.quadraticCurveTo(k.x - 4, k.y + 4, k.x - 1, k.y + 1);
    ctx.stroke();
    ctx.fillStyle = rgba(shade(steel, 0.12), 0.35);
    ctx.beginPath();
    ctx.ellipse(k.x - 4.5, k.y + 3.5, 4, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // lid + knob + shine
    ctx.fillStyle = tint(steel, 0.2);
    ctx.beginPath();
    ctx.ellipse(k.x, k.y - 7, 6.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(k.x, k.y - 10, 2, 0, Math.PI * 2);
    ctx.fillStyle = shade(steel, 0.12);
    ctx.fill();
    ctx.strokeStyle = rgba(P.cream, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(k.x + 6, k.y - 3);
    ctx.quadraticCurveTo(k.x + 9, k.y + 1, k.x + 8, k.y + 6);
    ctx.stroke();
  });
}

export const BAMBOO = { w: 260, h: 340, bx: 130, by: 332 };

function bakeBamboo(b: Baker): void {
  b.tex('land_bamboo', BAMBOO.w, BAMBOO.h, (ctx) => {
    const { bx, by } = BAMBOO;
    const r = artRng(1400);
    softShadow(ctx, bx, by - 2, 50, 7, 0.18);
    const culms = [
      { a: -0.32, h: 300, w: 5.4, c: shade(A.malingo, 0.16) },
      { a: 0.28, h: 290, w: 5.2, c: shade(A.malingo, 0.16) },
      { a: -0.12, h: 316, w: 5.8, c: mix(A.malingo, P.moss, 0.35) },
      { a: 0.1, h: 306, w: 5.6, c: mix(A.malingo, P.moss, 0.25) },
      { a: -0.22, h: 250, w: 5, c: A.malingo },
      { a: 0.2, h: 240, w: 5, c: A.malingo },
      { a: 0.0, h: 270, w: 5.4, c: tint(A.malingo, 0.08) },
    ];
    const tops: [number, number, number][] = [];
    for (const c of culms) {
      const ex = bx + Math.sin(c.a) * c.h * 1.1 + c.a * 60;
      const ey = by - Math.cos(c.a) * c.h;
      const qx = bx + Math.sin(c.a) * c.h * 0.4;
      const qy = by - c.h * 0.6;
      ctx.strokeStyle = c.c;
      ctx.lineCap = 'round';
      ctx.lineWidth = c.w;
      ctx.beginPath();
      ctx.moveTo(bx + c.a * 14, by);
      ctx.quadraticCurveTo(qx, qy, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba(tint(c.c, 0.4), 0.55);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx + c.a * 14 + 1.2, by);
      ctx.quadraticCurveTo(qx + 1.2, qy, ex + 1, ey);
      ctx.stroke();
      // nodes
      for (let u = 0.12; u < 0.95; u += 0.11) {
        const x = (1 - u) * (1 - u) * (bx + c.a * 14) + 2 * (1 - u) * u * qx + u * u * ex;
        const y = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * qy + u * u * ey;
        ctx.strokeStyle = shade(c.c, 0.25);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - c.w * 0.6, y);
        ctx.lineTo(x + c.w * 0.6, y - 0.6);
        ctx.stroke();
        if (u > 0.4 && r() < 0.45) tops.push([x, y, c.a + (r() < 0.5 ? -0.9 : 0.9)]);
      }
      tops.push([ex, ey, c.a]);
    }
    // leaf sprays: slender drooping leaves
    for (const [x, y, a] of tops) {
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const la = a + Math.PI / 2 + (i - n / 2) * 0.38 + (r() - 0.5) * 0.3 + (a > 0 ? -0.9 : 0.9) * 0.4;
        const len = 18 + r() * 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.45, -3.6, len, 0.6);
        ctx.quadraticCurveTo(len * 0.45, 3.2, 0, 0);
        ctx.fillStyle = [A.malingo, mix(A.malingo, P.sage, 0.4), mix(A.malingo, P.moss, 0.4)][i % 3];
        ctx.fill();
        ctx.strokeStyle = rgba(shade(A.malingo, 0.3), 0.6);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
    }
    // base mound
    ctx.beginPath();
    ctx.ellipse(bx, by, 26, 7, 0, Math.PI, 0);
    ctx.fillStyle = mix(P.moss, P.sage, 0.3);
    ctx.fill();
  });
}

export const DOCK = { x0: 2226, y0: 552, w: 310, h: 112 };

function bakeDock(b: Baker): void {
  b.tex('land_dock', DOCK.w, DOCK.h, (ctx) => {
    ctx.translate(-DOCK.x0, -DOCK.y0);
    const wood = A['shop-wood'];
    const post = mix(wood, P.bark, 0.5);
    const deckY = CAMP.dock.y;
    // posts: above water solid, below water fading into the lake
    for (const px of CAMP.dock.posts) {
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, px - 7, deckY - 7, 14, 104, 6);
      ctx.clip();
      ctx.fillStyle = vGrad(ctx, deckY - 7, deckY + 96, [
        [0, post],
        [0.15, post],
        [0.17, mix(post, A['lake-deep'], 0.45)],
        [1, A['lake-deep']],
      ]);
      ctx.fillRect(px - 8, deckY - 8, 16, 106);
      ctx.fillStyle = rgba(tint(post, 0.4), 0.6);
      ctx.fillRect(px + 2, deckY - 7, 3, 22);
      ctx.restore();
      // fade the submerged part to transparent
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = vGrad(ctx, deckY + 20, deckY + 90, [
        [0, '#FFFFFF', 0],
        [1, '#FFFFFF', 1],
      ]);
      ctx.fillRect(px - 9, deckY + 18, 18, 80);
      ctx.restore();
      ctx.strokeStyle = shade(post, 0.3);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px - 7, deckY + 15);
      ctx.lineTo(px - 7, deckY - 2);
      ctx.quadraticCurveTo(px - 7, deckY - 8, px, deckY - 8);
      ctx.quadraticCurveTo(px + 7, deckY - 8, px + 7, deckY - 2);
      ctx.lineTo(px + 7, deckY + 15);
      ctx.stroke();
      // ripple ring where the post meets the water
      ctx.strokeStyle = rgba(P.cream, 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, CAMP.waterY + 1, 12, 2.6, 0, 0, Math.PI);
      ctx.stroke();
    }
    // 5 rounded planks
    const x0 = CAMP.dock.x0;
    const x1 = CAMP.dock.x1;
    const pw = (x1 - x0 - 4 * 3) / 5;
    for (let i = 0; i < 5; i++) {
      const px = x0 + i * (pw + 3);
      softShadow(ctx, px + pw / 2, deckY + 16, pw * 0.5, 3, 0.14);
      ctx.beginPath();
      roundRectPath(ctx, px, deckY - 4, pw, 16, 6);
      ctx.fillStyle = vGrad(ctx, deckY - 4, deckY + 12, [
        [0, tint(wood, 0.3)],
        [0.45, tint(wood, 0.1)],
        [0.5, wood],
        [1, shade(wood, 0.1)],
      ]);
      ctx.fill();
      ctx.strokeStyle = shade(wood, 0.3);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = rgba(shade(wood, 0.18), 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 8, deckY + 1);
      ctx.quadraticCurveTo(px + pw * 0.5, deckY + 2.5, px + pw - 10, deckY + 0.5);
      ctx.stroke();
      for (const nx of [px + 6, px + pw - 6]) {
        ctx.fillStyle = shade(wood, 0.32);
        ctx.beginPath();
        ctx.arc(nx, deckY + 7, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function bakeGroundBands(b: Baker): void {
  bakeGroundStrip(b);
  bakeTrees(b);
  bakeShop(b);
  bakeBamboo(b);
  bakeDock(b);
}
