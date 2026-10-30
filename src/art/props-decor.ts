/**
 * Placed decor (WORLD 7.6, Cozy tab): 11 items, each split into the parts
 * that move. Ground items are anchored at their feet; hang items at the hang
 * point (they hang downward from it). Keys (all prop_dec_*):
 * gtin, gplant, laltin, laltin_flame, laltin_glass, pirka, bunting_line,
 * pennant_0..2, chime_top, chime_tube_0..4, chime_clap, rug, bulb, shelf,
 * hammock_ropes, hammock_shawl, scope, klantern, klantern_star.
 */
import { type Baker, type Ctx, lGrad, rGrad, roundRectPath, smoothClosed, softShadow, starPath, vGrad, withState, glowDisc } from './kit';
import { BUNTING, CHIME, KLANTERN, LALTIN, ptex } from './props-geo';
import { filled } from './props-tents';
import { A, P, mix, rgba, shade, tint } from '@/palette';

type Pt = [number, number];

function line(ctx: Ctx, pts: Pt[], col: string, w: number): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
}

function cord(ctx: Ctx, y0: number, y1: number): void {
  line(ctx, [
    [0, y0],
    [0, y1],
  ], shade(A.jute, 0.25), 2.4);
  line(ctx, [
    [0, y0],
    [0, y1],
  ], A.jute, 1.2);
}

// ---------------------------------------------------------------------------
// 1. Geranium Tin
// ---------------------------------------------------------------------------

function drawGTin(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 20, 4.5, 0.2);
  const body = new Path2D();
  roundRectPath(body, -13, -24, 26, 25, [3, 3, 6, 6]);
  filled(ctx, body, lGrad(ctx, -13, 0, 13, 0, [
    [0, shade(A.steamer, 0.08)],
    [0.35, tint(A.steamer, 0.55)],
    [0.6, A.steamer],
    [1, shade(A.steamer, 0.1)],
  ]), A.steamer, () => {
    ctx.strokeStyle = rgba(shade(A.steamer, 0.2), 0.5);
    ctx.lineWidth = 1.2;
    for (const y of [-18, -6]) {
      ctx.beginPath();
      ctx.moveTo(-13, y);
      ctx.quadraticCurveTo(0, y + 2, 13, y);
      ctx.stroke();
    }
    // Painted rose band and a little dent.
    ctx.fillStyle = rgba(A['tin-rose'], 0.55);
    ctx.fillRect(-14, -15, 28, 6);
    ctx.strokeStyle = rgba(P.cream, 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(5, -4, 3.5, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
  }, 2);
  const rim = new Path2D();
  rim.ellipse(0, -24, 13.5, 3.6, 0, 0, Math.PI * 2);
  filled(ctx, rim, mix(P.bark, P.ink, 0.25), A.steamer, undefined, 2);
}

function geraniumLeaf(ctx: Ctx, x: number, y: number, r: number): void {
  const p = new Path2D();
  const pts: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const k = i % 2 ? 0.86 : 1;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.8 * k]);
  }
  smoothClosed(p, pts, 0.5);
  filled(ctx, p, rGrad(ctx, x - 2, y - 2, 0, r, [
    [0, tint(P.sage, 0.25)],
    [1, P.moss],
  ]), P.moss, () => {
    ctx.strokeStyle = rgba(shade(P.moss, 0.2), 0.45);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, 1.6);
}

function bloom(ctx: Ctx, x: number, y: number, s: number): void {
  const dots: Pt[] = [
    [0, -4.2],
    [-4, -1],
    [4, -1],
    [-2.5, 3.6],
    [2.5, 3.6],
  ];
  ctx.fillStyle = shade(A.gurans, 0.25);
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [dx, dy] of dots) {
    ctx.fillStyle = rGrad(ctx, x + dx * s - 1, y + dy * s - 1, 0, 3.4 * s, [
      [0, tint(A.gurans, 0.35)],
      [1, A.gurans],
    ]);
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, 3.1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba(P.cream, 0.85);
  ctx.beginPath();
  ctx.arc(x - 1.6 * s, y - 2.4 * s, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawGPlant(ctx: Ctx): void {
  ctx.strokeStyle = mix(P.sage, P.moss, 0.5);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.quadraticCurveTo(-8, -18, -6, -34);
  ctx.moveTo(2, -2);
  ctx.quadraticCurveTo(10, -14, 10, -27);
  ctx.stroke();
  geraniumLeaf(ctx, -11, -5, 8.5);
  geraniumLeaf(ctx, 11, -4, 8);
  geraniumLeaf(ctx, -3, -11, 8);
  geraniumLeaf(ctx, 6, -14, 7);
  bloom(ctx, -6, -36, 1.1);
  bloom(ctx, 10, -28, 0.95);
}

// ---------------------------------------------------------------------------
// 2. Little Laltin (hurricane lamp)
// ---------------------------------------------------------------------------

function globePath(): Path2D {
  const p = new Path2D();
  p.ellipse(0, LALTIN.globeY, 10.5, 12, 0, 0, Math.PI * 2);
  return p;
}

function drawLaltin(ctx: Ctx): void {
  cord(ctx, 0, 7);
  // Bail handle.
  ctx.strokeStyle = A['copper-line'];
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-10, 20);
  ctx.quadraticCurveTo(-9, 6, 0, 6.5);
  ctx.quadraticCurveTo(9, 6, 10, 20);
  ctx.stroke();
  // Glass globe.
  const g = globePath();
  ctx.fillStyle = rGrad(ctx, -3, LALTIN.globeY - 4, 0, 13, [
    [0, P.cream, 0.95],
    [0.6, mix(P.cream, P.butter, 0.5), 0.75],
    [1, mix(P.butter, P.peach, 0.4), 0.7],
  ]);
  ctx.fill(g);
  ctx.strokeStyle = rgba(shade(P.butter, 0.25), 0.8);
  ctx.lineWidth = 1.5;
  ctx.stroke(g);
  ctx.fillStyle = rgba(P.cream, 0.9);
  ctx.beginPath();
  ctx.ellipse(-5, LALTIN.globeY - 4, 2, 4.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Guard wires.
  ctx.strokeStyle = A['copper-line'];
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 7, 20);
    ctx.quadraticCurveTo(s * 13, LALTIN.globeY, s * 7, 42);
    ctx.stroke();
  }
  // Cap.
  const cap = new Path2D();
  cap.moveTo(-9, 20);
  cap.quadraticCurveTo(-8, 12, 0, 11.5);
  cap.quadraticCurveTo(8, 12, 9, 20);
  cap.quadraticCurveTo(0, 22, -9, 20);
  cap.closePath();
  filled(ctx, cap, vGrad(ctx, 11, 21, [
    [0, tint(A.copper, 0.35)],
    [1, A.copper],
  ]), A.copper, undefined, 1.8);
  ctx.beginPath();
  ctx.arc(0, 10.5, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = A.copper;
  ctx.fill();
  // Tank.
  const tank = new Path2D();
  roundRectPath(tank, -12.5, 41, 25, 12, [4, 4, 6, 6]);
  filled(ctx, tank, vGrad(ctx, 41, 53, [
    [0, tint(A.copper, 0.35)],
    [1, shade(A.copper, 0.05)],
  ]), A.copper, () => {
    ctx.fillStyle = rgba(P.cream, 0.4);
    ctx.fillRect(-9, 43, 10, 2.2);
  }, 1.8);
  ctx.beginPath();
  ctx.arc(13.5, 45, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = A['copper-line'];
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 3. Pirka Stool
// ---------------------------------------------------------------------------

function drawPirka(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 28, 5, 0.2);
  const wood = A['shop-wood'];
  for (const [x, y0, h, back] of [
    [-11, -15, 13, 1],
    [11, -15, 13, 1],
    [-16, -13, 13, 0],
    [16, -13, 13, 0],
  ] as [number, number, number, number][]) {
    const p = new Path2D();
    roundRectPath(p, x - 3.5, y0, 7, h + (back ? -2 : 0), 3);
    filled(ctx, p, back ? shade(wood, 0.15) : tint(P.bark, 0.3), P.bark, undefined, 1.8);
  }
  const seat = new Path2D();
  roundRectPath(seat, -24, -21, 48, 9, 4.5);
  filled(ctx, seat, vGrad(ctx, -21, -12, [
    [0, tint(wood, 0.2)],
    [1, shade(wood, 0.08)],
  ]), wood, undefined, 2);
  const top = new Path2D();
  top.ellipse(0, -21, 22, 4.6, 0, 0, Math.PI * 2);
  filled(ctx, top, A.jute, shade(A.jute, 0.05), () => {
    ctx.strokeStyle = rgba(shade(A.jute, 0.28), 0.55);
    ctx.lineWidth = 1;
    for (let x = -24; x <= 24; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x - 3, -26);
      ctx.lineTo(x + 3, -16);
      ctx.moveTo(x + 3, -26);
      ctx.lineTo(x - 3, -16);
      ctx.stroke();
    }
  }, 1.8);
}

// ---------------------------------------------------------------------------
// 4. Wool Bunting (triangle pennants, 3 muted colours, one curved line)
// ---------------------------------------------------------------------------

export const PENNANT_COLS = [A['wool-ball'], P.butter, A['tin-mint']];

function drawBuntingLine(ctx: Ctx): void {
  const { half, sag } = BUNTING;
  ctx.strokeStyle = shade(A.jute, 0.25);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.quadraticCurveTo(0, sag * 2, half, 0);
  ctx.stroke();
  ctx.strokeStyle = A.jute;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * half, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = A['wool-ball'];
    ctx.fill();
    ctx.strokeStyle = shade(A['wool-ball'], 0.3);
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
}

function drawPennant(ctx: Ctx, col: string): void {
  const p = new Path2D();
  smoothClosed(p, [
    [-8.5, 0],
    [0, -0.5],
    [8.5, 0],
    [5, 8],
    [0.6, 18],
    [-0.6, 18],
    [-5, 8],
  ], 0.35);
  filled(ctx, p, vGrad(ctx, 0, 18, [
    [0, tint(col, 0.2)],
    [1, col],
  ]), col, () => {
    // Knit V stitches.
    ctx.strokeStyle = rgba(shade(col, 0.18), 0.45);
    ctx.lineWidth = 0.9;
    for (let row = 0; row < 5; row++) {
      const y = 3 + row * 3.2;
      for (let x = -7; x <= 7; x += 3) {
        ctx.beginPath();
        ctx.moveTo(x - 1.2, y - 1);
        ctx.lineTo(x, y + 0.8);
        ctx.lineTo(x + 1.2, y - 1);
        ctx.stroke();
      }
    }
  }, 1.6);
  // Fold over the string.
  ctx.fillStyle = shade(col, 0.1);
  ctx.beginPath();
  roundRectPath(ctx, -8.5, -2.5, 17, 4, 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 5. Bamboo Chime
// ---------------------------------------------------------------------------

function drawChimeTop(ctx: Ctx): void {
  cord(ctx, 0, CHIME.discY - 2);
  const d = new Path2D();
  d.ellipse(0, CHIME.discY + 1.5, 16, 5, 0, 0, Math.PI * 2);
  filled(ctx, d, shade(P.bark, 0.05), P.bark, undefined, 1.8);
  const t = new Path2D();
  t.ellipse(0, CHIME.discY, 16, 4.5, 0, 0, Math.PI * 2);
  filled(ctx, t, tint(P.bark, 0.35), P.bark, () => {
    ctx.strokeStyle = rgba(shade(P.bark, 0.2), 0.45);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, CHIME.discY, 9, 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, 1.6);
}

function drawTube(ctx: Ctx, len: number): void {
  line(ctx, [
    [0, 0],
    [0, 7],
  ], shade(A.jute, 0.2), 1.1);
  const p = new Path2D();
  roundRectPath(p, -3.4, 6, 6.8, len, 3);
  filled(ctx, p, lGrad(ctx, -3.4, 0, 3.4, 0, [
    [0, shade(A.malingo, 0.08)],
    [0.4, tint(A.malingo, 0.45)],
    [1, A.malingo],
  ]), A.malingo, () => {
    ctx.strokeStyle = rgba(shade(A.malingo, 0.3), 0.75);
    ctx.lineWidth = 1.3;
    for (const k of [0.38, 0.78]) {
      ctx.beginPath();
      ctx.moveTo(-4, 6 + len * k);
      ctx.lineTo(4, 6 + len * k);
      ctx.stroke();
    }
  }, 1.6);
  ctx.fillStyle = tint(A.malingo, 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 7, 2.4, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawClapper(ctx: Ctx): void {
  line(ctx, [
    [0, 0],
    [0, 34],
  ], shade(A.jute, 0.2), 1.1);
  const c = new Path2D();
  c.ellipse(0, 22, 5, 3, 0, 0, Math.PI * 2);
  filled(ctx, c, tint(P.bark, 0.3), P.bark, undefined, 1.5);
  // Wind catcher: a small round wooden tag with a painted gurans dot.
  const tag = new Path2D();
  roundRectPath(tag, -6.5, 33, 13, 15, 6.5);
  filled(ctx, tag, vGrad(ctx, 33, 48, [
    [0, tint(A['shop-wood'], 0.3)],
    [1, A['shop-wood']],
  ]), A['shop-wood'], undefined, 1.5);
  ctx.fillStyle = A.gurans;
  ctx.beginPath();
  ctx.arc(0, 40.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 6. Radi Rug
// ---------------------------------------------------------------------------

function rugPath(): Path2D {
  const p = new Path2D();
  smoothClosed(p, [
    [-50, -9],
    [0, -10],
    [50, -9],
    [57, 7],
    [0, 9],
    [-57, 7],
  ], 0.18);
  return p;
}

function drawRug(ctx: Ctx): void {
  softShadow(ctx, 0, 6, 64, 7, 0.16);
  // Thickness edge.
  withState(ctx, () => {
    ctx.translate(0, 3);
    ctx.fillStyle = shade(A['wool-ball'], 0.22);
    ctx.fill(rugPath());
  });
  const p = rugPath();
  const bands = [A['wool-ball'], P.cream, P.butter, A['tin-blue'], P.cream, A['wool-ball'], P.lavender, P.cream, P.butter, A['wool-ball']];
  filled(ctx, p, A['wool-ball'], A['wool-ball'], () => {
    const n = bands.length;
    for (let i = 0; i < n; i++) {
      const x0 = -58 + (116 * i) / n;
      const x1 = -58 + (116 * (i + 1)) / n;
      ctx.fillStyle = bands[i];
      ctx.beginPath();
      ctx.moveTo(x0 + 1.2, -12);
      ctx.lineTo(x1 + 1.2, -12);
      ctx.lineTo(x1 - 1.2, 12);
      ctx.lineTo(x0 - 1.2, 12);
      ctx.fill();
      // Weave ticks.
      ctx.strokeStyle = rgba(shade(bands[i], 0.2), 0.5);
      ctx.lineWidth = 0.9;
      for (let y = -7; y < 8; y += 3.4) {
        ctx.beginPath();
        ctx.moveTo(x0 + 2, y);
        ctx.lineTo(x0 + 4.5, y + 1);
        ctx.moveTo(x0 + 6, y + 1.6);
        ctx.lineTo(x0 + 8.5, y + 2.6);
        ctx.stroke();
      }
    }
    ctx.fillStyle = rgba(P.cream, 0.25);
    ctx.fillRect(-60, -11, 120, 3);
  }, 2);
  // Fringe tassels.
  ctx.strokeStyle = A['cream-line'];
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const ex = s * (51 + 6 * t);
      const ey = -8 + 15 * t;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + s * 6, ey + 1);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Junkiri Lights bulb (glass teardrop on a little cap)
// ---------------------------------------------------------------------------

function drawBulb(ctx: Ctx): void {
  const cap = new Path2D();
  roundRectPath(cap, -2.6, 0, 5.2, 4.5, 1.6);
  filled(ctx, cap, mix(A['tawa-iron'], P.cream, 0.3), A['tawa-iron'], undefined, 1.1);
  const g = new Path2D();
  g.moveTo(0, 4);
  g.bezierCurveTo(4.6, 5, 5, 11, 0, 13.5);
  g.bezierCurveTo(-5, 11, -4.6, 5, 0, 4);
  g.closePath();
  filled(ctx, g, rGrad(ctx, -1, 8, 0, 6, [
    [0, P.cream],
    [1, mix(P.cream, P.butter, 0.6)],
  ]), P.butter, undefined, 1.2);
  ctx.fillStyle = rgba(P.cream, 0.95);
  ctx.beginPath();
  ctx.ellipse(-1.5, 7.5, 1, 1.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 8. Tea-Chest Shelf
// ---------------------------------------------------------------------------

function book(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, lean = 0): void {
  withState(ctx, () => {
    ctx.translate(x + w / 2, y);
    ctx.rotate(lean);
    const p = new Path2D();
    roundRectPath(p, -w / 2, -h, w, h, 1.6);
    filled(ctx, p, lGrad(ctx, -w / 2, 0, w / 2, 0, [
      [0, tint(col, 0.25)],
      [1, col],
    ]), col, () => {
      ctx.fillStyle = rgba(P.cream, 0.65);
      ctx.fillRect(-w / 2, -h + 3, w, 1.4);
      ctx.fillRect(-w / 2, -5, w, 1.2);
    }, 1.3);
  });
}

function drawShelf(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 38, 6, 0.2);
  const wood = A['shop-wood'];
  const box = new Path2D();
  roundRectPath(box, -29, -58, 58, 58, 6);
  filled(ctx, box, vGrad(ctx, -58, 0, [
    [0, tint(wood, 0.2)],
    [1, wood],
  ]), wood, undefined, 2.2);
  const inner = new Path2D();
  roundRectPath(inner, -23, -52, 46, 46, 4);
  const dark = mix(P.bark, P.ink, 0.3);
  ctx.fillStyle = vGrad(ctx, -52, -6, [
    [0, shade(dark, 0.1)],
    [1, mix(dark, P.bark, 0.3)],
  ]);
  ctx.fill(inner);
  withState(ctx, () => {
    ctx.clip(inner);
    // Shelf board.
    ctx.fillStyle = shade(wood, 0.05);
    ctx.fillRect(-24, -31, 48, 4);
    ctx.fillStyle = rgba(P.cream, 0.25);
    ctx.fillRect(-24, -31, 48, 1);
    // Books, lower shelf.
    const low: [number, number, string, number][] = [
      [5, 19, A['tin-blue'], 0],
      [6, 17, A['wool-ball'], 0],
      [5, 20, P.butter, 0],
      [6, 16, P.sage, 0],
      [5, 18, P.lavender, 0.22],
    ];
    let x = -21;
    for (const [w, h, c, lean] of low) {
      book(ctx, x, -6, w, h, c, lean);
      x += w + 1;
    }
    // Upper shelf: three books and a jam jar.
    const up: [number, number, string][] = [
      [5, 17, A['tin-mint']],
      [6, 15, A.copper],
      [5, 18, A['tin-rose']],
    ];
    x = -21;
    for (const [w, h, c] of up) {
      book(ctx, x, -31, w, h, c);
      x += w + 1;
    }
    const jar = new Path2D();
    roundRectPath(jar, 6, -44, 11, 13, 3);
    ctx.fillStyle = rgba(P.cream, 0.6);
    ctx.fill(jar);
    ctx.fillStyle = A.ainselu;
    for (const [jx, jy] of [
      [9, -36],
      [13, -38],
      [11, -34],
      [14, -34],
    ] as Pt[]) {
      ctx.beginPath();
      ctx.arc(jx, jy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = A['wool-ball'];
    ctx.fillRect(5.5, -46, 12, 3);
  });
  // Bark edge strips framing the opening.
  ctx.strokeStyle = tint(P.bark, 0.15);
  ctx.lineWidth = 4;
  ctx.stroke(inner);
  ctx.strokeStyle = shade(P.bark, 0.2);
  ctx.lineWidth = 1.2;
  ctx.stroke(inner);
  // On top: two books lying and a little chiya glass.
  const b1 = new Path2D();
  roundRectPath(b1, -22, -64, 26, 6, 2);
  filled(ctx, b1, A['wool-ball'], A['wool-ball'], undefined, 1.4);
  const b2 = new Path2D();
  roundRectPath(b2, -19, -69, 21, 5, 2);
  filled(ctx, b2, A['tin-blue'], A['tin-blue'], undefined, 1.4);
  const glass = new Path2D();
  glass.moveTo(9, -71);
  glass.lineTo(19, -71);
  glass.lineTo(18, -58.5);
  glass.quadraticCurveTo(14, -57.5, 10, -58.5);
  glass.closePath();
  ctx.fillStyle = rgba(P.cream, 0.7);
  ctx.fill(glass);
  ctx.fillStyle = rgba(mix(A.copper, P.cream, 0.4), 0.9);
  ctx.fillRect(10, -66, 8, 7);
  ctx.strokeStyle = rgba(A['cream-line'], 0.9);
  ctx.lineWidth = 1.2;
  ctx.stroke(glass);
}

// ---------------------------------------------------------------------------
// 9. Shawl Hammock (between the two old rhododendron trunks)
// ---------------------------------------------------------------------------

const HM = 75;

function drawHammockRopes(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    // Wrap around the trunk (front arcs).
    for (const dy of [-2, 3]) {
      ctx.strokeStyle = shade(A.jute, 0.25);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(s * HM, dy, 15, 4.5, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.strokeStyle = A.jute;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    // Ropes fanning to the shawl end.
    for (const k of [-1, 0, 1]) {
      ctx.strokeStyle = shade(A.jute, 0.25);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(s * (HM - 4), 4);
      ctx.quadraticCurveTo(s * (HM - 9), 9 + k * 2, s * 58, 13 + k * 3);
      ctx.stroke();
      ctx.strokeStyle = A.jute;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(s * (HM - 4), 4, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = A.jute;
    ctx.fill();
    ctx.strokeStyle = shade(A.jute, 0.3);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function shawlPath(): Path2D {
  const p = new Path2D();
  p.moveTo(-60, 10);
  p.quadraticCurveTo(0, 38, 60, 10);
  p.quadraticCurveTo(64, 14, 60, 18);
  p.quadraticCurveTo(0, 66, -60, 18);
  p.quadraticCurveTo(-64, 14, -60, 10);
  p.closePath();
  return p;
}

function drawShawl(ctx: Ctx): void {
  const base = A['wool-ball'];
  const p = shawlPath();
  // Inside of the hammock (the far edge) first, a touch darker.
  const back = new Path2D();
  back.moveTo(-60, 10);
  back.quadraticCurveTo(0, 24, 60, 10);
  back.quadraticCurveTo(0, 40, -60, 10);
  back.closePath();
  filled(ctx, back, shade(base, 0.12), base, undefined, 1.8);
  filled(ctx, p, vGrad(ctx, 10, 50, [
    [0, tint(base, 0.25)],
    [1, base],
  ]), base, () => {
    // Border stripes following the lower edge.
    for (const [off, col, w] of [
      [-5, P.lavender, 4],
      [-11, P.butter, 3],
      [-16, P.cream, 1.6],
    ] as [number, string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(-62, 18 + off * 0.3);
      ctx.quadraticCurveTo(0, 66 + off, 62, 18 + off * 0.3);
      ctx.stroke();
    }
    // Little knitted dots.
    ctx.fillStyle = rgba(P.cream, 0.7);
    for (let i = -4; i <= 4; i++) {
      const x = i * 11;
      const y = 24 + 18 * (1 - (x / 60) * (x / 60));
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 2);
  // Fringe tassels along the bottom edge.
  ctx.strokeStyle = A['cream-line'];
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = -9; i <= 9; i++) {
    const t = i / 9.6;
    const x = t * 58;
    const y = 18 + 24 * (1 - t * t);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + t * 1.5, y + 5.5);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// 10. Brass Star-Scope
// ---------------------------------------------------------------------------

const SCOPE_A = -0.62;

function drawScope(ctx: Ctx): void {
  softShadow(ctx, 0, 1, 28, 5, 0.2);
  const apex: Pt = [0, -42];
  const leg = (x: number, y: number, col: string): void => {
    line(ctx, [apex, [x, y]], shade(P.bark, 0.25), 6);
    line(ctx, [apex, [x, y]], col, 3.6);
  };
  leg(3, -3, shade(P.bark, 0.05));
  leg(-22, 0, tint(P.bark, 0.25));
  leg(21, 0, tint(P.bark, 0.25));
  const mount = new Path2D();
  roundRectPath(mount, -6, -48, 12, 9, 3);
  filled(ctx, mount, shade(A.bell, 0.1), A.bell, undefined, 1.8);
  withState(ctx, () => {
    ctx.translate(0, -46);
    ctx.rotate(SCOPE_A);
    // Eyepiece.
    const ep = new Path2D();
    roundRectPath(ep, -28, -3, 9, 6, 2);
    filled(ctx, ep, shade(A.bell, 0.12), A.bell, undefined, 1.6);
    // Tube (tapering).
    const tube = new Path2D();
    tube.moveTo(-20, -4.6);
    tube.lineTo(26, -6.2);
    tube.lineTo(26, 6.2);
    tube.lineTo(-20, 4.6);
    tube.quadraticCurveTo(-22, 0, -20, -4.6);
    tube.closePath();
    filled(ctx, tube, vGrad(ctx, -6.2, 6.2, [
      [0, tint(A.bell, 0.5)],
      [0.45, A.bell],
      [1, shade(A.bell, 0.12)],
    ]), A.bell, () => {
      ctx.strokeStyle = rgba(shade(A.bell, 0.3), 0.7);
      ctx.lineWidth = 2;
      for (const x of [-6, 12]) {
        ctx.beginPath();
        ctx.moveTo(x, -8);
        ctx.lineTo(x, 8);
        ctx.stroke();
      }
    }, 2);
    // Objective cap.
    const cap = new Path2D();
    roundRectPath(cap, 24, -7.6, 8, 15.2, 3);
    filled(ctx, cap, shade(A.bell, 0.05), A.bell, undefined, 1.8);
    ctx.fillStyle = rgba(P.cream, 0.85);
    ctx.beginPath();
    ctx.ellipse(32, -2, 1.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// 11. Kuhiro's Lantern: its own scale, with one of its stars inside.
// ---------------------------------------------------------------------------

function kScalePath(): Path2D {
  const p = new Path2D();
  const s = 1.45;
  const pts: Pt[] = [
    [-12, -16],
    [0, -19],
    [12, -16],
    [12.5, -9],
    [8, -2.5],
    [0, -0.5],
    [-8, -2.5],
    [-12.5, -9],
  ];
  smoothClosed(p, pts.map(([x, y]) => [x * s, 14 + (y + 19) * s] as Pt), 0.55);
  return p;
}

function drawKLantern(ctx: Ctx): void {
  cord(ctx, 0, 9);
  const body = kScalePath();
  ctx.fillStyle = vGrad(ctx, 14, 42, [
    [0, A.moonmilk, 0.95],
    [1, A['fish-glow'], 0.9],
  ]);
  ctx.fill(body);
  withState(ctx, () => {
    ctx.clip(body);
    ctx.strokeStyle = rgba(A['fish-glow-edge'], 0.85);
    ctx.lineWidth = 1.3;
    for (const k of [0.66, 0.36]) {
      ctx.beginPath();
      ctx.ellipse(0, 14, 18 * k + 5, 24 * k + 3, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(P.cream, 0.9);
    ctx.beginPath();
    ctx.ellipse(-8, 19, 3.6, 1.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = shade(A['fish-glow-edge'], 0.2);
  ctx.lineWidth = 1.8;
  ctx.stroke(body);
  ctx.strokeStyle = A['scale-glow'];
  ctx.lineWidth = 0.9;
  ctx.stroke(body);
  // Cap.
  const cap = new Path2D();
  cap.moveTo(-9, 14.5);
  cap.quadraticCurveTo(-8, 8, 0, 7.5);
  cap.quadraticCurveTo(8, 8, 9, 14.5);
  cap.quadraticCurveTo(0, 16, -9, 14.5);
  cap.closePath();
  filled(ctx, cap, vGrad(ctx, 7, 16, [
    [0, tint(A.bell, 0.4)],
    [1, A.bell],
  ]), A.bell, undefined, 1.6);
  ctx.beginPath();
  ctx.arc(0, KLANTERN.h - 3, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = A['fish-glow-edge'];
  ctx.fill();
}

function drawKStar(ctx: Ctx): void {
  glowDisc(ctx, 0, 0, 12, P.glow, 0.55);
  ctx.beginPath();
  starPath(ctx, 0, 0.5, 6.5, 0.5);
  ctx.fillStyle = rGrad(ctx, 0, 0, 0, 7, [
    [0, P.cream],
    [1, P.glow],
  ]);
  ctx.fill();
}

export function bake(b: Baker): void {
  ptex(b, 'prop_dec_gtin', 44, 36, 22, 30, drawGTin);
  ptex(b, 'prop_dec_gplant', 52, 54, 26, 50, drawGPlant);
  ptex(b, 'prop_dec_laltin', 36, 58, 18, 2, drawLaltin);
  ptex(b, 'prop_dec_laltin_flame', 12, 16, 6, 14, (ctx) => {
    ctx.fillStyle = vGrad(ctx, -11, 0, [
      [0, P.glow],
      [1, P.butter],
    ]);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.bezierCurveTo(3.5, -6, 4, -2, 0, 0);
    ctx.bezierCurveTo(-4, -2, -3.5, -6, 0, -11);
    ctx.fill();
  });
  ptex(b, 'prop_dec_laltin_glass', 36, 58, 18, 2, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(globePath());
  });
  ptex(b, 'prop_dec_pirka', 60, 36, 30, 30, drawPirka);
  ptex(b, 'prop_dec_bunting_line', BUNTING.half * 2 + 12, 24, BUNTING.half + 6, 5, drawBuntingLine);
  PENNANT_COLS.forEach((c, i) => ptex(b, `prop_dec_pennant_${i}`, 22, 24, 11, 3, (ctx) => drawPennant(ctx, c)));
  ptex(b, 'prop_dec_chime_top', 40, 24, 20, 2, drawChimeTop);
  CHIME.lengths.forEach((len, i) => ptex(b, `prop_dec_chime_tube_${i}`, 12, len + 12, 6, 1, (ctx) => drawTube(ctx, len)));
  ptex(b, 'prop_dec_chime_clap', 18, 52, 9, 1, drawClapper);
  ptex(b, 'prop_dec_rug', 136, 36, 68, 18, drawRug);
  ptex(b, 'prop_dec_bulb', 12, 16, 6, 1, drawBulb);
  ptex(b, 'prop_dec_shelf', 72, 80, 36, 74, drawShelf);
  ptex(b, 'prop_dec_hammock_ropes', 186, 24, 93, 8, drawHammockRopes);
  ptex(b, 'prop_dec_hammock_shawl', 136, 72, 68, 2, drawShawl);
  ptex(b, 'prop_dec_scope', 84, 80, 40, 74, drawScope);
  ptex(b, 'prop_dec_klantern', 48, 58, 24, 2, drawKLantern);
  ptex(b, 'prop_dec_klantern_star', 28, 28, 14, 14, drawKStar);
}
