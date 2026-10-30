/** Fishing bits: bobber (day + night glow), the bite "!" puff, a fish flick silhouette. Namespace "fish_". */
import { Baker, ellipsePath, fillOutline, glowDisc, lGrad, roundRectPath, vGrad, withState } from './kit';
import { A, P, mix } from '@/palette';

export function bake(b: Baker): void {
  b.tex('fish_bobber', 22, 30, (ctx) => {
    // Cream cap, gurans-rose belly (never red), tiny stem.
    ctx.lineCap = 'round';
    ctx.strokeStyle = mix(P.bark, P.ink, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.lineTo(11, 9);
    ctx.stroke();
    ctx.beginPath();
    ellipsePath(ctx, 11, 18, 8.5, 9.5);
    fillOutline(ctx, vGrad(ctx, 8, 28, [
      [0, P.cream],
      [0.48, P.cream],
      [0.52, A.gurans],
      [1, A['gurans-deep']],
    ]), A['gurans-deep'], 2);
    ctx.fillStyle = 'rgba(255,255,255,0.0)';
    withState(ctx, () => {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = P.cream;
      ctx.beginPath();
      ctx.ellipse(8, 14, 2.4, 3.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  b.tex('fish_bobberGlow', 48, 48, (ctx) => glowDisc(ctx, 24, 24, 24, A['fish-glow'], 0.9));

  b.tex('fish_bang', 56, 64, (ctx) => {
    ctx.beginPath();
    roundRectPath(ctx, 6, 4, 44, 48, 22);
    fillOutline(ctx, lGrad(ctx, 0, 4, 0, 52, [
      [0, P.cream],
      [1, mix(P.butter, P.cream, 0.4)],
    ]), P.butter, 2.5);
    // little tail
    ctx.beginPath();
    ctx.moveTo(22, 50);
    ctx.quadraticCurveTo(28, 62, 34, 50);
    ctx.closePath();
    fillOutline(ctx, mix(P.butter, P.cream, 0.4), P.butter, 2.5);
    ctx.fillStyle = mix(P.butter, P.cream, 0.4);
    ctx.fillRect(20, 46, 16, 5);
    // "!"
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    roundRectPath(ctx, 24.5, 12, 7, 22, 3.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 41, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft fish silhouette for the "it slipped away" tail flick.
  b.tex('fish_flick', 60, 30, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(6, 15);
    ctx.bezierCurveTo(10, 4, 34, 2, 44, 13);
    ctx.lineTo(56, 5);
    ctx.quadraticCurveTo(52, 15, 56, 25);
    ctx.lineTo(44, 17);
    ctx.bezierCurveTo(34, 28, 10, 26, 6, 15);
    ctx.closePath();
    ctx.fillStyle = mix(A['lake-deep'], P.ink, 0.25);
    ctx.fill();
  });
}
