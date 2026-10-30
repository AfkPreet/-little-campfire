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
import { dir, litCrescent } from './landscape-util';

const SUN: [number, number] = dir(1, -0.55);

export const GROUND_W = 2400;
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
  // moss cap with a soft scalloped lower edge
  ctx.beginPath();
  ctx.moveTo(x - r * 1.5, y - r * 1.4);
  ctx.lineTo(x + r * 1.5, y - r * 1.4);
  ctx.lineTo(x + r * 1.5, y - r * 0.1);
  const lobes = 4;
  for (let i = 0; i < lobes; i++) {
    const x0 = x + r * 1.5 - (i * r * 3) / lobes;
    const x1 = x + r * 1.5 - ((i + 1) * r * 3) / lobes;
    ctx.quadraticCurveTo((x0 + x1) / 2, y + r * (0.32 + rnd() * 0.16), x1, y - r * (0.02 + rnd() * 0.08));
  }
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, y - r, y + r * 0.3, [
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

/**
 * Clean ground for the props agent's tents, fire, forage spots, decor points,
 * the Bud Bush and the framing trees: no dressing on the walk band there.
 */
const CLEAR: [x: number, hw: number][] = [
  ...CAMP.tentSpots.map((t) => [t.x, 150] as [number, number]),
  [CAMP.fire.x, 84],
  [CAMP.budBush.x, 56],
  ...Object.values(CAMP.forage).map((f) => [f.x, 52] as [number, number]),
  ...CAMP.groundPoints.map((g) => [g.x, 40] as [number, number]),
  ...CAMP.slabs.map((x) => [x, 46] as [number, number]),
  ...CAMP.bamboo.map((x) => [x, 40] as [number, number]),
  [CAMP.twoTree.left, 78],
  [CAMP.twoTree.right, 78],
];

function clearOfProps(x: number, y: number, pad = 0): boolean {
  if (y < 528 || y > 628) return true;
  for (const [cx, hw] of CLEAR) if (Math.abs(x - cx) < hw + pad) return false;
  return true;
}

/** Worn walk path centre line: from the bamboo path to the shore pebbles. */
function wornY(x: number): number {
  return 602 + Math.sin((x - 520) / 230) * 5 + Math.sin((x - 300) / 97) * 2 + Math.max(0, x - 1880) * 0.1;
}

/** Soft scalloped moss patch (low contrast). */
function mossPatch(ctx: Ctx, x: number, y: number, rx: number, ry: number, rnd: () => number, col: string, a: number): void {
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 0.82 + rnd() * 0.3;
    pts.push([x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k]);
  }
  ctx.fillStyle = rgba(col, a);
  ctx.beginPath();
  smoothClosed(ctx, pts, 0.5);
  ctx.fill();
  ctx.fillStyle = rgba(col, a * 0.8);
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.15, y + ry * 0.1, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A little family of 2-4 rounded pebbles with a soft moss shadow. */
function pebbleCluster(ctx: Ctx, x: number, y: number, s: number, rnd: () => number): void {
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const px = x + (i - (n - 1) / 2) * 9 * s + (rnd() - 0.5) * 5 * s;
    const py = y + (rnd() - 0.5) * 4 * s;
    const rx = (3 + rnd() * 4.5) * s * (i === 0 ? 1.25 : 1);
    ctx.fillStyle = rgba(P.moss, 0.3);
    ctx.beginPath();
    ctx.ellipse(px + 1.2, py + rx * 0.42, rx * 1.1, rx * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = [A.pebble, A.stone, mix(A.pebble, A.stone, 0.5)][Math.floor(rnd() * 3)];
    ctx.beginPath();
    ctx.ellipse(px, py, rx, rx * 0.64, (rnd() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(A['stone-shade'], 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = rgba(P.cream, 0.45);
    ctx.beginPath();
    ctx.ellipse(px - rx * 0.25, py - rx * 0.22, rx * 0.42, rx * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Three-leaf clover sprig (tiny, low contrast). */
function clover(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.fillStyle = col;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 1.15;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 2.6 * s, y + Math.sin(a) * 2 * s, 2.4 * s, 1.7 * s, a, 0, Math.PI * 2);
    ctx.fill();
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
      // Worn walk path: a soft, broken, trodden band from the bamboo path
      // past the fire to the shore pebbles (low contrast, never a hard line).
      const nw = fbm(1250, 3);
      for (let x = 470; x < 2060; x += 5) {
        const y = wornY(x);
        const fadeIn = Math.min(1, (x - 470) / 120);
        const fadeOut = x > 1960 ? Math.max(0, 1 - (x - 1960) / 100) : 1;
        const broken = 0.35 + 0.65 * Math.min(1, Math.max(0, (nw(x / 90) - 0.3) * 2.6));
        const a = 0.25 * fadeIn * fadeOut * broken;
        if (a < 0.01) continue;
        ctx.fillStyle = rgba(mix(P.sage, A.pebble, 0.6), a);
        ctx.beginPath();
        ctx.ellipse(x, y, 15, 7.5 + broken * 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // faint scuffed edges along the path
      for (let x = 520; x < 1960; x += 34 + rnd() * 30) {
        const side = rnd() < 0.5 ? -1 : 1;
        ctx.fillStyle = rgba(mix(P.sage, A.pebble, 0.4), 0.1);
        ctx.beginPath();
        ctx.ellipse(x, wornY(x) + side * 11, 9 + rnd() * 8, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Moss patches and sun dapples (soft, low contrast), clear of prop spots.
      const rm = artRng(1251);
      const patches: [number, number, number, number][] = [
        [600, 540, 54, 9],
        [1240, 534, 44, 7],
        [1520, 540, 40, 7],
        [380, 646, 70, 12],
        [720, 660, 84, 13],
        [1010, 648, 60, 10],
        [1380, 664, 92, 13],
        [1650, 650, 64, 11],
        [1890, 650, 58, 10],
        [140, 640, 56, 10],
      ];
      for (const [x, y, rx, ry] of patches) {
        if (!clearOfProps(x, y, rx * 0.5)) continue;
        mossPatch(ctx, x, y, rx, ry, rm, mix(P.moss, P.sage, 0.1), 0.3);
      }
      for (const [x, y, rx] of [
        [900, 634, 120],
        [1560, 626, 110],
        [460, 622, 90],
      ] as [number, number, number][]) {
        ctx.fillStyle = rgba(mix(tint(P.sage, 0.4), P.butter, 0.25), 0.12);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, rx * 0.09, 0, 0, Math.PI * 2);
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
      // Darker rolling grass swell near the bottom: 3 soft stacked layers so
      // the edge stays feathered, then a gradient deepening to the frame edge.
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(GX0, 724);
        for (let x = GX0; x <= GX1; x += 8) ctx.lineTo(x, 650 + k * 7 + Math.sin(x / 210 + k) * 8 + Math.sin(x / 83) * 3);
        ctx.lineTo(GX1, 724);
        ctx.closePath();
        ctx.fillStyle = rgba(P.moss, 0.13);
        ctx.fill();
      }
      ctx.fillStyle = vGrad(ctx, 670, 720, [
        [0, P.moss, 0],
        [1, shade(P.moss, 0.12), 0.4],
      ]);
      ctx.fillRect(GX0, 670, GX1 - GX0, 54);
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
    // Grass tufts in loose little families, and a few tiny flower clusters.
    const r3 = artRng(1207);
    for (let i = 0; i < 26; i++) {
      const cx = GX0 + 40 + r3() * (2000 - GX0);
      const cy = 520 + r3() * 186;
      const n = 2 + Math.floor(r3() * 3);
      for (let k = 0; k < n; k++) {
        const x = cx + (r3() - 0.5) * 40;
        const y = cy + (r3() - 0.5) * 12;
        tuft(ctx, x, y, 0.75 + (y - 500) / 260, rgba(shade(P.moss, 0.04), 0.4 + r3() * 0.2), r3);
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = 560 + r3() * 1400;
      const y = 530 + r3() * 170;
      const col = r3() < 0.6 ? P.cream : A.gurans;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = rgba(col, 0.9);
        ctx.beginPath();
        ctx.arc(x + k * 3.4 - 3.4, y + (k % 2) * 2, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Front dressing: pebble families, fuller tufts and clover, clear of props.
    const r7 = artRng(1260);
    for (const [x, y, sc] of [
      [470, 640, 1],
      [880, 676, 1.15],
      [1196, 640, 0.9],
      [1450, 690, 1.2],
      [1800, 664, 1],
      [2010, 612, 0.9],
      [610, 700, 1.1],
      [1600, 534, 0.8],
    ] as [number, number, number][]) {
      if (clearOfProps(x, y, 12)) pebbleCluster(ctx, x, y, sc, r7);
    }
    for (let i = 0; i < 34; i++) {
      const x = GX0 + 30 + r7() * 1980;
      const y = 626 + r7() * 84;
      if (!clearOfProps(x, y, 10)) continue;
      const n = 2 + Math.floor(r7() * 2);
      for (let k = 0; k < n; k++) {
        tuft(ctx, x + (r7() - 0.5) * 22, y + (r7() - 0.5) * 6, 1.05 + (y - 620) / 160, rgba(mix(P.moss, P.sage, 0.1), 0.5 + r7() * 0.2), r7);
      }
    }
    for (let i = 0; i < 22; i++) {
      const x = GX0 + 40 + r7() * 1960;
      const y = 540 + r7() * 170;
      if (!clearOfProps(x, y, 14)) continue;
      clover(ctx, x, y, 0.9 + (y - 540) / 200, rgba(mix(P.moss, P.sage, 0.45), 0.55));
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

export const TREES = { x0: 1600, y0: 0, w: 600, h: 618 };

/** Tapered limb along a cubic bezier (x0,y0)->(x1,y1) with controls, widths w0 -> w1. */
type Limb = [x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number, w0: number, w1: number];

function limbPts(l: Limb, N = 22): { left: [number, number][]; right: [number, number][] } {
  const [x0, y0, ax, ay, bx, by, x1, y1, w0, w1] = l;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1;
    const y = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1;
    const dx = 3 * u * u * (ax - x0) + 6 * u * t * (bx - ax) + 3 * t * t * (x1 - bx);
    const dy = 3 * u * u * (ay - y0) + 6 * u * t * (by - ay) + 3 * t * t * (y1 - by);
    const l2 = Math.hypot(dx, dy) || 1;
    // gentle swelling at the joints keeps it gnarled, never stiff
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) / 2 + Math.sin(t * Math.PI * 3) * 0.8;
    left.push([x - (dy / l2) * w, y + (dx / l2) * w]);
    right.push([x + (dy / l2) * w, y - (dx / l2) * w]);
  }
  return { left, right };
}

function limbPath(c: Ctx, l: Limb): void {
  const { left, right } = limbPts(l);
  smoothClosed(c, [...left, ...right.reverse()], 0.3);
}

const TREE_DEFS = [
  {
    x: 1840,
    // 3 merged rounded curves: two stout stems leaning apart + the low hammock branch
    limbs: [
      [1832, 606, 1830, 500, 1806, 400, 1768, 246, 66, 26],
      [1848, 606, 1864, 500, 1834, 380, 1848, 220, 56, 22],
      [1840, 524, 1858, 472, 1864, 424, 1900, 370, 30, 10],
    ] as Limb[],
    domes: [
      [1752, 46, 104],
      [1846, 92, 90],
      [1700, 168, 70],
      [1784, 212, 72],
      [1866, 216, 58],
    ] as [number, number, number][],
  },
  {
    x: 1990,
    limbs: [
      [1998, 606, 2004, 500, 2030, 400, 2058, 240, 64, 26],
      [1982, 606, 1966, 500, 1998, 380, 1978, 214, 54, 22],
      [1990, 520, 1974, 468, 1964, 422, 1940, 372, 29, 10],
    ] as Limb[],
    domes: [
      [2046, 40, 106],
      [1950, 96, 88],
      [2112, 160, 74],
      [2024, 206, 70],
      [1946, 214, 56],
    ] as [number, number, number][],
  },
];

/** Soft concave root flare that melts into the grass (no cone, no stump). */
function flarePath(c: Ctx, x: number): void {
  c.moveTo(x - 74, 605);
  c.bezierCurveTo(x - 50, 603, x - 36, 594, x - 33, 552);
  c.lineTo(x + 32, 552);
  c.bezierCurveTo(x + 36, 594, x + 52, 603, x + 78, 605);
  c.quadraticCurveTo(x + 66, 611, x + 44, 609);
  c.quadraticCurveTo(x + 22, 613, x, 610);
  c.quadraticCurveTo(x - 24, 613, x - 46, 609);
  c.quadraticCurveTo(x - 68, 611, x - 74, 605);
  c.closePath();
}

type PartFn = (c: Ctx) => void;

function treeParts(t: (typeof TREE_DEFS)[number]): PartFn[] {
  return [(c: Ctx) => flarePath(c, t.x), ...t.limbs.map((l) => (c: Ctx) => limbPath(c, l))];
}

/** Point on a limb's centre curve. */
function limbAt(l: Limb, t: number): [number, number] {
  const [x0, y0, ax, ay, bx, by, x1, y1] = l;
  const u = 1 - t;
  return [u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1];
}

/**
 * One merged trunk: union outline, a lit rim on the sun side, a soft shaded
 * flank on the left, gentle creases where the curves meet, and bark lines that
 * follow each curve.
 */
function drawTrunk(ctx: Ctx, t: (typeof TREE_DEFS)[number], bark: string): void {
  const parts = treeParts(t);
  const lit = tint(bark, 0.32);
  const line = shade(bark, 0.3);
  // union outline: stroke every part, then fill every part over it
  for (const f of parts) {
    ctx.beginPath();
    f(ctx);
    ctx.strokeStyle = line;
    ctx.lineWidth = 4.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  for (const f of parts) {
    ctx.beginPath();
    f(ctx);
    ctx.fillStyle = lit;
    ctx.fill();
  }
  // body tone everywhere except a 6 px sun rim (union shifted left, clipped per part)
  for (const f of parts) {
    withState(ctx, () => {
      ctx.beginPath();
      f(ctx);
      ctx.clip();
      ctx.translate(-6, 1);
      ctx.fillStyle = vGrad(ctx, 220, 610, [
        [0, shade(bark, 0.06)],
        [0.75, bark],
        [1, mix(bark, P.moss, 0.25)],
      ]);
      for (const g of parts) {
        ctx.beginPath();
        g(ctx);
        ctx.fill();
      }
    });
  }
  // shaded left flank + soft creases where the curves merge
  for (let i = 0; i < parts.length; i++) {
    withState(ctx, () => {
      ctx.beginPath();
      parts[i](ctx);
      ctx.clip();
      ctx.lineCap = 'round';
      for (const l of t.limbs) {
        const { left } = limbPts(l);
        ctx.strokeStyle = rgba(shade(bark, 0.22), 0.22);
        ctx.lineWidth = 12;
        ctx.beginPath();
        left.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    });
  }
  // bark lines following each curve, lower trunk only
  const r = artRng(t.x);
  ctx.lineCap = 'round';
  t.limbs.forEach((l, li) => {
    const n = li === 2 ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const off = (r() - 0.5) * l[8] * 0.5;
      const t0 = 0.08 + r() * 0.3;
      const t1 = t0 + 0.18 + r() * 0.16;
      ctx.strokeStyle = rgba(shade(bark, 0.22), 0.36);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const [x, y] = limbAt(l, t0 + ((t1 - t0) * k) / 8);
        if (k) ctx.lineTo(x + off * (1 - (t0 + ((t1 - t0) * k) / 8) * 0.6), y);
        else ctx.moveTo(x + off, y);
      }
      ctx.stroke();
    }
  });
  // a knot, where the low branch leaves the trunk
  const [kx, ky] = limbAt(t.limbs[1], 0.36);
  ctx.fillStyle = rgba(shade(bark, 0.2), 0.45);
  ctx.beginPath();
  ctx.ellipse(kx - 2, ky, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(lit, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(kx - 2, ky, 6.5, -1.2, 0.5);
  ctx.stroke();
  // tuck the base into the grass: a ground-coloured skirt hides the outline,
  // then a few blades overlap the flare
  ctx.fillStyle = vGrad(ctx, 600, 616, [
    [0, mix(P.sage, P.moss, 0.3), 0],
    [0.35, mix(P.sage, P.moss, 0.3), 1],
    [1, mix(P.sage, P.moss, 0.34), 1],
  ]);
  ctx.beginPath();
  ctx.ellipse(t.x + 2, 612, 92, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const rg = artRng(t.x + 7);
  for (let i = 0; i < 9; i++) {
    const gx = t.x - 70 + i * 17 + (rg() - 0.5) * 8;
    tuft(ctx, gx, 611 + rg() * 3, 0.95, rgba(mix(P.moss, P.sage, 0.2), 0.75), rg);
  }
  // moss cushions on the root flare
  for (const [dx, rx, ry, a] of [
    [-40, 16, 5, -0.12],
    [-8, 12, 4.5, 0],
    [44, 13, 4.5, 0.1],
  ] as [number, number, number, number][]) {
    ctx.fillStyle = vGrad(ctx, 600 - ry, 600 + ry, [
      [0, mix(P.sage, P.butter, 0.15)],
      [1, P.moss],
    ]);
    ctx.beginPath();
    ctx.ellipse(t.x + dx, 602 - Math.abs(dx) * 0.02, rx, ry, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function leafRosette(ctx: Ctx, x: number, y: number, s: number, rnd: () => number, base: string): void {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.12 + (i / (n - 1)) * Math.PI * 0.76 + (rnd() - 0.5) * 0.2;
    const len = (16 + rnd() * 6) * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, 4.4 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? base : mix(base, P.sage, 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(base, 0.3), 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = rgba(tint(base, 0.4), 0.5);
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
    ctx.fillStyle = fy > y + 1 ? mix(A.gurans, A['gurans-deep'], 0.45) : tint(A.gurans, 0.08);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(A['gurans-deep'], 0.12), 0.65);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y - 1, 5 * s, 0, Math.PI * 2);
  ctx.fillStyle = tint(A.gurans, 0.28);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = rgba(P.cream, 0.85);
    ctx.beginPath();
    ctx.arc(x - 4 * s + i * 2.6 * s, y - 4 * s + (i % 2) * 2 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Leafy dome: a circle with soft leaf-tip bumps around its lower rim. */
function domePath(c: Ctx, x: number, y: number, rr: number, rnd: () => number): void {
  c.moveTo(x + rr, y);
  c.arc(x, y, rr, 0, Math.PI * 2);
  const bumps = Math.round(rr / 8);
  for (let i = 0; i < bumps; i++) {
    const a = Math.PI * 0.08 + (i / Math.max(1, bumps - 1)) * Math.PI * 0.84;
    const bx = x + Math.cos(a) * rr * 0.97;
    const by = y + Math.sin(a) * rr * 0.97;
    const br = 7 + rnd() * 5;
    c.moveTo(bx + br, by);
    c.arc(bx, by, br, 0, Math.PI * 2);
  }
}

function bakeTrees(b: Baker): void {
  b.tex('land_trees', TREES.w, TREES.h, (ctx) => {
    ctx.translate(-TREES.x0, -TREES.y0);
    const bark = mix(P.bark, A['shop-wood'], 0.22);
    const leaf = P.moss;
    const leafDeep = shade(P.moss, 0.1);
    for (const t of TREE_DEFS) softShadow(ctx, t.x + 4, 604, 96, 13, 0.2);
    // trunks: 3 merged rounded curves each, with a soft root flare
    for (const t of TREE_DEFS) drawTrunk(ctx, t, bark);
    // leaf tufts at the tips of the low branches (hammock / hang points)
    const r6 = artRng(1320);
    leafRosette(ctx, 1898, 374, 0.95, r6, leaf);
    leafRosette(ctx, 1940, 376, 0.95, r6, leaf);
    // canopy domes, back (top) to front (low)
    const all = TREE_DEFS.flatMap((t) => t.domes);
    all.sort((a, b2) => a[1] - b2[1]);
    const r = artRng(1300);
    // union outline first (grown silhouette), so inner overlaps stay soft
    for (const [x, y, rr] of all) {
      ctx.beginPath();
      domePath(ctx, x, y, rr + 2.2, artRng(Math.floor(x * 7 + y)));
      ctx.fillStyle = shade(leafDeep, 0.28);
      ctx.fill();
    }
    for (const [x, y, rr] of all) {
      const seed = Math.floor(x * 7 + y);
      ctx.beginPath();
      domePath(ctx, x, y, rr, artRng(seed));
      ctx.fillStyle = vGrad(ctx, y - rr, y + rr + 10, [
        [0, mix(leaf, P.sage, 0.2)],
        [0.6, leaf],
        [1, leafDeep],
      ]);
      ctx.fill();
      ctx.strokeStyle = rgba(shade(leafDeep, 0.2), 0.22);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      litCrescent(ctx, x, y, rr - 5, rgba(mix(leaf, P.sage, 0.62), 0.75), SUN[0], SUN[1], 0.12);
      // inner leaf texture: soft lighter leaf strokes on the lit side
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI * (0.02 + r() * 0.75);
        const dd = rr * (0.3 + r() * 0.55);
        const lx = x + Math.cos(a) * dd;
        const ly = y + Math.sin(a) * dd;
        ctx.fillStyle = rgba(tint(P.sage, 0.25), 0.28);
        ctx.beginPath();
        ctx.ellipse(lx, ly, 9, 3, a + 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // hanging leaf rosettes and gurans trusses (<= 8 per tree)
    const r5 = artRng(1310);
    for (const t of TREE_DEFS) {
      const spots: [number, number][] = [];
      for (const [x, y, rr] of t.domes.slice(1)) {
        spots.push([x + rr * 0.5, y + rr * 0.66], [x - rr * 0.5, y + rr * 0.7]);
      }
      spots.slice(0, 7).forEach(([x, y]) => {
        leafRosette(ctx, x, y + 6, 1, r5, leaf);
        gurans(ctx, x, y, 0.95 + r5() * 0.2, r5);
      });
      const [lx, ly, lr] = t.domes[0];
      gurans(ctx, lx + lr * 0.35, ly + lr * 0.25, 0.9, r5);
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
