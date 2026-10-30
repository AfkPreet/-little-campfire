/**
 * Boju's General Store, interior from the counter (WORLD 3.3; simple shapes,
 * no text anywhere): plank wall, window with a misty view, shelves (jars,
 * wool coils, tea chests, the Momo Steamer under a cloth until clue 3), the
 * hanging dented kettle sign, geraniums in ghee tins, a string of churpi, the
 * counter, a chiya glass. Namespace "shop_".
 */
import { Baker, artRng, ellipsePath, fillOutline, glowDisc, grain, lGrad, roundRectPath, smoothClosed, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

export const SHOP_W = 1600;

export function bake(b: Baker): void {
  // Back wall: broad vertical planks, warm and soft, with a gentle vignette.
  b.strip('shop_wall', SHOP_W, 720, (ctx, w, h) => {
    const wood = A['shop-wood'];
    ctx.fillStyle = vGrad(ctx, 0, h, [
      [0, mix(wood, P.bark, 0.25)],
      [0.5, wood],
      [1, mix(wood, P.bark, 0.35)],
    ]);
    ctx.fillRect(0, 0, w, h);
    const r = artRng(31);
    for (let x = 0; x < w; x += 96) {
      ctx.strokeStyle = rgba(shade(wood, 0.3), 0.35);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (r() - 0.5) * 6, h);
      ctx.stroke();
      ctx.strokeStyle = rgba(P.cream, 0.18);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, 0);
      ctx.lineTo(x + 4, h);
      ctx.stroke();
      // knots
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = rgba(shade(wood, 0.25), 0.3);
        ctx.beginPath();
        ctx.ellipse(x + 30 + r() * 40, 60 + r() * (h - 120), 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Top beam.
    ctx.fillStyle = vGrad(ctx, 0, 56, [
      [0, shade(P.bark, 0.1)],
      [1, P.bark],
    ]);
    ctx.fillRect(0, 0, w, 50);
    ctx.fillStyle = rgba(P.cream, 0.2);
    ctx.fillRect(0, 44, w, 3);
    grain(ctx, 0, 0, w, h, 0.06, 5, 0.25);
  });

  // Window frame (the view behind is separate so it can relight).
  b.tex('shop_windowFrame', 360, 300, (ctx) => {
    const wood = P.bark;
    ctx.beginPath();
    roundRectPath(ctx, 6, 6, 348, 288, 26);
    roundRectPath(ctx, 30, 30, 300, 220, 18);
    ctx.fillStyle = lGrad(ctx, 0, 0, 0, 300, [
      [0, tint(wood, 0.2)],
      [1, shade(wood, 0.1)],
    ]);
    ctx.fill('evenodd');
    ctx.strokeStyle = shade(wood, 0.3);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // mullion
    ctx.beginPath();
    roundRectPath(ctx, 174, 30, 12, 220, 6);
    fillOutline(ctx, wood, wood, 2);
    // ledge
    ctx.beginPath();
    roundRectPath(ctx, 0, 250, 360, 34, 14);
    fillOutline(ctx, lGrad(ctx, 0, 250, 0, 284, [
      [0, tint(wood, 0.35)],
      [1, wood],
    ]), wood, 2.5);
  });

  // The view: white mask layers tinted at runtime (sky, far ridge, dhupi, mist).
  b.tex('shop_viewRidge', 300, 220, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.bezierCurveTo(60, 110, 110, 120, 160, 100);
    ctx.bezierCurveTo(210, 80, 260, 110, 300, 96);
    ctx.lineTo(300, 220);
    ctx.lineTo(0, 220);
    ctx.closePath();
    ctx.fill();
  });
  b.tex('shop_viewTrees', 300, 220, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    const r = artRng(9);
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 34 + r() * 10;
      const hgt = 70 + r() * 50;
      ctx.beginPath();
      ctx.moveTo(x, 220 - hgt);
      ctx.bezierCurveTo(x + 20, 220 - hgt * 0.6, x + 22, 220 - hgt * 0.2, x + 16, 220);
      ctx.lineTo(x - 16, 220);
      ctx.bezierCurveTo(x - 22, 220 - hgt * 0.2, x - 20, 220 - hgt * 0.6, x, 220 - hgt);
      ctx.fill();
    }
  });

  // Shelves with jars, wool coils, tea chests.
  b.tex('shop_shelves', 520, 360, (ctx) => {
    const wood = P.bark;
    const plank = (y: number) => {
      softShadow(ctx, 260, y + 16, 250, 8, 0.15);
      ctx.beginPath();
      roundRectPath(ctx, 10, y, 500, 18, 9);
      fillOutline(ctx, lGrad(ctx, 0, y, 0, y + 18, [
        [0, tint(wood, 0.3)],
        [1, wood],
      ]), wood, 2.5);
    };
    // Top shelf jars (alpha 0.5 glass) with katus, honey, rice.
    const jar = (x: number, fill: string, hgt: number) => {
      ctx.beginPath();
      roundRectPath(ctx, x - 26, 100 - hgt, 52, hgt, 14);
      ctx.fillStyle = rgba(P.cream, 0.45);
      ctx.fill();
      ctx.beginPath();
      roundRectPath(ctx, x - 22, 100 - hgt * 0.62, 44, hgt * 0.62 - 4, 10);
      ctx.fillStyle = rgba(fill, 0.85);
      ctx.fill();
      ctx.beginPath();
      roundRectPath(ctx, x - 26, 100 - hgt, 52, hgt, 14);
      ctx.strokeStyle = rgba(shade(P.cream, 0.35), 0.8);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      roundRectPath(ctx, x - 20, 92 - hgt, 40, 12, 5);
      fillOutline(ctx, P.bark, P.bark, 2);
      ctx.fillStyle = rgba(P.cream, 0.6);
      ctx.beginPath();
      ctx.ellipse(x - 12, 100 - hgt * 0.75, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    jar(70, A.katus, 70);
    jar(150, P.butter, 82);
    jar(230, P.cream, 66);
    jar(320, A.katus, 60);
    jar(400, P.butter, 74);
    plank(100);
    // Middle shelf: wool coils (rose + butter).
    const coil = (x: number, c: string) => {
      ctx.beginPath();
      ellipsePath(ctx, x, 196, 34, 30);
      fillOutline(ctx, c, c, 2.5);
      ctx.strokeStyle = rgba(shade(c, 0.25), 0.55);
      ctx.lineWidth = 2;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.ellipse(x, 196, 30 - Math.abs(k) * 4, 26, k * 0.5, 0, Math.PI);
        ctx.stroke();
      }
    };
    coil(80, P.rose);
    coil(150, P.butter);
    coil(220, A['wool-ball']);
    // tea chest
    ctx.beginPath();
    roundRectPath(ctx, 300, 150, 120, 80, 12);
    fillOutline(ctx, A['shop-wood'], P.bark, 2.5);
    ctx.fillStyle = rgba(P.bark, 0.5);
    ctx.fillRect(300, 162, 120, 6);
    ctx.fillRect(300, 212, 120, 6);
    plank(228);
    // Bottom shelf: tea chests and the steamer spot (cloth/steamer drawn separately).
    ctx.beginPath();
    roundRectPath(ctx, 30, 270, 110, 76, 12);
    fillOutline(ctx, mix(A['shop-wood'], P.bark, 0.2), P.bark, 2.5);
    ctx.beginPath();
    roundRectPath(ctx, 400, 280, 90, 66, 12);
    fillOutline(ctx, A['shop-wood'], P.bark, 2.5);
    plank(344);
  });

  // Cloth covering the steamer (until clue 3).
  b.tex('shop_cloth', 170, 110, (ctx) => {
    ctx.beginPath();
    smoothClosed(ctx, [
      [10, 104],
      [24, 40],
      [70, 10],
      [120, 14],
      [150, 46],
      [162, 104],
      [86, 98],
    ], 0.4);
    fillOutline(ctx, vGrad(ctx, 0, 110, [
      [0, P.rose],
      [1, shade(P.rose, 0.12)],
    ]), P.rose, 2.5);
    ctx.strokeStyle = rgba(P.butter, 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(26, 70);
    ctx.quadraticCurveTo(86, 54, 152, 70);
    ctx.stroke();
  });

  // Hanging dented kettle sign on a chain.
  b.tex('shop_kettleSign', 120, 170, (ctx) => {
    ctx.strokeStyle = shade(A.steamer, 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, 50);
    ctx.stroke();
    const alu = A.steamer;
    ctx.beginPath();
    smoothClosed(ctx, [
      [22, 150],
      [14, 110],
      [34, 72],
      [60, 64],
      [88, 72],
      [106, 110],
      [98, 150],
      [60, 160],
    ]);
    fillOutline(ctx, lGrad(ctx, 10, 60, 110, 160, [
      [0, tint(alu, 0.5)],
      [1, shade(alu, 0.12)],
    ]), alu, 2.5);
    ctx.fillStyle = rgba(P.ink, 0.08);
    ctx.beginPath();
    ctx.ellipse(80, 120, 12, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(alu, 0.3);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(34, 76);
    ctx.bezierCurveTo(34, 40, 86, 40, 86, 76);
    ctx.stroke();
  });

  // Geranium in an old ghee tin.
  b.tex('shop_geranium', 90, 110, (ctx) => {
    ctx.beginPath();
    roundRectPath(ctx, 20, 60, 50, 46, 8);
    fillOutline(ctx, lGrad(ctx, 20, 0, 70, 0, [
      [0, tint(A.steamer, 0.3)],
      [1, shade(A.steamer, 0.1)],
    ]), A.steamer, 2.5);
    ctx.fillStyle = rgba(P.butter, 0.6);
    ctx.fillRect(20, 74, 50, 8);
    for (const [x, y] of [
      [30, 50],
      [58, 46],
      [44, 34],
    ]) {
      ctx.beginPath();
      ellipsePath(ctx, x, y + 8, 16, 11);
      fillOutline(ctx, P.sage, P.moss, 2);
    }
    for (const [x, y] of [
      [36, 26],
      [56, 22],
    ]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ellipsePath(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 5);
        fillOutline(ctx, P.rose, A['gurans-deep'], 1.5);
      }
      ctx.fillStyle = P.butter;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // String of churpi cubes.
  b.tex('shop_churpi', 300, 70, (ctx) => {
    ctx.strokeStyle = A.jute;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.quadraticCurveTo(150, 46, 296, 8);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const x = 4 + t * 292;
      const y = 8 + Math.sin(t * Math.PI) * 19 + 4;
      ctx.beginPath();
      roundRectPath(ctx, x - 11, y, 22, 22, 6);
      fillOutline(ctx, P.cream, A['cream-line'], 2);
    }
  });

  // Counter front (spans the width under Boju).
  b.strip('shop_counter', SHOP_W, 260, (ctx, w, h) => {
    const wood = A['shop-wood'];
    ctx.fillStyle = vGrad(ctx, 0, h, [
      [0, tint(wood, 0.2)],
      [0.12, wood],
      [1, shade(wood, 0.2)],
    ]);
    ctx.beginPath();
    roundRectPath(ctx, -20, 26, w + 40, h, 18);
    ctx.fill();
    ctx.strokeStyle = shade(wood, 0.3);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // counter top
    ctx.beginPath();
    roundRectPath(ctx, -20, 0, w + 40, 34, 16);
    fillOutline(ctx, lGrad(ctx, 0, 0, 0, 34, [
      [0, tint(P.bark, 0.35)],
      [1, P.bark],
    ]), P.bark, 2.5);
    ctx.strokeStyle = rgba(shade(wood, 0.3), 0.35);
    ctx.lineWidth = 3;
    for (let y = 80; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    grain(ctx, 0, 30, w, h - 30, 0.06, 11, 0.2);
  });

  // Little chiya glass (Boju pours into it).
  b.tex('shop_glass', 40, 52, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(34, 4);
    ctx.lineTo(30, 46);
    ctx.quadraticCurveTo(20, 50, 10, 46);
    ctx.closePath();
    ctx.fillStyle = rgba(P.cream, 0.55);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(P.cream, 0.35), 0.9);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, 18);
    ctx.lineTo(31, 18);
    ctx.lineTo(29.5, 44);
    ctx.quadraticCurveTo(20, 47, 10.5, 44);
    ctx.closePath();
    ctx.fillStyle = mix(P.peach, P.bark, 0.25);
    ctx.fill();
  });

  // Warm window glow (night).
  b.tex('shop_glow', 200, 200, (ctx) => glowDisc(ctx, 100, 100, 100, P.glow, 0.8));

  void withState;
}
