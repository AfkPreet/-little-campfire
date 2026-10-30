/**
 * The title logo (WORLD 1): "Moonlight" above "Momos" in Baloo 2, cream fill
 * with a 3 px gurans-deep outline and a soft glow bloom; each "o" in "Momos"
 * is a tiny steamed momo (cream circle, 5 pleat strokes in steamer grey, a
 * faint fish-glow halo); a thin crescent moon tucks into the first "M".
 * Namespace "logo_". Fonts are loaded before baking (Boot).
 */
import { Baker, glowDisc, withState, type Ctx } from './kit';
import { A, P, rgba } from '@/palette';

const FONT = (px: number) => `700 ${px}px "Baloo 2", system-ui, sans-serif`;

function momo(ctx: Ctx, cx: number, cy: number, r: number): void {
  glowDisc(ctx, cx, cy, r * 1.9, A['fish-glow'], 0.55);
  // Plump round dumpling, slightly flat bottom, pinched top.
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.02, cy + r * 0.3);
  ctx.bezierCurveTo(cx - r * 1.08, cy - r * 0.55, cx - r * 0.55, cy - r * 0.92, cx, cy - r * 0.9);
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 0.92, cx + r * 1.08, cy - r * 0.55, cx + r * 1.02, cy + r * 0.3);
  ctx.bezierCurveTo(cx + r * 0.9, cy + r * 0.82, cx - r * 0.9, cy + r * 0.82, cx - r * 1.02, cy + r * 0.3);
  ctx.closePath();
  ctx.fillStyle = P.cream;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = A['gurans-deep'];
  ctx.stroke();
  // Pleats: short curved folds swirling into the top knot.
  ctx.strokeStyle = A.steamer;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2;
    const sx = cx + t * r * 0.62;
    const sy = cy - r * 0.42 + Math.abs(t) * r * 0.16;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + r * 0.16, cy - r * 0.72, cx + t * r * 0.1, cy - r * 0.86);
    ctx.stroke();
  }
  // Twisted knot on top.
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.9, r * 0.2, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = P.cream;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = A.steamer;
  ctx.stroke();
  ctx.fillStyle = rgba(P.cream, 0.95);
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.5, cy + r * 0.05, r * 0.2, r * 0.13, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function outlinedText(ctx: Ctx, text: string, x: number, y: number, px: number): void {
  ctx.font = FONT(px);
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  withState(ctx, () => {
    ctx.shadowColor = rgba(P.ink, 0.28);
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.strokeStyle = A['gurans-deep'];
    ctx.lineWidth = px * 0.11;
    ctx.strokeText(text, x, y);
  });
  ctx.fillStyle = P.cream;
  ctx.fillText(text, x, y);
}

export function bake(b: Baker): void {
  const W = 760;
  const H = 330;
  b.tex('logo_main', W, H, (ctx) => {
    // Soft glow bloom behind everything.
    withState(ctx, () => {
      ctx.translate(W / 2, H / 2 + 10);
      ctx.scale(1, 0.45);
      glowDisc(ctx, 0, 0, W * 0.48, P.glow, 0.35);
    });
    // Line 1: "Moonlight".
    const px1 = 104;
    ctx.font = FONT(px1);
    const w1 = ctx.measureText('Moonlight').width;
    const x1 = (W - w1) / 2;
    const y1 = 128;
    outlinedText(ctx, 'Moonlight', x1, y1, px1);
    // Crescent moon tucked into the first "M" (between its peaks).
    withState(ctx, () => {
      ctx.font = FONT(px1);
      const mW = ctx.measureText('M').width;
      const mx = x1 + mW * 0.52;
      const my = y1 - px1 * 0.66;
      glowDisc(ctx, mx, my, 30, A['moon-gurans'], 0.45);
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0.35 * Math.PI, 1.85 * Math.PI, false);
      ctx.bezierCurveTo(mx + 2, my - 10, mx - 6, my + 6, mx + 6.5, my + 12.5);
      ctx.closePath();
      ctx.fillStyle = A['moon-gurans'];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = A['gurans-deep'];
      ctx.stroke();
    });
    // Line 2: "Momos" with momo o's.
    const px2 = 128;
    ctx.font = FONT(px2);
    const parts = ['M', 'o', 'm', 'o', 's'];
    const oW = ctx.measureText('o').width;
    const widths = parts.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b2) => a + b2, 0) + 8;
    let x = (W - total) / 2;
    const y2 = 278;
    parts.forEach((c, i) => {
      if (c === 'o') {
        momo(ctx, x + oW / 2 + 2, y2 - px2 * 0.26, oW * 0.46);
        x += widths[i] + 4;
      } else {
        outlinedText(ctx, c, x, y2, px2);
        x += widths[i];
      }
    });
  });

  // A single momo (used for the loading/title sparkle and the album).
  b.tex('logo_momo', 80, 80, (ctx) => momo(ctx, 40, 44, 26));
}
