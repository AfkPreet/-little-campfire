/**
 * Landscape bakers, back half: sky bits (sun, moon, Milky Way, pillow clouds),
 * the Snow Grannies (F1) with alpenglow mask and rims, the cloud sea tiles (M1),
 * the far ridges (F2) with rims, the cloud spill and the day cloud banner.
 * Drawn in neutral daylight colours; relit at runtime by multiply tint.
 */
import { Baker, Ctx, artRng, glowDisc, rGrad, smoothClosed, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';
import { BAND, BX0, ELDEST, FAR_BACK, FAR_FRONT, PEAKS, PEAK_BASE, Peak, bandW } from './landscape-geo';
import { dir, erase, rimOf, underCurve } from './landscape-util';

const SUN: [number, number] = dir(1, -0.55);
const MOON: [number, number] = dir(-0.92, -0.4);

// ---------------------------------------------------------------------------
// Peak geometry
// ---------------------------------------------------------------------------

interface PeakGeo {
  lx: number;
  rx: number;
  h: number;
  r: number;
  cx: number;
  cy: number;
  a0: number;
  a1: number;
  tl: [number, number];
  tr: [number, number];
  dl: [number, number];
  dr: [number, number];
}

function peakGeo(p: Peak): PeakGeo {
  const dl = dir(-p.sl, 1);
  const dr = dir(p.sr, 1);
  const cos = dl[0] * dr[0] + dl[1] * dr[1];
  const theta = Math.acos(Math.max(-1, Math.min(1, cos)));
  const bis = dir(dl[0] + dr[0], dl[1] + dr[1]);
  // The rounded summit's top sits at p.tip: lift the virtual apex accordingly.
  const k = 0.22;
  let apex = p.tip;
  for (let i = 0; i < 3; i++) {
    const rr = k * (PEAK_BASE - apex);
    apex = p.tip - (rr / Math.sin(theta / 2) - rr) * bis[1];
  }
  const h = PEAK_BASE - apex;
  const r = k * h;
  const t = r / Math.tan(theta / 2);
  const dc = r / Math.sin(theta / 2);
  const cx = p.x + bis[0] * dc;
  const cy = apex + bis[1] * dc;
  const tl: [number, number] = [p.x + dl[0] * t, apex + dl[1] * t];
  const tr: [number, number] = [p.x + dr[0] * t, apex + dr[1] * t];
  return {
    lx: p.x - p.sl * h,
    rx: p.x + p.sr * h,
    h: PEAK_BASE - p.tip,
    r,
    cx,
    cy,
    a0: Math.atan2(tl[1] - cy, tl[0] - cx),
    a1: Math.atan2(tr[1] - cy, tr[0] - cx),
    tl,
    tr,
    dl,
    dr,
  };
}

/** Rounded-triangle peak with slightly flared (concave) feet. */
function peakPath(c: Ctx, p: Peak): void {
  const g = peakGeo(p);
  const flare = 0.16 * g.h;
  const B = PEAK_BASE + 6;
  const s = 0.42 * g.h;
  c.moveTo(g.lx - flare, B);
  c.quadraticCurveTo(g.tl[0] + g.dl[0] * s, g.tl[1] + g.dl[1] * s, g.tl[0], g.tl[1]);
  c.arc(g.cx, g.cy, g.r, g.a0, g.a1 + (g.a1 < g.a0 ? Math.PI * 2 : 0));
  c.quadraticCurveTo(g.tr[0] + g.dr[0] * s, g.tr[1] + g.dr[1] * s, g.rx + flare, B);
  c.closePath();
}

function drawPeak(ctx: Ctx, p: Peak): void {
  const g = peakGeo(p);
  const back = p.back ? 0.2 : 0;
  const lit = mix(tint(A.snow, 0.35), A['cloud-sea'], back);
  const litLow = mix(mix(A.snow, A['snow-shade'], 0.3), A['cloud-sea'], back);
  const sh = mix(A['snow-shade'], A['cloud-sea'], back * 0.8);
  const shTop = mix(sh, A.snow, 0.28);
  const rnd = artRng(p.seed);
  withState(ctx, () => {
    ctx.beginPath();
    peakPath(ctx, p);
    ctx.fillStyle = vGrad(ctx, p.tip, PEAK_BASE, [
      [0, lit],
      [0.55, mix(lit, litLow, 0.5)],
      [1, litLow],
    ]);
    ctx.fill();
    ctx.clip();
    // Shade face: the ridge line runs from the summit down and to the left in a
    // gentle S; everything left of it is the shaded flank.
    const h = g.h;
    const lrun = p.sl * h;
    const s0: [number, number] = [p.x + h * 0.03, p.tip - 6];
    const s1: [number, number] = [p.x - lrun * 0.12, p.tip + h * 0.26];
    const s2: [number, number] = [p.x - lrun * 0.08, p.tip + h * 0.58];
    const s3: [number, number] = [p.x - lrun * 0.34, PEAK_BASE + 8];
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.bezierCurveTo(s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]);
    ctx.lineTo(g.lx - 80, PEAK_BASE + 8);
    ctx.lineTo(g.lx - 80, p.tip - 10);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, p.tip, PEAK_BASE, [
      [0, shTop],
      [0.45, sh],
      [1, mix(sh, A['ridge-far'], 0.16)],
    ]);
    ctx.fill();
    // a soft half-tone just right of the ridge line (rounds the form)
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.bezierCurveTo(s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]);
    ctx.lineTo(s3[0] + h * 0.12, s3[1]);
    ctx.bezierCurveTo(s2[0] + h * 0.1, s2[1], s1[0] + h * 0.07, s1[1], s0[0] + 2, s0[1] + 4);
    ctx.closePath();
    ctx.fillStyle = rgba(mix(lit, sh, 0.5), 0.35);
    ctx.fill();
    // Two soft rounded rock wedges on the shaded face only, lower half: a
    // rounded bean pointing up the slope, snow-dusted by a vertical gradient
    // (no strokes), kept left of the lit/shade S-line.
    const rock = mix(A['ridge-far'], sh, 0.25 + back);
    for (let i = 0; i < 2; i++) {
      const fy = 0.56 + i * 0.2 + rnd() * 0.04;
      const yy = p.tip + h * fy;
      const xx = p.x - lrun * fy * (0.46 + i * 0.22) - 3;
      const ww = 26 + rnd() * 10 - i * 4;
      const hh = 15 + rnd() * 5 - i * 2;
      ctx.beginPath();
      smoothClosed(
        ctx,
        [
          [xx + ww * 0.12, yy - hh * 0.62],
          [xx + ww * 0.36, yy + hh * 0.05],
          [xx + ww * 0.24, yy + hh * 0.48],
          [xx - ww * 0.12, yy + hh * 0.56],
          [xx - ww * 0.46, yy + hh * 0.4],
          [xx - ww * 0.3, yy - hh * 0.04],
        ],
        0.5,
      );
      ctx.fillStyle = vGrad(ctx, yy - hh * 0.62, yy + hh * 0.56, [
        [0, mix(rock, shTop, 0.7), 0.5],
        [0.45, mix(rock, sh, 0.3), 0.7],
        [1, rock, 0.75],
      ]);
      ctx.fill();
    }
  });
  // Soft silhouette edge (darker shade of the snow-shade, never black).
  ctx.save();
  ctx.beginPath();
  peakPath(ctx, p);
  ctx.strokeStyle = rgba(shade(A['snow-shade'], 0.12), p.back ? 0.32 : 0.5);
  ctx.lineWidth = 1.3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function bakeSnow(b: Baker): void {
  const { y0, y1 } = BAND.snow;
  const W = bandW(0.07);
  const H = y1 - y0;
  b.strip('land_snow', W, H, (ctx) => {
    ctx.translate(-BX0, -y0);
    for (const p of PEAKS) drawPeak(ctx, p);
  });
  // Alpenglow / dusk mask: white, top 30% of each peak solid, fading by 62%.
  const gy1 = 292;
  b.strip('land_snowGlow', W, gy1 - y0, (ctx) => {
    ctx.translate(-BX0, -y0);
    for (const p of PEAKS) {
      const g = peakGeo(p);
      erase(ctx, (c) => peakPath(c, p));
      ctx.beginPath();
      peakPath(ctx, p);
      ctx.fillStyle = vGrad(ctx, p.tip, p.tip + g.h * 0.66, [
        [0, '#FFFFFF', 1],
        [0.42, '#FFFFFF', 0.95],
        [1, '#FFFFFF', 0],
      ]);
      ctx.fill();
    }
  });
  // Rims at half resolution: sun side (right) and moon side (top-left).
  const rim = (key: string, l: [number, number]) =>
    b.strip(key, Math.ceil(W / 2), Math.ceil(H / 2), (ctx) => {
      ctx.scale(0.5, 0.5);
      ctx.translate(-BX0, -y0);
      for (const p of PEAKS) {
        erase(ctx, (c) => peakPath(c, p));
        rimOf(ctx, (c) => peakPath(c, p), l[0], l[1], 3.2, 8);
      }
    });
  rim('land_snowRimR', SUN);
  rim('land_snowRimL', MOON);

  // Cloud banner streaming right off the Eldest Granny (soft, white, tinted at runtime).
  b.tex('land_banner', 300, 90, (ctx) => {
    const r = artRng(77);
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = 18 + t * 262;
      const y = 40 + Math.sin(t * 3.2) * 6 + (r() - 0.5) * 6 + t * 10;
      const rx = 30 - t * 14 + r() * 8;
      const ry = 16 - t * 8 + r() * 4;
      withState(ctx, () => {
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        ctx.fillStyle = rGrad(ctx, 0, 0, 0, rx, [
          [0, '#FFFFFF', 0.55 * (1 - t * 0.7)],
          [0.6, '#FFFFFF', 0.28 * (1 - t * 0.7)],
          [1, '#FFFFFF', 0],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Cloud sea tiles (M1): tileable rows of overlapping circles, flat body below.
// ---------------------------------------------------------------------------

export const SEA_TILE = { w: 800, h: 134, base: 104 };

function bakeSea(b: Baker): void {
  const { w: W, h: H, base } = SEA_TILE;
  const row = (key: string, seed: number, topMin: number, topMax: number, back: boolean) =>
    b.tex(key, W, H, (ctx) => {
      const r = artRng(seed);
      const puffs: { x: number; top: number; rr: number }[] = [];
      let x = 0;
      while (x < W) {
        const rr = 40 + r() * 50;
        puffs.push({ x, top: topMin + r() * (topMax - topMin), rr });
        x += rr * (0.75 + r() * 0.5);
      }
      const bodyTop = mix(A['cloud-sea'], P.cream, back ? 0.45 : 0.75);
      const body = back ? mix(A['cloud-sea'], P.lavender, 0.12) : A['cloud-sea'];
      const low = back ? mix(A['cloud-sea'], P.lavender, 0.3) : mix(A['cloud-sea'], P.lavender, 0.2);
      // Flat body under the puffs.
      ctx.fillStyle = vGrad(ctx, base - 30, H, [
        [0, body],
        [1, low],
      ]);
      ctx.fillRect(0, base - 30, W, H - base + 30);
      const drawPuff = (px: number, top: number, rr: number) => {
        const cy = top + rr;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, cy, rr, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = vGrad(ctx, top, top + rr * 1.2, [
          [0, bodyTop],
          [0.35, mix(bodyTop, body, 0.35)],
          [1, body],
        ]);
        ctx.fillRect(px - rr, top, rr * 2, rr * 2);
        // shade crescent low on the left: gives each puff its roundness
        ctx.fillStyle = rgba(P.lavender, back ? 0.12 : 0.1);
        ctx.beginPath();
        ctx.arc(px + rr * 0.25, cy - rr * 0.14, rr, 0, Math.PI * 2);
        ctx.rect(px - rr * 2, top - 4, rr * 4, rr * 3);
        ctx.fill('evenodd');
        ctx.restore();
      };
      for (const p of puffs) {
        for (const off of [-W, 0, W]) {
          const px = p.x + off;
          if (px + p.rr < -2 || px - p.rr > W + 2) continue;
          drawPuff(px, p.top, p.rr);
        }
      }
    });
  row('land_seaA', 41, 40, 66, true);
  row('land_seaB', 42, 62, 86, false);
}

// ---------------------------------------------------------------------------
// F2 far ridges
// ---------------------------------------------------------------------------

/** Ridge silhouette with tiny tree-dome bumps on the crest. */
function ridgeShape(fn: (x: number) => number, x0: number, x1: number, yB: number, seed: number, rMin: number, rMax: number, gap: number): (c: Ctx) => void {
  const r = artRng(seed);
  const bumps: [number, number, number][] = [];
  let x = x0;
  while (x < x1) {
    const rr = rMin + r() * (rMax - rMin);
    if (r() < 0.82) bumps.push([x, fn(x) + rr * 0.45, rr]);
    x += rr * (1.1 + r() * gap);
  }
  return (c: Ctx) => {
    underCurve(c, fn, x0, x1, yB, 3);
    for (const [bx, by, br] of bumps) {
      c.moveTo(bx + br, by);
      c.arc(bx, by, br, 0, Math.PI * 2);
    }
  };
}

const W_FAR = bandW(0.1);
const FAR_X0 = BX0 - 4;
const FAR_X1 = BX0 + W_FAR + 4;
const farBackShape = ridgeShape(FAR_BACK, FAR_X0, FAR_X1, BAND.far.y1 + 4, 501, 3, 6, 1.4);
const farFrontShape = ridgeShape(FAR_FRONT, FAR_X0, FAR_X1, BAND.far.y1 + 4, 502, 4, 8, 0.9);

function bakeFar(b: Baker): void {
  const { y0, y1 } = BAND.far;
  const H = y1 - y0;
  b.strip('land_far', W_FAR, H, (ctx) => {
    ctx.translate(-BX0, -y0);
    const backTop = mix(A['ridge-far'], A['cloud-sea'], 0.36);
    ctx.beginPath();
    farBackShape(ctx);
    ctx.fillStyle = vGrad(ctx, 250, y1, [
      [0, backTop],
      [1, mix(A['ridge-far'], A['cloud-sea'], 0.72)],
    ]);
    ctx.fill();
    // valley haze between the two ridgelines
    ctx.fillStyle = vGrad(ctx, 300, 350, [
      [0, A['cloud-sea'], 0],
      [1, A['cloud-sea'], 0.55],
    ]);
    ctx.fillRect(FAR_X0, 300, FAR_X1 - FAR_X0, 60);
    ctx.beginPath();
    farFrontShape(ctx);
    ctx.fillStyle = vGrad(ctx, 262, y1, [
      [0, A['ridge-far']],
      [0.55, mix(A['ridge-far'], A['cloud-sea'], 0.3)],
      [1, mix(A['ridge-far'], A['cloud-sea'], 0.62)],
    ]);
    ctx.fill();
    // faint forest texture: rows of soft darker dabs following the crest
    withState(ctx, () => {
      ctx.beginPath();
      farFrontShape(ctx);
      ctx.clip();
      const r = artRng(503);
      for (let i = 0; i < 220; i++) {
        const x = FAR_X0 + r() * (FAR_X1 - FAR_X0);
        const yy = FAR_FRONT(x) + 7 + r() * 22;
        ctx.fillStyle = rgba(shade(A['ridge-far'], 0.06), 0.07 + r() * 0.06);
        ctx.beginPath();
        ctx.ellipse(x, yy, 4 + r() * 5, 2 + r() * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });
  const rimH = 344 - y0;
  const rim = (key: string, l: [number, number]) =>
    b.strip(key, Math.ceil(W_FAR / 2), Math.ceil(rimH / 2), (ctx) => {
      ctx.scale(0.5, 0.5);
      ctx.translate(-BX0, -y0);
      rimOf(ctx, farBackShape, l[0], l[1], 2.6, 6);
      erase(ctx, farFrontShape);
      rimOf(ctx, farFrontShape, l[0], l[1], 3, 7);
    });
  rim('land_farRimR', SUN);
  rim('land_farRimL', MOON);

  // Cloud spill tongue: a soft lip at the top flowing down-right.
  b.tex('land_spill', 200, 150, (ctx) => {
    const pts: [number, number, number, number][] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const x = 40 + t * 110 + Math.sin(t * 2.4) * 8;
      const y = 34 + t * t * 92;
      pts.push([x, y, 36 - t * 22, 0.62 - t * 0.38]);
    }
    for (const [x, y, rr, a] of pts) {
      ctx.fillStyle = rGrad(ctx, x, y, 0, rr, [
        [0, '#FFFFFF', a],
        [0.55, '#FFFFFF', a * 0.55],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ---------------------------------------------------------------------------
// Sky bits
// ---------------------------------------------------------------------------

function bakeSky(b: Baker): void {
  // Sun: soft disc (white core, butter edge) — tinted per key.
  b.tex('land_sun', 96, 96, (ctx) => {
    glowDisc(ctx, 48, 48, 48, '#FFFFFF', 0.5, 1.2);
    ctx.fillStyle = rGrad(ctx, 48, 48, 0, 24, [
      [0, '#FFFFFF', 1],
      [0.82, '#FFFFFF', 1],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.arc(48, 48, 24, 0, Math.PI * 2);
    ctx.fill();
  });
  // Moon: cream disc with soft lavender maria, gentle terminator glow.
  b.tex('land_moon', 64, 64, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 28, 26, 0, 26, [
      [0, tint(P.cream, 0.4)],
      [0.8, P.cream],
      [1, mix(P.cream, P.lavender, 0.25)],
    ]);
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, r, a] of [
      [25, 27, 6, 0.16],
      [37, 37, 4.5, 0.13],
      [36, 24, 3, 0.12],
      [27, 39, 2.6, 0.1],
    ]) {
      ctx.fillStyle = rgba(P.lavender, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(mix(P.cream, P.lavender, 0.45), 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.stroke();
  });
  // Milky Way: soft band of dust and tiny stars (white; tinted lavender).
  b.tex('land_milky', 512, 128, (ctx) => {
    const r = artRng(91);
    for (let i = 0; i < 22; i++) {
      const x = 30 + r() * 452;
      const y = 64 + (r() - 0.5) * 24;
      const rx = 40 + r() * 60;
      withState(ctx, () => {
        ctx.translate(x, y);
        ctx.scale(1, 0.36);
        ctx.fillStyle = rGrad(ctx, 0, 0, 0, rx, [
          [0, '#FFFFFF', 0.22],
          [1, '#FFFFFF', 0],
        ]);
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    for (let i = 0; i < 520; i++) {
      const x = r() * 512;
      const fall = Math.abs(x - 256) / 256;
      const y = 64 + (r() + r() + r() - 1.5) * 34 * (1 - fall * 0.3);
      ctx.fillStyle = rgba('#FFFFFF', (0.25 + r() * 0.6) * (1 - fall * 0.6));
      ctx.beginPath();
      ctx.arc(x, y, 0.4 + r() * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Pillow cumulus: unions of 4-6 circles with flat bottoms.
  const clouds: [number, number, number][][] = [
    [
      [52, 58, 26],
      [90, 44, 36],
      [134, 50, 30],
      [168, 62, 22],
      [110, 66, 28],
    ],
    [
      [46, 54, 22],
      [80, 40, 30],
      [118, 46, 26],
      [146, 58, 18],
    ],
    [
      [40, 60, 20],
      [72, 48, 28],
      [110, 38, 34],
      [152, 46, 30],
      [190, 58, 22],
      [130, 64, 24],
    ],
  ];
  clouds.forEach((cs, i) => {
    const w = i === 2 ? 230 : i === 0 ? 200 : 170;
    const base = 74;
    b.tex(`land_cloud${i}`, w, 84, (ctx) => {
      const shape = (c: Ctx, grow: number) => {
        for (const [x, y, r] of cs) {
          c.moveTo(x + r + grow, y);
          c.arc(x, y, r + grow, 0, Math.PI * 2);
        }
      };
      // Flat base with rounded ends at the cloud's real extent: a square cut
      // through the end lobes read as a hard vertical edge.
      const x0 = Math.max(1, Math.min(...cs.map(([x, , r]) => x - r)) - 2);
      const x1 = Math.min(w - 1, Math.max(...cs.map(([x, , r]) => x + r)) + 2);
      const cr = 16;
      withState(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x1, 0);
        ctx.lineTo(x1, base - cr);
        ctx.quadraticCurveTo(x1, base, x1 - cr, base);
        ctx.lineTo(x0 + cr, base);
        ctx.quadraticCurveTo(x0, base, x0, base - cr);
        ctx.closePath();
        ctx.clip();
        // soft outline: the union grown by 1.2 px in a darker shade
        ctx.beginPath();
        shape(ctx, 1.3);
        ctx.fillStyle = rgba(shade(A['cloud-sea'], 0.14), 0.55);
        ctx.fill();
        ctx.beginPath();
        shape(ctx, 0);
        ctx.fillStyle = vGrad(ctx, 8, base, [
          [0, tint(P.cream, 0.55)],
          [0.5, mix(A['cloud-sea'], P.cream, 0.4)],
          [1, mix(A['cloud-sea'], P.lavender, 0.32)],
        ]);
        ctx.fill();
        ctx.clip();
        // pillowy highlights toward the upper right of each lobe
        for (const [x, y, r] of cs) {
          ctx.fillStyle = rGrad(ctx, x + r * 0.2, y - r * 0.35, 0, r * 0.95, [
            [0, tint(P.cream, 0.7), 0.85],
            [0.6, tint(P.cream, 0.7), 0.25],
            [1, P.cream, 0],
          ]);
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // underside shade
        ctx.fillStyle = vGrad(ctx, base - 22, base, [
          [0, P.lavender, 0],
          [1, P.lavender, 0.3],
        ]);
        ctx.fillRect(0, base - 22, w, 22);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Generic soft shapes used by mist and water (white; tinted at runtime).
// ---------------------------------------------------------------------------

function bakeSoft(b: Baker): void {
  b.tex('land_ellipse', 256, 64, (ctx) => {
    withState(ctx, () => {
      ctx.translate(128, 32);
      ctx.scale(1, 0.25);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 128, [
        [0, '#FFFFFF', 1],
        [0.45, '#FFFFFF', 0.72],
        [0.75, '#FFFFFF', 0.3],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, 128, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  // A curling wisp: soft lobes along a rising curl.
  b.tex('land_wisp', 128, 72, (ctx) => {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = 14 + t * 96;
      const y = 54 - Math.sin(t * Math.PI * 0.9) * 26 - t * 6;
      const rr = 14 - t * 6;
      ctx.fillStyle = rGrad(ctx, x, y, 0, rr, [
        [0, '#FFFFFF', 0.5 - t * 0.2],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Rounded dash (sun/moon path, foam, shimmer).
  b.tex('land_dash', 32, 8, (ctx) => {
    ctx.fillStyle = lineGrad(ctx);
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.arc(4, 4, 3, Math.PI / 2, Math.PI * 1.5);
    ctx.lineTo(28, 1);
    ctx.arc(28, 4, 3, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  });
  // Waterfall thread: a soft vertical line with tapered ends.
  b.tex('land_thread', 6, 128, (ctx) => {
    ctx.fillStyle = vGrad(ctx, 0, 128, [
      [0, '#FFFFFF', 0],
      [0.1, '#FFFFFF', 1],
      [0.8, '#FFFFFF', 0.9],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.ellipse(3, 64, 1.6, 64, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function lineGrad(ctx: Ctx): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0.55)');
  return g;
}

export function bakeFarBands(b: Baker): void {
  bakeSky(b);
  bakeSnow(b);
  bakeSea(b);
  bakeFar(b);
  bakeSoft(b);
}

/** Eldest Granny summit (band space) for the cloud banner and dawn sun. */
export const ELDEST_TIP = { x: ELDEST.x, y: ELDEST.tip };
/** Peak geometry for runtime (rim anchors etc.). */
export { peakGeo };
