/**
 * Trip Album art: scrapbook page, washi tape, photo corners and the Sunthala
 * Bend postcard (WORLD 3.1: round orange trees heavy with fruit, one curl of
 * jade river, a small bamboo footbridge, peach light). Namespace "album_".
 */
import { Baker, artRng, ellipsePath, fillOutline, glowDisc, lGrad, roundRectPath, smoothOpen, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

export function bake(b: Baker): void {
  b.tex('album_page', 760, 560, (ctx, w, h) => {
    softShadow(ctx, w / 2, h - 10, w * 0.47, 18, 0.22);
    ctx.beginPath();
    roundRectPath(ctx, 8, 8, w - 16, h - 22, 22);
    fillOutline(ctx, vGrad(ctx, 0, h, [
      [0, mix(A.lokta, P.cream, 0.4)],
      [1, A.lokta],
    ]), mix(A.lokta, P.bark, 0.35), 2.4);
    const r = artRng(77);
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? P.bark : P.cream, 0.04 + r() * 0.05);
      ctx.beginPath();
      ctx.ellipse(16 + r() * (w - 32), 16 + r() * (h - 40), 0.8 + r() * 1.4, 0.5 + r(), r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Washi tape strip (white mask, tinted).
  b.tex('album_tape', 120, 34, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 4);
    for (let x = 4; x <= 116; x += 8) ctx.lineTo(x, x % 16 ? 2 : 6);
    ctx.lineTo(116, 30);
    for (let x = 116; x >= 4; x -= 8) ctx.lineTo(x, x % 16 ? 32 : 28);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  });

  // Photo frame for a day's bloom/catch.
  b.tex('album_photo', 220, 200, (ctx) => {
    softShadow(ctx, 110, 190, 96, 10, 0.18);
    ctx.beginPath();
    roundRectPath(ctx, 6, 6, 208, 184, 10);
    fillOutline(ctx, P.cream, A['cream-line'], 2);
    ctx.beginPath();
    roundRectPath(ctx, 18, 18, 184, 132, 6);
    ctx.fillStyle = mix(A['lake-jade'], P.cream, 0.55);
    ctx.fill();
  });

  // Sunthala Bend postcard.
  b.tex('album_postcard', 560, 360, (ctx, w, h) => {
    softShadow(ctx, w / 2, h - 8, w * 0.46, 14, 0.2);
    ctx.beginPath();
    roundRectPath(ctx, 6, 6, w - 12, h - 18, 16);
    fillOutline(ctx, P.cream, A['cream-line'], 2.4);
    // Picture window (left 62%).
    const px = 22;
    const py = 22;
    const pw = w * 0.6;
    const ph = h - 58;
    withState(ctx, () => {
      ctx.beginPath();
      roundRectPath(ctx, px, py, pw, ph, 12);
      ctx.clip();
      // Peach sky.
      ctx.fillStyle = vGrad(ctx, py, py + ph, [
        [0, mix(P.peach, P.butter, 0.4)],
        [0.55, mix(P.peach, P.cream, 0.35)],
        [1, mix(P.sage, P.butter, 0.35)],
      ]);
      ctx.fillRect(px, py, pw, ph);
      glowDisc(ctx, px + pw * 0.72, py + ph * 0.3, 70, P.glow, 0.7);
      // Far hills.
      ctx.fillStyle = mix(P.sage, P.peach, 0.35);
      ctx.beginPath();
      ctx.moveTo(px, py + ph * 0.55);
      smoothOpen(ctx, [
        [px, py + ph * 0.55],
        [px + pw * 0.3, py + ph * 0.42],
        [px + pw * 0.6, py + ph * 0.5],
        [px + pw, py + ph * 0.4],
      ], true);
      ctx.lineTo(px + pw, py + ph);
      ctx.lineTo(px, py + ph);
      ctx.closePath();
      ctx.fill();
      // Jade river curl.
      ctx.strokeStyle = A['lake-jade'];
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      smoothOpen(ctx, [
        [px + pw * 0.15, py + ph + 10],
        [px + pw * 0.35, py + ph * 0.78],
        [px + pw * 0.62, py + ph * 0.7],
        [px + pw * 0.9, py + ph * 0.62],
      ]);
      ctx.stroke();
      ctx.strokeStyle = rgba(P.cream, 0.6);
      ctx.lineWidth = 3;
      ctx.stroke();
      // Bamboo footbridge silhouette.
      ctx.strokeStyle = shade(A.malingo, 0.25);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.5, py + ph * 0.74);
      ctx.quadraticCurveTo(px + pw * 0.6, py + ph * 0.66, px + pw * 0.7, py + ph * 0.72);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const bx = px + pw * (0.52 + i * 0.055);
        ctx.beginPath();
        ctx.moveTo(bx, py + ph * 0.735 - Math.sin((i / 3) * Math.PI) * 9);
        ctx.lineTo(bx, py + ph * 0.79);
        ctx.stroke();
      }
      // Round orange trees heavy with fruit.
      const r = artRng(5);
      const trees = [
        [0.12, 0.66, 34],
        [0.28, 0.6, 28],
        [0.82, 0.78, 38],
        [0.95, 0.6, 26],
        [0.42, 0.9, 30],
      ];
      for (const [tx, ty, tr] of trees) {
        const cx = px + pw * tx;
        const cy = py + ph * ty;
        ctx.fillStyle = P.bark;
        ctx.fillRect(cx - 3, cy, 6, tr * 0.8);
        ctx.beginPath();
        ellipsePath(ctx, cx, cy, tr, tr * 0.9);
        fillOutline(ctx, lGrad(ctx, cx - tr, cy - tr, cx + tr, cy + tr, [
          [0, tint(P.moss, 0.2)],
          [1, P.moss],
        ]), P.moss, 2);
        for (let k = 0; k < 7; k++) {
          ctx.fillStyle = A.ainselu;
          ctx.beginPath();
          ctx.arc(cx + (r() - 0.5) * tr * 1.4, cy + (r() - 0.5) * tr * 1.2, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    ctx.beginPath();
    roundRectPath(ctx, px, py, pw, ph, 12);
    ctx.strokeStyle = A['cream-line'];
    ctx.lineWidth = 2;
    ctx.stroke();
    // Stamp corner with a gurans.
    const sx = w - 92;
    const sy = 26;
    ctx.beginPath();
    roundRectPath(ctx, sx, sy, 66, 76, 6);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = A['gurans-deep'];
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ellipsePath(ctx, sx + 33 + Math.cos(a) * 11, sy + 38 + Math.sin(a) * 11, 8, 8);
      ctx.fillStyle = A.gurans;
      ctx.fill();
    }
    ctx.fillStyle = P.butter;
    ctx.beginPath();
    ctx.arc(sx + 33, sy + 38, 5, 0, Math.PI * 2);
    ctx.fill();
    // Postmark waves.
    ctx.strokeStyle = rgba(P.ink, 0.25);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx - 70, sy + 30 + i * 12);
      ctx.bezierCurveTo(sx - 50, sy + 22 + i * 12, sx - 30, sy + 38 + i * 12, sx - 8, sy + 30 + i * 12);
      ctx.stroke();
    }
    // Address lines.
    ctx.strokeStyle = rgba(P.ink, 0.15);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.66, 170 + i * 40);
      ctx.lineTo(w - 30, 170 + i * 40);
      ctx.stroke();
    }
  });
}
