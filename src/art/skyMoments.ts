/**
 * Rare-moment sky spectacles (WORLD 7.7 + the 5.4 finale): shooting-star
 * trail, Monsoon Rainbow, Moonbow, cloud curtains, the mist plume column and
 * star glints. White or palette textures, tinted and faded at runtime.
 * Soft shapes are baked at half size and shown at 2x to save memory.
 */
import { Baker, type Ctx, glowDisc, rGrad, sparklePath, vGrad, withState } from './kit';
import { A, P, mix, rgba } from '@/palette';

/** Arc geometry shared with src/world/skyMoments.ts (logical px). */
export const ARC = { R: 470, T: 64, pad: 26 };

function arcTexture(ctx: Ctx, bands: string[], inner: string, innerA: number, peak: number): void {
  const { R, T, pad } = ARC;
  const S = R + T / 2 + pad; // full-size square side; centre at (S, S)
  ctx.scale(0.5, 0.5);
  const r0 = R - T / 2 - 12;
  const r1 = R + T / 2 + 12;
  // Brighter sky inside the bow.
  ctx.fillStyle = rGrad(ctx, S, S, R * 0.35, r0 + 6, [
    [0, inner, 0],
    [0.75, inner, innerA * 0.5],
    [1, inner, innerA],
  ]);
  ctx.beginPath();
  ctx.arc(S, S, r0 + 6, Math.PI, Math.PI * 1.5);
  ctx.lineTo(S, S);
  ctx.closePath();
  ctx.fill();
  // The bands: outer -> inner, each a soft hump of alpha.
  const g = ctx.createRadialGradient(S, S, r0, S, S, r1);
  const n = bands.length;
  g.addColorStop(0, rgba(bands[n - 1], 0));
  for (let i = 0; i < n; i++) {
    const c = bands[n - 1 - i];
    const o = 0.1 + (0.8 * (i + 0.5)) / n;
    const edge = i === 0 || i === n - 1 ? 0.75 : 1;
    g.addColorStop(o, rgba(c, peak * edge));
  }
  g.addColorStop(1, rgba(bands[0], 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S, S, r1, Math.PI, Math.PI * 1.5);
  ctx.arc(S, S, r0, Math.PI * 1.5, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // Feet melt away into the valley mist.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = vGrad(ctx, 0, S, [
    [0, '#FFFFFF', 1],
    [0.42, '#FFFFFF', 1],
    [0.8, '#FFFFFF', 0.35],
    [1, '#FFFFFF', 0],
  ]);
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
}

/** Soft lumpy cloud bank, flat-ish soft bottom (white, tinted at runtime). */
function cloudBank(ctx: Ctx, w: number, h: number, seed: number): void {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const edgeK = Math.min(1, x / (w * 0.25));
    const r = (30 + rnd() * 46) * (0.55 + 0.45 * edgeK);
    const y = h * 0.18 + rnd() * h * 0.42;
    lumps.push([x, y, r]);
  }
  // A dense sheet across the top so the curtain reads as one mass.
  ctx.fillStyle = vGrad(ctx, 0, h, [
    [0, mix(P.cream, P.lavender, 0.45), 0.92],
    [0.4, mix(P.cream, P.lavender, 0.35), 0.8],
    [0.62, mix(P.cream, P.lavender, 0.3), 0.28],
    [0.78, mix(P.cream, P.lavender, 0.3), 0],
  ]);
  ctx.fillRect(0, 0, w, h);
  // Lumps are moon-lit from above: cream crowns turning lavender underneath,
  // so the tinted bank has form instead of reading as a flat sheet.
  const under = mix(P.cream, P.lavender, 0.55);
  for (const [x, y, r] of lumps) {
    ctx.fillStyle = rGrad(
      ctx,
      x,
      y,
      0,
      r,
      [
        [0, P.cream, 0.95],
        [0.55, mix(P.cream, under, 0.5), 0.8],
        [0.85, under, 0.45],
        [1, under, 0],
      ],
      x,
      y - r * 0.45,
    );
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fade the leading (inner) edge so the parting looks soft.
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.78, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

export function bake(b: Baker): void {
  // Shooting-star trail: tapered, bright at the head (right end).
  b.tex('sky_trail', 280, 16, (ctx, w, h) => {
    const cy = h / 2;
    withState(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.quadraticCurveTo(w * 0.6, cy - 2.6, w - 4, cy - 3.2);
      ctx.arc(w - 4, cy, 3.2, -Math.PI / 2, Math.PI / 2);
      ctx.quadraticCurveTo(w * 0.6, cy + 2.6, 0, cy);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.fill();
    });
    // Soft bloom along the trail.
    const g2 = ctx.createLinearGradient(0, 0, w, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(1, 'rgba(255,255,255,0.22)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.ellipse(w * 0.62, cy, w * 0.38, cy - 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Star glint for the Gurans highlight: soft disc + 4 long thin rays.
  b.tex('sky_starGlow', 64, 64, (ctx) => {
    glowDisc(ctx, 32, 32, 18, '#FFFFFF', 0.7);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    sparklePath(ctx, 32, 32, 30);
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    sparklePath(ctx, 32, 32, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 32, 3.4, 0, Math.PI * 2);
    ctx.fill();
  });

  const { R, T, pad } = ARC;
  const S = R + T / 2 + pad;
  // Monsoon Rainbow: muted pastel bands (outer rose -> inner lavender), never saturated.
  b.tex('sky_rainbow', S / 2, S / 2, (ctx) =>
    arcTexture(ctx, [mix(P.rose, P.blush, 0.4), P.peach, P.butter, mix(A['tea-green'], P.sage, 0.4), P.powder, P.lavender], P.cream, 0.14, 0.95),
  );
  // Moonbow: pale milky arc with the faintest warm and cool edges.
  b.tex('sky_moonbow', S / 2, S / 2, (ctx) =>
    arcTexture(
      ctx,
      [mix(A.moonmilk, P.peach, 0.3), mix(A.moonmilk, P.butter, 0.25), A.moonmilk, A['scale-glow'], A['fish-glow'], mix(A['moon-snow'], P.lavender, 0.35)],
      A['moon-snow'],
      0.1,
      0.9,
    ),
  );

  // Cloud curtain (half size, shown at 2x).
  b.tex('sky_curtain', 340, 150, (ctx, w, h) => cloudBank(ctx, w, h, 4242));

  // Mist plume column (half size): narrow foot, billowing crown.
  b.tex('sky_plume', 80, 300, (ctx, w, h) => {
    let s = 99;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < 46; i++) {
      const t = i / 45; // 0 bottom .. 1 top
      const y = h - 6 - t * (h - 30);
      const r = 6 + t * t * 24 + rnd() * 5;
      const x = w / 2 + (rnd() - 0.5) * (4 + t * 16);
      ctx.fillStyle = rGrad(ctx, x, y, 0, r, [
        [0, '#FFFFFF', 0.32 + 0.2 * (1 - t)],
        [0.6, '#FFFFFF', 0.16],
        [1, '#FFFFFF', 0],
      ]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-in';
    // The foot is nearly clear: the column gathers above the breather's head, never over its face.
    ctx.fillStyle = vGrad(ctx, 0, h, [
      [0, '#FFFFFF', 0],
      [0.18, '#FFFFFF', 1],
      [0.64, '#FFFFFF', 1],
      [0.84, '#FFFFFF', 0.18],
      [1, '#FFFFFF', 0],
    ]);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
