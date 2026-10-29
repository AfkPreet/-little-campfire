/**
 * Generic FX textures shared by everything: white masks meant to be tinted,
 * glows (used with ADD blend), particles and the vignette.
 * Keys: px, soft, glow, glowSmall, dot, sparkle, star, heart, ring, drop,
 * streak, puff, petal, leafBit, vignette, gradV, gradH, note.
 */
import { Baker, glowDisc, heartPath, rGrad, roundRectPath, sparklePath, starPath, withState } from './kit';
import { P, rgba } from '@/palette';

export function bake(b: Baker): void {
  // 4x4 white for tinted rectangles (sky bands, overlays).
  b.tex('px', 4, 4, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 4, 4);
  });

  // Vertical white->transparent gradient (for haze/mist bands, tinted).
  b.tex('gradV', 8, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
  });
  // Top-opaque fade (white at bottom -> transparent at top).
  b.tex('fadeUp', 8, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
  });

  // Big soft glow (white core, smooth falloff) — tint + ADD blend.
  b.tex('glow', 256, 256, (ctx) => glowDisc(ctx, 128, 128, 128, '#FFFFFF', 1, 1));
  b.tex('glowSmall', 48, 48, (ctx) => glowDisc(ctx, 24, 24, 24, '#FFFFFF', 1, 1));
  // Flat soft disc (for light pools that should not have a hot core).
  b.tex('soft', 128, 128, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 64, 64, 0, 64, [
      [0, '#FFFFFF', 0.9],
      [0.5, '#FFFFFF', 0.55],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
  });

  b.tex('dot', 12, 12, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 6, 6, 0, 6, [
      [0, '#FFFFFF', 1],
      [0.6, '#FFFFFF', 0.9],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.arc(6, 6, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  b.tex('sparkle', 32, 32, (ctx) => {
    glowDisc(ctx, 16, 16, 14, '#FFFFFF', 0.35);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    sparklePath(ctx, 16, 16, 13);
    ctx.fill();
  });

  b.tex('star', 32, 32, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    starPath(ctx, 16, 17, 14);
    ctx.fill();
  });

  b.tex('heart', 32, 32, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    heartPath(ctx, 16, 15, 11);
    ctx.fill();
  });

  b.tex('ring', 64, 64, (ctx) => {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(32, 32, 29, 29, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Rain drop streak (soft, tapered).
  b.tex('streak', 4, 28, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    roundRectPath(ctx, 0.8, 0, 2.4, 28, 1.2);
    ctx.fill();
  });

  b.tex('drop', 10, 14, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(5, 0.5);
    ctx.bezierCurveTo(6, 4, 9.5, 6.5, 9.5, 9);
    ctx.arc(5, 9, 4.5, 0, Math.PI);
    ctx.bezierCurveTo(0.5, 6.5, 4, 4, 5, 0.5);
    ctx.fill();
  });

  // Soft puff (dust, steam, mist blobs).
  b.tex('puff', 64, 64, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 32, 32, 0, 32, [
      [0, '#FFFFFF', 0.85],
      [0.55, '#FFFFFF', 0.45],
      [1, '#FFFFFF', 0],
    ]);
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mist cloud: wide, soft, lumpy (tinted with haze colour).
  b.tex('mistBlob', 512, 128, (ctx) => {
    withState(ctx, () => {
      const lumps = [
        [90, 74, 90, 40],
        [190, 62, 110, 48],
        [300, 70, 120, 44],
        [410, 76, 90, 38],
        [250, 86, 220, 36],
      ];
      for (const [x, y, rx, ry] of lumps) {
        withState(ctx, () => {
          ctx.translate(x, y);
          ctx.scale(1, ry / rx);
          ctx.fillStyle = rGrad(ctx, 0, 0, 0, rx, [
            [0, '#FFFFFF', 0.55],
            [0.6, '#FFFFFF', 0.25],
            [1, '#FFFFFF', 0],
          ]);
          ctx.beginPath();
          ctx.arc(0, 0, rx, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  });

  b.tex('petal', 14, 10, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(7, 5, 6, 3.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  b.tex('leafBit', 16, 10, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(1, 5);
    ctx.quadraticCurveTo(8, -2, 15, 5);
    ctx.quadraticCurveTo(8, 12, 1, 5);
    ctx.fill();
  });

  b.tex('note', 24, 28, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(8, 21, 6, 4.6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13.2, 20);
    ctx.lineTo(13.2, 4);
    ctx.quadraticCurveTo(18, 6, 21, 11);
    ctx.stroke();
  });

  // Vignette: transparent centre, ink edges. Stretched to screen, alpha by key.
  b.tex('vignette', 256, 160, (ctx) => {
    withState(ctx, () => {
      ctx.translate(128, 80);
      ctx.scale(1, 160 / 256);
      ctx.fillStyle = rGrad(ctx, 0, 0, 60, 182, [
        [0, P.ink, 0],
        [0.55, P.ink, 0.25],
        [1, P.ink, 0.85],
      ]);
      ctx.fillRect(-160, -160, 320, 320);
    });
  });

  // Paper card grain swatch (tiled behind cards).
  b.tex('paperGrain', 128, 128, (ctx) => {
    for (let i = 0; i < 380; i++) {
      const x = (i * 73.13) % 128;
      const y = (i * 41.7 + (i % 7) * 13) % 128;
      ctx.fillStyle = rgba(i % 2 ? P.bark : '#FFFFFF', 0.05 + ((i * 17) % 10) / 260);
      ctx.beginPath();
      ctx.ellipse(x, y, 0.8 + (i % 3) * 0.4, 0.6 + (i % 2) * 0.4, i, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
