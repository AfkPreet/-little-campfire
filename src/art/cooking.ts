/**
 * Cooking close-up art (spec section 5 Cooking; WORLD 6/7.1): the fire seen
 * up close (stone arc, crossed logs, layered flames), the four cookware drawn
 * large (dented chiya kettle, copper kasaudi, iron tawa, momo steamer), a
 * plate, a wooden spoon, bubbles and pot slots. Namespace "cook_".
 */
import { Baker, ellipsePath, fillOutline, glowDisc, lGrad, rGrad, roundRectPath, smoothClosed, softShadow, vGrad, withState } from './kit';
import { A, P, mix, shade, tint } from '@/palette';

export function bake(b: Baker): void {
  // Stone ring, front arc (stones in front of the flames).
  b.tex('cook_stones', 520, 120, (ctx) => {
    const stones = [
      [60, 72, 46, 34],
      [140, 86, 50, 34],
      [226, 94, 52, 32],
      [312, 94, 52, 32],
      [396, 86, 50, 34],
      [470, 72, 44, 34],
    ];
    softShadow(ctx, 260, 100, 250, 18, 0.18);
    stones.forEach(([x, y, rx, ry], i) => {
      ctx.beginPath();
      smoothClosed(ctx, [
        [x - rx, y + ry * 0.2],
        [x - rx * 0.7, y - ry * 0.8],
        [x + rx * 0.1, y - ry],
        [x + rx * 0.8, y - ry * 0.6],
        [x + rx, y + ry * 0.3],
        [x + rx * 0.4, y + ry * 0.9],
        [x - rx * 0.5, y + ry * 0.85],
      ]);
      const c = i % 2 ? A.stone : mix(A.stone, A.pebble, 0.4);
      fillOutline(ctx, vGrad(ctx, y - ry, y + ry, [
        [0, tint(c, 0.25)],
        [1, A['stone-shade']],
      ]), A['stone-shade'], 2.5);
      ctx.fillStyle = 'rgba(246,239,230,0.35)';
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.3, y - ry * 0.45, rx * 0.35, ry * 0.18, -0.2, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Crossed logs with ember-glow ends.
  b.tex('cook_logs', 420, 120, (ctx) => {
    const log = (x1: number, y1: number, x2: number, y2: number) => {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      withState(ctx, () => {
        ctx.translate(x1, y1);
        ctx.rotate(ang);
        ctx.beginPath();
        roundRectPath(ctx, 0, -17, len, 34, 17);
        fillOutline(ctx, lGrad(ctx, 0, -17, 0, 17, [
          [0, tint(P.bark, 0.25)],
          [1, shade(P.bark, 0.15)],
        ]), P.bark, 2.5);
        ctx.strokeStyle = 'rgba(74,66,80,0.18)';
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo((len * i) / 4 - 20, -6);
          ctx.quadraticCurveTo((len * i) / 4, 0, (len * i) / 4 - 22, 7);
          ctx.stroke();
        }
        // glowing end
        ctx.fillStyle = rGrad(ctx, len - 12, 0, 0, 18, [
          [0, P.glow, 1],
          [0.6, P.ember, 0.9],
          [1, P.ember, 0],
        ]);
        ctx.beginPath();
        ctx.ellipse(len - 10, 0, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    log(40, 96, 330, 40);
    log(380, 96, 90, 40);
    log(120, 104, 300, 90);
  });

  // Flame layers (white masks tinted at runtime).
  const flame = (key: string, w: number, h: number, lean: number) =>
    b.tex(key, w, h, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(w / 2 + lean, 4);
      ctx.bezierCurveTo(w * 0.62 + lean, h * 0.3, w * 0.98, h * 0.55, w * 0.86, h * 0.8);
      ctx.bezierCurveTo(w * 0.76, h * 0.98, w * 0.24, h * 0.98, w * 0.14, h * 0.8);
      ctx.bezierCurveTo(w * 0.02, h * 0.55, w * 0.38 + lean, h * 0.3, w / 2 + lean, 4);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 0, h, [
        [0, '#FFFFFF', 0.2],
        [0.35, '#FFFFFF', 0.9],
        [1, '#FFFFFF', 1],
      ]);
      ctx.fill();
    });
  flame('cook_flameA', 200, 260, 6);
  flame('cook_flameB', 150, 200, -10);
  flame('cook_flameC', 90, 130, 4);

  b.tex('cook_fireGlow', 512, 320, (ctx) => {
    withState(ctx, () => {
      ctx.translate(256, 220);
      ctx.scale(1, 0.6);
      glowDisc(ctx, 0, 0, 250, P.glow, 0.9);
    });
  });

  // --- Cookware, large --------------------------------------------------------

  // Dented aluminium chiya kettle.
  b.tex('cook_kettle', 300, 260, (ctx) => {
    softShadow(ctx, 150, 236, 110, 14, 0.2);
    const alu = A.steamer;
    // spout
    ctx.beginPath();
    ctx.moveTo(218, 150);
    ctx.quadraticCurveTo(262, 140, 276, 92);
    ctx.lineTo(290, 96);
    ctx.quadraticCurveTo(280, 160, 228, 186);
    ctx.closePath();
    fillOutline(ctx, lGrad(ctx, 220, 90, 290, 180, [
      [0, tint(alu, 0.4)],
      [1, shade(alu, 0.1)],
    ]), alu, 2.5);
    // body
    ctx.beginPath();
    smoothClosed(ctx, [
      [56, 214],
      [40, 160],
      [70, 104],
      [150, 86],
      [230, 104],
      [258, 160],
      [244, 214],
      [150, 230],
    ]);
    fillOutline(ctx, lGrad(ctx, 40, 90, 260, 230, [
      [0, tint(alu, 0.55)],
      [0.55, alu],
      [1, shade(alu, 0.12)],
    ]), alu, 2.8);
    // dent
    ctx.fillStyle = 'rgba(74,66,80,0.08)';
    ctx.beginPath();
    ctx.ellipse(196, 170, 18, 11, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // shine
    ctx.fillStyle = 'rgba(246,239,230,0.7)';
    ctx.beginPath();
    ctx.ellipse(98, 130, 24, 10, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // lid + knob
    ctx.beginPath();
    ellipsePath(ctx, 150, 92, 66, 14);
    fillOutline(ctx, tint(alu, 0.3), alu, 2.5);
    ctx.beginPath();
    ellipsePath(ctx, 150, 78, 14, 10);
    fillOutline(ctx, P.bark, P.bark, 2.5);
    // handle
    ctx.strokeStyle = shade(alu, 0.3);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(84, 100);
    ctx.bezierCurveTo(84, 20, 216, 20, 216, 100);
    ctx.stroke();
    ctx.strokeStyle = tint(alu, 0.4);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 96);
    ctx.bezierCurveTo(92, 32, 208, 32, 210, 96);
    ctx.stroke();
  });

  // Copper kasaudi: round-bellied pot.
  b.tex('cook_pot', 320, 240, (ctx) => {
    softShadow(ctx, 160, 222, 130, 14, 0.2);
    const cu = A.copper;
    ctx.beginPath();
    smoothClosed(ctx, [
      [40, 120],
      [62, 196],
      [160, 222],
      [258, 196],
      [280, 120],
      [250, 82],
      [70, 82],
    ]);
    fillOutline(ctx, lGrad(ctx, 40, 80, 280, 222, [
      [0, tint(cu, 0.45)],
      [0.55, cu],
      [1, shade(cu, 0.12)],
    ]), A['copper-line'], 2.8);
    // rim
    ctx.beginPath();
    ellipsePath(ctx, 160, 82, 104, 20);
    fillOutline(ctx, tint(cu, 0.35), A['copper-line'], 2.8);
    ctx.beginPath();
    ellipsePath(ctx, 160, 84, 88, 13);
    ctx.fillStyle = shade(cu, 0.35);
    ctx.fill();
    // hammered dots + shine
    ctx.fillStyle = 'rgba(246,239,230,0.25)';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(80 + ((i * 37) % 170), 120 + ((i * 23) % 70), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(246,239,230,0.6)';
    ctx.beginPath();
    ctx.ellipse(96, 126, 22, 9, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // ring handles
    for (const x of [36, 284]) {
      ctx.strokeStyle = A['copper-line'];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, 112, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Iron tawa: flat griddle on a handle (plum-grey, never black).
  b.tex('cook_tawa', 360, 200, (ctx) => {
    softShadow(ctx, 170, 176, 140, 14, 0.2);
    const fe = A['tawa-iron'];
    // handle
    ctx.beginPath();
    roundRectPath(ctx, 268, 112, 84, 18, 9);
    fillOutline(ctx, P.bark, P.bark, 2.5);
    ctx.beginPath();
    ellipsePath(ctx, 160, 130, 132, 36);
    fillOutline(ctx, lGrad(ctx, 30, 96, 290, 170, [
      [0, tint(fe, 0.35)],
      [1, shade(fe, 0.05)],
    ]), fe, 2.8);
    ctx.beginPath();
    ellipsePath(ctx, 160, 124, 116, 26);
    ctx.fillStyle = mix(fe, P.lavender, 0.25);
    ctx.fill();
    ctx.fillStyle = 'rgba(246,239,230,0.3)';
    ctx.beginPath();
    ctx.ellipse(110, 116, 40, 8, -0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Momo steamer: three stacked aluminium tiers + lid.
  b.tex('cook_steamer', 300, 280, (ctx) => {
    softShadow(ctx, 150, 262, 110, 14, 0.2);
    const alu = A.steamer;
    const tierY = [200, 150, 100];
    tierY.forEach((y, i) => {
      ctx.beginPath();
      roundRectPath(ctx, 44 + i * 2, y, 212 - i * 4, 52, 14);
      fillOutline(ctx, lGrad(ctx, 44, y, 256, y + 52, [
        [0, tint(alu, 0.5)],
        [0.5, alu],
        [1, shade(alu, 0.1)],
      ]), alu, 2.6);
      ctx.strokeStyle = 'rgba(74,66,80,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(56, y + 16);
      ctx.lineTo(244, y + 16);
      ctx.stroke();
    });
    // domed lid
    ctx.beginPath();
    ctx.moveTo(52, 104);
    ctx.bezierCurveTo(60, 36, 240, 36, 248, 104);
    ctx.closePath();
    fillOutline(ctx, lGrad(ctx, 52, 40, 248, 104, [
      [0, tint(alu, 0.55)],
      [1, alu],
    ]), alu, 2.6);
    ctx.beginPath();
    ellipsePath(ctx, 150, 46, 18, 10);
    fillOutline(ctx, P.bark, P.bark, 2.5);
    ctx.fillStyle = 'rgba(246,239,230,0.6)';
    ctx.beginPath();
    ctx.ellipse(100, 70, 26, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Plate (lokta-cream with a soft rim).
  b.tex('cook_plate', 240, 90, (ctx) => {
    softShadow(ctx, 120, 66, 104, 14, 0.18);
    ctx.beginPath();
    ellipsePath(ctx, 120, 50, 108, 32);
    fillOutline(ctx, P.cream, A['cream-line'], 2.5);
    ctx.beginPath();
    ellipsePath(ctx, 120, 46, 78, 20);
    ctx.fillStyle = mix(P.cream, A.lokta, 0.6);
    ctx.fill();
    ctx.strokeStyle = mix(A.gurans, P.cream, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(120, 50, 96, 27, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  });

  // Wooden spoon.
  b.tex('cook_spoon', 60, 200, (ctx) => {
    ctx.beginPath();
    roundRectPath(ctx, 24, 10, 12, 150, 6);
    fillOutline(ctx, tint(P.bark, 0.35), P.bark, 2.2);
    ctx.beginPath();
    ellipsePath(ctx, 30, 168, 20, 26);
    fillOutline(ctx, tint(P.bark, 0.3), P.bark, 2.4);
  });

  b.tex('cook_bubble', 24, 24, (ctx) => {
    ctx.beginPath();
    ellipsePath(ctx, 12, 12, 9, 9);
    ctx.fillStyle = 'rgba(246,239,230,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,239,230,0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(9, 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  b.tex('cook_slot', 72, 72, (ctx) => {
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(246,239,230,0.85)';
    ctx.beginPath();
    ctx.arc(36, 36, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(246,239,230,0.12)';
    ctx.fill();
  });

  // Mystery Mush face sticker (drawn on top of the mush icon).
  b.tex('cook_ring', 180, 180, (ctx) => {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(90, 90, 80, 0, Math.PI * 2);
    ctx.stroke();
  });
}
