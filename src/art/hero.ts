/**
 * Tuki the large-eared pika (docs/WORLD.md section 5.1): every part texture,
 * drawn once at boot in neutral daylight colours. Coordinates are WORLD 5.1's
 * 1x rig coords: origin between the feet, y negative upward, +x = facing.
 *
 * Each part is drawn by a plain function in its own local coords so the same
 * code bakes the textures and paints the DOM portrait (drawHeroPortrait).
 * Texture namespace: "hero_".
 */
import type Phaser from 'phaser';
import { Baker, type Ctx, OUTLINE, ellipsePath, eyeClosed, eyeHappy, lGrad, rGrad, roundRectPath, sparklePath, softShadow, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

// ---------------------------------------------------------------------------
// Colours (WORLD 5.1 / 8). No free hex: tokens + palette helpers only.
// ---------------------------------------------------------------------------

const OAT = A['oat'];
const OAT_SHADE = A['oat-shade'];
const OAT_LINE = A['oat-line'];
const DOKO = A['doko'];
const DOKO_BAND = A['doko-band'];
const DOKO_LINE = A['doko-line'];
const JUTE = A['jute'];
const CANE = A['ghum-cane'];
const LEAF = A['ghum-leaf'];
const GHUM_LINE = A['ghum-line'];
const CREAM_LINE = A['cream-line'];
const GURANS = A['gurans'];
const GURANS_DEEP = A['gurans-deep'];
const MALINGO = A['malingo'];
const LOKTA = A['lokta'];
const MOONMILK = A['moonmilk'];
const FISH_GLOW = A['fish-glow'];
const FISH_GLOW_EDGE = A['fish-glow-edge'];
const SCALE_GLOW = A['scale-glow'];
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Layout shared with src/chars/Hero.ts
// ---------------------------------------------------------------------------

/** A texture's box in its local coords, plus the pivot the Rig places it by. */
export interface HeroBox {
  x0: number;
  y0: number;
  w: number;
  h: number;
  px: number;
  py: number;
}

const box = (x0: number, y0: number, w: number, h: number, px = 0, py = 0): HeroBox => ({ x0, y0, w, h, px, py });

/** Doko placement in rig coords (centre of the cone, rotation in degrees). */
export const DOKO_POS = { x: -27, y: -54, a: -10 };

/** Ear placement: pivot at the ear base (rig coords), base rotation in degrees. */
export const EAR_POS = {
  far: { x: -17 + 10 * Math.sin((16 * Math.PI) / 180), y: -91 + 10 * Math.cos((16 * Math.PI) / 180), a: -16 },
  near: { x: 19 - 10 * Math.sin((12 * Math.PI) / 180), y: -91 + 10 * Math.cos((12 * Math.PI) / 180), a: 12 },
};

/** Doko item slots in doko-local coords (stem foot u, v; lean in degrees). Order = fill order. */
export const DOKO_SLOTS: { u: number; v: number; a: number }[] = [
  { u: -9, v: -17, a: -12 }, // 1 grass tuft
  { u: -1, v: -18, a: 6 }, // 2 gurans puff
  { u: -17, v: -16, a: -30 }, // 3 fern curl
  { u: 6, v: -19, a: 14 }, // 4 butter primula
  { u: -13, v: -18, a: -4 }, // 5 lavender sprig
];
/** The Moon Scale rides at the front of the bouquet. */
export const SCALE_SLOT = { u: -4, v: -19, a: -16 };

export const HERO_ITEMS = ['hero_item_grass', 'hero_item_gurans', 'hero_item_fern', 'hero_item_primula', 'hero_item_lavender'] as const;

export const HERO_BOX: Record<string, HeroBox> = {
  hero_body: box(-40, -99, 80, 104),
  hero_ear: box(-12, -15, 24, 30, 0, 10),
  hero_ear_far: box(-12, -15, 24, 30, 0, 10),
  hero_eyes: box(-16, -70, 38, 20, 3, -60),
  hero_mouth: box(-4, -53, 14, 13, 3, -47),
  hero_muzzle: box(-20, -62, 50, 30, 3, -46),
  hero_blush: box(-9, -6, 18, 12),
  hero_paw: box(-8.5, -7.5, 17, 15),
  hero_foot: box(-10.5, -7, 21, 14),
  hero_namlo: box(-50, -99, 72, 30),
  hero_doko_back: box(-28, -33, 56, 62),
  hero_doko_front: box(-28, -33, 56, 62),
  hero_item: box(-12, -30, 24, 34),
  hero_earflower: box(-11, -11, 22, 22),
  hero_ghum: box(-64, -117, 80, 74, -50, -56),
  hero_rod: box(-5, -85, 10, 96),
  hero_book: box(-14, -11, 28, 20),
  hero_puff: box(-15, -15, 30, 30),
  hero_z: box(-7, -7, 14, 14),
  hero_shadow: box(-34, -8, 68, 16),
};

/** Rod length (grip to tip) in rod-local px; the tip is at (0, -ROD_LEN). */
export const ROD_LEN = 80;

/** Eye centres (rig coords). */
const EYE_L = { x: -9, y: -60 };
const EYE_R = { x: 15, y: -60 };

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

/**
 * Fill the union of several shapes with one outline around the whole
 * silhouette (stroke at 2x width, then fill over the inner half).
 */
function unionFill(ctx: Ctx, shapes: (c: Ctx) => void, fill: string | CanvasGradient, line: string, width = OUTLINE): void {
  ctx.beginPath();
  shapes(ctx);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width * 2;
  ctx.strokeStyle = line;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fillLine(ctx: Ctx, fill: string | CanvasGradient, line: string, width = OUTLINE): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = line;
  ctx.stroke();
}

function dot(ctx: Ctx, x: number, y: number, r: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** A stroke with an outline under it (cords, stems, rods). */
function linedStroke(ctx: Ctx, path: (c: Ctx) => void, fill: string, line: string, w: number, lw = 1.1): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = line;
  ctx.lineWidth = w + lw * 2;
  ctx.stroke();
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Body (head + body as one tea-bun silhouette)
// ---------------------------------------------------------------------------

function bodyShapes(c: Ctx): void {
  c.moveTo(34, -60);
  c.arc(0, -60, 34, 0, TAU);
  ellipsePath(c, 0, -24, 30, 24);
}

export function drawBody(ctx: Ctx): void {
  const g = vGrad(ctx, -94, 0, [
    [0, tint(OAT, 0.16)],
    [0.42, OAT],
    [0.72, OAT],
    [1, OAT_SHADE],
  ]);
  unionFill(ctx, bodyShapes, g, OAT_LINE);
  withState(ctx, () => {
    ctx.beginPath();
    bodyShapes(ctx);
    ctx.clip();
    // Soft volume: the back side (toward the doko) a touch deeper.
    ctx.fillStyle = lGrad(ctx, -36, 0, 2, 0, [
      [0, OAT_SHADE, 0.5],
      [0.55, OAT_SHADE, 0.12],
      [1, OAT_SHADE, 0],
    ]);
    ctx.fillRect(-40, -100, 44, 104);
    // Under-chin shadow so the head reads as a round bun above the body.
    withState(ctx, () => {
      ctx.translate(4, -27);
      ctx.scale(1, 0.32);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 30, [
        [0, OAT_SHADE, 0.38],
        [1, OAT_SHADE, 0],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
    });
    // Head light from the upper left.
    ctx.fillStyle = rGrad(ctx, -2, -80, 0, 30, [
      [0, P.cream, 0.5],
      [0.55, P.cream, 0.18],
      [1, P.cream, 0],
    ]);
    ctx.fillRect(-40, -100, 80, 70);
    // Belly: a cream patch with a feathered edge.
    withState(ctx, () => {
      ctx.translate(2, -20);
      ctx.scale(1, 14 / 18);
      ctx.fillStyle = rGrad(ctx, 0, 0, 0, 19, [
        [0, P.cream, 1],
        [0.8, P.cream, 0.95],
        [1, P.cream, 0],
      ]);
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, TAU);
      ctx.fill();
    });
  });
}

// ---------------------------------------------------------------------------
// Ears: rx 9, ry 12, inner peach rx 5.5 ry 8, cream inner rim, never dark tips.
// ---------------------------------------------------------------------------

export function drawEar(ctx: Ctx, far = false): void {
  const fill = far ? mix(OAT, OAT_SHADE, 0.3) : OAT;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 12, 0, 0, TAU);
  fillLine(
    ctx,
    vGrad(ctx, -12, 12, [
      [0, tint(fill, 0.12)],
      [1, fill],
    ]),
    OAT_LINE,
  );
  const inner = far ? mix(P.peach, OAT, 0.25) : P.peach;
  withState(ctx, () => {
    ctx.translate(0, 1.2);
    ctx.scale(1, 8 / 5.5);
    ctx.fillStyle = rGrad(ctx, 0, 0, 0, 5.5, [
      [0, tint(inner, 0.1)],
      [0.75, inner],
      [1, mix(inner, fill, 0.45)],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, TAU);
    ctx.fill();
  });
  // Pale inner rim along the top edge (a real large-eared pika trait).
  ctx.strokeStyle = P.cream;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.9, 9.9, 0, Math.PI * 1.13, Math.PI * 1.87);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------

function eyeOval(ctx: Ctx, x: number, y: number, rx: number, ry: number, k = 1, hi: 'dots' | 'sparkle' = 'dots'): void {
  ctx.fillStyle = vGrad(ctx, y - ry, y + ry, [
    [0, P.ink],
    [0.62, P.ink],
    [1, mix(P.ink, P.lavender, 0.38)],
  ]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  if (hi === 'sparkle') {
    ctx.fillStyle = P.cream;
    ctx.beginPath();
    sparklePath(ctx, x + 1.1 * k, y - 2.1 * k, 3.1 * k);
    ctx.fill();
    dot(ctx, x - 1.7 * k, y + 2.7 * k, 1.05 * k, P.cream);
    return;
  }
  dot(ctx, x + 1.5 * k, y - 2.5 * k, 2.5 * k, P.cream);
  dot(ctx, x - 1.5 * k, y + 2.5 * k, 1.2 * k, P.cream);
}

export type EyeKind = 'open' | 'blink' | 'happy' | 'closed' | 'half' | 'round' | 'sparkle';
export const EYE_KINDS: EyeKind[] = ['open', 'blink', 'happy', 'closed', 'half', 'round', 'sparkle'];

export function drawEyes(ctx: Ctx, kind: EyeKind): void {
  for (const e of [EYE_L, EYE_R]) {
    switch (kind) {
      case 'open':
        eyeOval(ctx, e.x, e.y, 4.5, 6);
        break;
      case 'sparkle':
        eyeOval(ctx, e.x, e.y, 4.7, 6.2, 1, 'sparkle');
        break;
      case 'round':
        eyeOval(ctx, e.x, e.y - 0.6, 5.7, 7.1, 1.18);
        break;
      case 'blink':
        eyeClosed(ctx, e.x, e.y + 0.5, 9, 2.2);
        break;
      case 'closed':
        eyeClosed(ctx, e.x, e.y + 0.2, 10, 2.4);
        break;
      case 'happy':
        eyeHappy(ctx, e.x, e.y + 1.2, 10, 2.4);
        break;
      case 'half':
        withState(ctx, () => {
          ctx.beginPath();
          ctx.rect(e.x - 8, e.y - 0.6, 16, 10);
          ctx.clip();
          eyeOval(ctx, e.x, e.y, 4.5, 6);
        });
        // Remove the upper highlight; add a small low one.
        dot(ctx, e.x + 1.4, e.y + 1.5, 1.2, P.cream);
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.x - 5.4, e.y - 0.2);
        ctx.quadraticCurveTo(e.x, e.y - 1.8, e.x + 5.4, e.y - 0.2);
        ctx.stroke();
        break;
    }
  }
}

export type MouthKind = 'w' | 'smile' | 'o' | 'munch' | 'small';
export const MOUTH_KINDS: MouthKind[] = ['w', 'smile', 'o', 'munch', 'small'];

/** Mouths centred on (+3, -47). */
export function drawMouth(ctx: Ctx, kind: MouthKind): void {
  const x = 3;
  const y = -47;
  ctx.strokeStyle = P.ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  switch (kind) {
    case 'w':
      ctx.moveTo(x - 3.2, y - 0.6);
      ctx.quadraticCurveTo(x - 1.6, y + 2.2, x, y - 0.1);
      ctx.quadraticCurveTo(x + 1.6, y + 2.2, x + 3.2, y - 0.6);
      ctx.stroke();
      break;
    case 'small':
      ctx.moveTo(x - 2.3, y - 0.3);
      ctx.quadraticCurveTo(x - 1.15, y + 1.5, x, y);
      ctx.quadraticCurveTo(x + 1.15, y + 1.5, x + 2.3, y - 0.3);
      ctx.stroke();
      break;
    case 'smile':
      ctx.moveTo(x - 3, y - 0.8);
      ctx.quadraticCurveTo(x - 1.5, y + 0.2, x, y - 0.6);
      ctx.quadraticCurveTo(x + 1.5, y + 0.2, x + 3, y - 0.8);
      ctx.quadraticCurveTo(x, y + 5.4, x - 3, y - 0.8);
      ctx.closePath();
      ctx.fillStyle = mix(P.rose, P.ink, 0.28);
      ctx.fill();
      ctx.stroke();
      // tongue
      withState(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 0.8);
        ctx.quadraticCurveTo(x - 1.5, y + 0.2, x, y - 0.6);
        ctx.quadraticCurveTo(x + 1.5, y + 0.2, x + 3, y - 0.8);
        ctx.quadraticCurveTo(x, y + 5.4, x - 3, y - 0.8);
        ctx.clip();
        dot(ctx, x + 0.4, y + 3.4, 2, P.blush);
      });
      break;
    case 'o':
      ctx.ellipse(x, y + 0.6, 2.3, 2.8, 0, 0, TAU);
      ctx.fillStyle = mix(P.rose, P.ink, 0.3);
      ctx.fill();
      ctx.stroke();
      break;
    case 'munch':
      ctx.moveTo(x - 3.2, y + 0.4);
      ctx.quadraticCurveTo(x - 1.6, y - 1.8, x, y + 0.3);
      ctx.quadraticCurveTo(x + 1.6, y - 1.8, x + 3.2, y + 0.4);
      ctx.stroke();
      break;
  }
}

/** Cream muzzle "cloud" (two circles), whisker dots included. r 9 normal, 11 puffed. */
export function drawMuzzle(ctx: Ctx, r = 9): void {
  const shapes = (c: Ctx) => {
    c.moveTo(-3 + r, -46);
    c.arc(-3, -46, r, 0, TAU);
    c.moveTo(9 + r, -46);
    c.arc(9, -46, r, 0, TAU);
  };
  unionFill(
    ctx,
    shapes,
    vGrad(ctx, -46 - r, -46 + r, [
      [0, P.cream],
      [0.7, P.cream],
      [1, mix(P.cream, CREAM_LINE, 0.45)],
    ]),
    CREAM_LINE,
    1.9,
  );
  // Whisker dots: 3 per side.
  const wd = rgba(P.ink, 0.6);
  for (const [cx, cy, s] of [
    [-14 - (r - 9) * 0.6, -48, -1],
    [21 + (r - 9) * 0.6, -48, 1],
  ] as const) {
    dot(ctx, cx, cy - 2.2, 0.9, wd);
    dot(ctx, cx + s * 1.6, cy, 0.9, wd);
    dot(ctx, cx, cy + 2.2, 0.9, wd);
  }
}

/** Single blush oval rx 6, ry 3.5 centred on (0, 0). */
export function drawBlush(ctx: Ctx): void {
  withState(ctx, () => {
    ctx.scale(1, 3.5 / 6);
    ctx.fillStyle = rGrad(ctx, 0, 0, 0, 7, [
      [0, P.blush, 0.6],
      [0.7, P.blush, 0.55],
      [1, P.blush, 0],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Paws and feet
// ---------------------------------------------------------------------------

export function drawPaw(ctx: Ctx): void {
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 5, 0, 0, TAU);
  fillLine(
    ctx,
    vGrad(ctx, -5, 5, [
      [0, tint(OAT_SHADE, 0.32)],
      [1, OAT_SHADE],
    ]),
    OAT_LINE,
  );
}

export function drawFoot(ctx: Ctx): void {
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4.5, 0, 0, TAU);
  fillLine(
    ctx,
    vGrad(ctx, -4.5, 4.5, [
      [0, tint(OAT_SHADE, 0.28)],
      [1, OAT_SHADE],
    ]),
    OAT_LINE,
  );
  // Two tiny toe creases.
  ctx.strokeStyle = rgba(OAT_LINE, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4.2, -2.2);
  ctx.lineTo(4.6, 0.4);
  ctx.moveTo(6.4, -1.4);
  ctx.lineTo(6.6, 0.6);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Namlo head strap: 7 px jute band over the crown + two cords to the doko rim
// ---------------------------------------------------------------------------

export function drawNamlo(ctx: Ctx): void {
  const line = shade(JUTE, 0.32);
  // Cords first (they tuck under the band).
  const cord = (c: Ctx, a: [number, number], m: [number, number], b: [number, number]) => {
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo(m[0], m[1], b[0], b[1]);
  };
  linedStroke(ctx, (c) => cord(c, [-13, -90], [-30, -93], [-43, -80]), JUTE, line, 2.5, 1);
  linedStroke(ctx, (c) => cord(c, [-12, -87.5], [-26, -88], [-36, -77]), mix(JUTE, OAT_SHADE, 0.25), line, 2.5, 1);
  // Band following the head curve.
  const a0 = Math.atan2(-30, -14);
  const a1 = Math.atan2(-31, 16);
  const arc = (c: Ctx) => c.arc(0, -60, 30.6, a0, a1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  arc(ctx);
  ctx.strokeStyle = line;
  ctx.lineWidth = 7 + 2.2;
  ctx.stroke();
  ctx.beginPath();
  arc(ctx);
  ctx.strokeStyle = JUTE;
  ctx.lineWidth = 7;
  ctx.stroke();
  // A lighter woven stripe and 2 stitch dots.
  ctx.beginPath();
  ctx.arc(0, -60, 31.8, a0 + 0.05, a1 - 0.05);
  ctx.strokeStyle = rgba(tint(JUTE, 0.5), 0.8);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const t of [0.33, 0.68]) {
    const a = a0 + (a1 - a0) * t;
    dot(ctx, Math.cos(a) * 29.6, -60 + Math.sin(a) * 29.6, 0.95, line);
  }
}

// ---------------------------------------------------------------------------
// Doko (cone basket) in doko-local coords: rim at v = -24, base at v = +24
// ---------------------------------------------------------------------------

const RIM_Y = -24;
const RIM_RX = 23;
const RIM_RY = 5;

function dokoBodyPath(c: Ctx): void {
  c.moveTo(-RIM_RX, RIM_Y);
  c.ellipse(0, RIM_Y, RIM_RX, RIM_RY, 0, Math.PI, 0, true);
  c.bezierCurveTo(22.5, -6, 16, 14, 12.5, 19.5);
  c.quadraticCurveTo(10.5, 24.5, 5.5, 24.5);
  c.lineTo(-5.5, 24.5);
  c.quadraticCurveTo(-10.5, 24.5, -12.5, 19.5);
  c.bezierCurveTo(-16, 14, -22.5, -6, -RIM_RX, RIM_Y);
  c.closePath();
}

/** Half-width of the cone at height v (follows the body curve closely enough). */
function dokoHalfW(v: number): number {
  const t = (v - RIM_Y) / 48;
  return RIM_RX - (RIM_RX - 11.5) * Math.pow(t, 1.35);
}

export function drawDokoBack(ctx: Ctx): void {
  // Inside of the basket.
  ctx.beginPath();
  ctx.ellipse(0, RIM_Y, RIM_RX - 1, RIM_RY - 0.6, 0, 0, TAU);
  ctx.fillStyle = vGrad(ctx, RIM_Y - RIM_RY, RIM_Y + RIM_RY, [
    [0, mix(DOKO, DOKO_LINE, 0.75)],
    [1, mix(DOKO, DOKO_LINE, 0.35)],
  ]);
  ctx.fill();
  // Back half of the rolled rim.
  rimArc(ctx, Math.PI, TAU);
}

function rimArc(ctx: Ctx, a0: number, a1: number): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, RIM_Y, RIM_RX, RIM_RY, 0, a0, a1);
  ctx.strokeStyle = DOKO_LINE;
  ctx.lineWidth = 4 + OUTLINE * 2 - 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, RIM_Y, RIM_RX, RIM_RY, 0, a0, a1);
  ctx.strokeStyle = DOKO_BAND;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, RIM_Y - 0.9, RIM_RX - 0.5, RIM_RY - 0.5, 0, a0 + 0.12, a1 - 0.12);
  ctx.strokeStyle = rgba(tint(DOKO_BAND, 0.45), 0.85);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export function drawDokoFront(ctx: Ctx): void {
  ctx.beginPath();
  dokoBodyPath(ctx);
  fillLine(
    ctx,
    lGrad(ctx, -24, 0, 24, 0, [
      [0, tint(DOKO, 0.16)],
      [0.45, DOKO],
      [1, mix(DOKO, DOKO_LINE, 0.4)],
    ]),
    DOKO_LINE,
  );
  withState(ctx, () => {
    ctx.beginPath();
    dokoBodyPath(ctx);
    ctx.clip();
    // 4 stake lines converging to the base.
    ctx.strokeStyle = rgba(DOKO_LINE, 0.35);
    ctx.lineWidth = 1.2;
    for (const k of [-0.68, -0.24, 0.24, 0.68]) {
      ctx.beginPath();
      ctx.moveTo(k * 21, RIM_Y + 4);
      ctx.quadraticCurveTo(k * 18, 4, k * 10, 24);
      ctx.stroke();
    }
    // 3 curved weave bands at 30 / 55 / 80 % of the height.
    for (const f of [0.3, 0.55, 0.8]) {
      const v = RIM_Y + 48 * f;
      const hw = dokoHalfW(v) + 1;
      const sag = 4.2 * (hw / RIM_RX);
      const band = (c: Ctx, dy: number) => {
        c.moveTo(-hw - 1, v + dy);
        c.quadraticCurveTo(0, v + sag * 2 + dy, hw + 1, v + dy);
      };
      ctx.beginPath();
      band(ctx, 1.6);
      ctx.strokeStyle = rgba(DOKO_LINE, 0.45);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      band(ctx, 0);
      ctx.strokeStyle = DOKO_BAND;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      band(ctx, -0.8);
      ctx.strokeStyle = rgba(tint(DOKO_BAND, 0.5), 0.7);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // Soft light on the outer (back) flank.
    ctx.fillStyle = lGrad(ctx, -24, 0, -8, 0, [
      [0, P.cream, 0.18],
      [1, P.cream, 0],
    ]);
    ctx.fillRect(-26, -30, 20, 60);
  });
  // Front half of the rolled rim.
  rimArc(ctx, 0, Math.PI);
}

// ---------------------------------------------------------------------------
// Doko items (item-local: stem foot at (0, 0), growing up to about -26)
// ---------------------------------------------------------------------------

function blade(ctx: Ctx, a: number, len: number, w: number, bend: number): void {
  withState(ctx, () => {
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w / 2 + bend * 0.5, -len * 0.55, bend - 0.6, -len + 1.2);
    ctx.arc(bend, -len + 1.2, 0.75, Math.PI, 0);
    ctx.quadraticCurveTo(w / 2 + bend * 0.5, -len * 0.55, w / 2, 0);
    ctx.closePath();
    fillLine(
      ctx,
      vGrad(ctx, -len, 0, [
        [0, tint(P.sage, 0.25)],
        [1, mix(P.sage, P.moss, 0.35)],
      ]),
      shade(P.sage, 0.3),
      1.2,
    );
  });
}

function stem(ctx: Ctx, pts: [number, number][], c: string = P.moss, w = 2): void {
  linedStroke(
    ctx,
    (cx) => {
      cx.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 3) cx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      else cx.lineTo(pts[1][0], pts[1][1]);
    },
    c,
    shade(c, 0.25),
    w,
    0.8,
  );
}

function leaf(ctx: Ctx, x: number, y: number, a: number, len = 6, c: string = P.sage): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    fillLine(ctx, c, shade(c, 0.3), 1);
  });
}

function flower5(ctx: Ctx, cx: number, cy: number, r: number, ring: number, petal: string, centre: string, line: string, rot = 0): void {
  const shapes = (c: Ctx) => {
    for (let i = 0; i < 5; i++) {
      const a = rot - Math.PI / 2 + (i / 5) * TAU;
      const x = cx + Math.cos(a) * ring;
      const y = cy + Math.sin(a) * ring;
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, TAU);
    }
  };
  unionFill(ctx, shapes, rGrad(ctx, cx, cy, 0, ring + r, [
    [0, tint(petal, 0.25)],
    [1, petal],
  ]), line, 1.1);
  dot(ctx, cx, cy, r * 0.55, centre);
  dot(ctx, cx - r * 0.25, cy - r * 0.3, r * 0.22, rgba(P.cream, 0.9));
}

export function drawItemGrass(ctx: Ctx): void {
  blade(ctx, -0.32, 21, 3.6, -2.5);
  blade(ctx, 0.3, 19, 3.4, 2.2);
  blade(ctx, 0.02, 26, 4, 1);
}

export function drawItemGurans(ctx: Ctx): void {
  stem(ctx, [
    [0, 0],
    [0.5, -10],
    [0, -17],
  ]);
  leaf(ctx, 0, -15, -2.6, 7, P.moss);
  leaf(ctx, 0, -15, -0.5, 7, P.moss);
  flower5(ctx, 0, -21.5, 3, 3.5, GURANS, P.butter, GURANS_DEEP, 0.2);
}

export function drawItemFern(ctx: Ctx): void {
  const line = shade(P.moss, 0.25);
  const path = (c: Ctx) => {
    c.moveTo(0, 0);
    c.quadraticCurveTo(-1, -12, 2, -18);
    // fiddlehead spiral
    const cx = 5.6;
    const cy = -20.5;
    let first = true;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const ang = Math.PI * 0.95 - t * Math.PI * 2.1;
      const rr = 4.6 * (1 - t * 0.72);
      const x = cx + Math.cos(ang) * rr;
      const y = cy - Math.sin(ang) * rr;
      if (first) {
        c.lineTo(x, y);
        first = false;
      } else c.lineTo(x, y);
    }
  };
  linedStroke(ctx, path, P.moss, line, 2.5, 0.9);
  // two tiny pinnae
  leaf(ctx, 0.4, -8, -2.5, 4.5, P.sage);
  leaf(ctx, 0.6, -11, -0.6, 4.5, P.sage);
}

export function drawItemPrimula(ctx: Ctx): void {
  stem(ctx, [
    [0, 0],
    [-1, -10],
    [0, -18],
  ], P.sage, 1.9);
  leaf(ctx, 0, -6, -2.4, 6.5, P.sage);
  flower5(ctx, 0, -22, 2.7, 3.5, P.butter, mix(P.butter, P.ember, 0.4), shade(P.butter, 0.3), 0);
}

export function drawItemLavender(ctx: Ctx): void {
  stem(ctx, [
    [0, 0],
    [1, -12],
    [-0.5, -25],
  ], P.sage, 1.7);
  const line = shade(P.lavender, 0.28);
  const buds: [number, number, number][] = [
    [-0.5, -26.5, 2],
    [-2.2, -23.4, 2.3],
    [1.4, -22.2, 2.3],
    [-2.3, -19.4, 2.4],
    [1.6, -18, 2.4],
    [-1.8, -15, 2.2],
    [1.4, -13.6, 2],
  ];
  for (let i = buds.length - 1; i >= 0; i--) {
    const [x, y, r] = buds[i];
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.85, r, x < 0 ? 0.4 : -0.4, 0, TAU);
    fillLine(ctx, i % 2 ? tint(P.lavender, 0.15) : P.lavender, line, 0.9);
  }
}

/** The Moon Scale: a pearly fish scale with a scale-glow rim. */
export function drawItemScale(ctx: Ctx): void {
  const path = (c: Ctx) => {
    c.moveTo(0, -4);
    c.bezierCurveTo(-7.5, -8, -8, -16, -5.6, -20.5);
    c.quadraticCurveTo(0, -25.5, 5.6, -20.5);
    c.bezierCurveTo(8, -16, 7.5, -8, 0, -4);
    c.closePath();
  };
  ctx.beginPath();
  path(ctx);
  fillLine(
    ctx,
    rGrad(ctx, -1.5, -18, 0, 12, [
      [0, MOONMILK],
      [0.6, SCALE_GLOW],
      [1, FISH_GLOW],
    ]),
    shade(FISH_GLOW_EDGE, 0.22),
    1.5,
  );
  ctx.strokeStyle = rgba(FISH_GLOW_EDGE, 0.9);
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for (const [y, w] of [
    [-11, 4],
    [-15.5, 3],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.quadraticCurveTo(0, y + 3, w, y);
    ctx.stroke();
  }
  dot(ctx, -2.4, -19, 1.2, P.cream);
}

export function drawEarFlower(ctx: Ctx): void {
  leaf(ctx, -1, 2, 2.3, 8, P.moss);
  leaf(ctx, 1, 2, 0.9, 8, P.moss);
  flower5(ctx, 0, -1, 3.6, 4.2, GURANS, P.butter, GURANS_DEEP, 0.3);
}

// ---------------------------------------------------------------------------
// Ghum (rain only): peaked cane-and-leaf hood
// ---------------------------------------------------------------------------

function ghumPath(c: Ctx): void {
  c.moveTo(8, -94);
  c.bezierCurveTo(5, -101, -1, -108.5, -10, -110.6);
  c.bezierCurveTo(-19, -112.5, -26, -106, -33, -96);
  c.bezierCurveTo(-42, -83, -52, -66, -57.5, -51.5);
  c.quadraticCurveTo(-58.8, -47.5, -55, -48.6);
  c.bezierCurveTo(-40, -61, -20, -79, 3.8, -86);
  c.quadraticCurveTo(10.6, -88.2, 8, -94);
  c.closePath();
}

function ghumUnderside(c: Ctx): void {
  c.moveTo(6, -87);
  c.bezierCurveTo(-18, -80, -38, -63, -55, -48.6);
}

export function drawGhum(ctx: Ctx): void {
  ctx.beginPath();
  ghumPath(ctx);
  ctx.fillStyle = lGrad(ctx, -20, -112, -40, -50, [
    [0, tint(CANE, 0.22)],
    [0.5, CANE],
    [1, mix(CANE, GHUM_LINE, 0.25)],
  ]);
  ctx.fill();
  withState(ctx, () => {
    ctx.beginPath();
    ghumPath(ctx);
    ctx.clip();
    // Leaf lining showing along the brim/underside.
    ctx.beginPath();
    ghumUnderside(ctx);
    ctx.strokeStyle = LEAF;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ghumUnderside(ctx);
    ctx.strokeStyle = rgba(tint(LEAF, 0.4), 0.7);
    ctx.lineWidth = 1;
    ctx.translate(0, -2.6);
    ctx.stroke();
    ctx.translate(0, 2.6);
    // 4 diagonal weave lines.
    ctx.strokeStyle = rgba(GHUM_LINE, 0.4);
    ctx.lineWidth = 1.3;
    for (const t of [0.18, 0.38, 0.58, 0.78]) {
      const x = 4 - t * 62;
      const y = -100 + t * 46;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 12);
      ctx.quadraticCurveTo(x + 2, y - 2, x + 9, y + 12);
      ctx.stroke();
    }
    // Ridge highlight.
    ctx.strokeStyle = rgba(P.cream, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -100);
    ctx.bezierCurveTo(-6, -109, -18, -110, -27, -101);
    ctx.stroke();
  });
  ctx.beginPath();
  ghumPath(ctx);
  ctx.lineWidth = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = GHUM_LINE;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Props: rod, book, puffs
// ---------------------------------------------------------------------------

/** Malingo bamboo rod, grip at (0, 0), tip at (0, -ROD_LEN). */
export function drawRod(ctx: Ctx): void {
  const L = ROD_LEN;
  const line = shade(MALINGO, 0.3);
  ctx.beginPath();
  ctx.moveTo(-1.9, 6);
  ctx.lineTo(-0.8, -L + 1);
  ctx.arc(0, -L + 1, 0.8, Math.PI, 0);
  ctx.lineTo(1.9, 6);
  ctx.arc(0, 6, 1.9, 0, Math.PI);
  ctx.closePath();
  fillLine(
    ctx,
    lGrad(ctx, -2, 0, 2, 0, [
      [0, tint(MALINGO, 0.3)],
      [1, MALINGO],
    ]),
    line,
    1.1,
  );
  // nodes
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (const f of [0.22, 0.45, 0.66, 0.84]) {
    const y = -L * f;
    const hw = 1.9 - 1.1 * f;
    ctx.beginPath();
    ctx.moveTo(-hw - 0.4, y);
    ctx.lineTo(hw + 0.4, y);
    ctx.stroke();
  }
  // jute grip wrap
  ctx.beginPath();
  roundRectPath(ctx, -2.6, -5, 5.2, 11, 2.2);
  fillLine(ctx, JUTE, shade(JUTE, 0.32), 1);
  ctx.strokeStyle = rgba(shade(JUTE, 0.3), 0.6);
  ctx.lineWidth = 0.8;
  for (const y of [-2.5, 0.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(-2.4, y + 0.8);
    ctx.lineTo(2.4, y - 0.8);
    ctx.stroke();
  }
  // tiny line guide at the tip
  ctx.beginPath();
  ctx.arc(1.3, -L + 3, 1.1, 0, TAU);
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

/** Tuki's little lokta-paper journal, open, centred on (0, 0). */
export function drawBook(ctx: Ctx): void {
  const line = shade(LOKTA, 0.3);
  // cover peeking under the pages
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.quadraticCurveTo(-6, 1.5, 0, 6.5);
  ctx.quadraticCurveTo(6, 1.5, 12, -2);
  ctx.lineTo(12, 1);
  ctx.quadraticCurveTo(6, 4.5, 0, 9);
  ctx.quadraticCurveTo(-6, 4.5, -12, 1);
  ctx.closePath();
  fillLine(ctx, P.rose, shade(P.rose, 0.3), 1.2);
  // pages
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(s * 6, 0, s * 11.5, -3);
    ctx.lineTo(s * 11.5, -8.5);
    ctx.quadraticCurveTo(s * 6, -6, 0, -1.5);
    ctx.closePath();
    fillLine(ctx, s < 0 ? LOKTA : tint(LOKTA, 0.3), line, 1.2);
    ctx.strokeStyle = rgba(P.lavender, 0.55);
    ctx.lineWidth = 0.8;
    for (const k of [0.3, 0.55, 0.8]) {
      ctx.beginPath();
      ctx.moveTo(s * 2.2, 2.8 - k * 7);
      ctx.quadraticCurveTo(s * 6, -1 - k * 6, s * 9.8, -3.5 - k * 4.2);
      ctx.stroke();
    }
  }
  // jute bookmark string
  linedStroke(
    ctx,
    (c) => {
      c.moveTo(0.5, 5);
      c.quadraticCurveTo(2.5, 8, 1.2, 10);
    },
    JUTE,
    shade(JUTE, 0.3),
    1.2,
    0.6,
  );
}

function puffCloud(ctx: Ctx): void {
  const shapes = (c: Ctx) => {
    for (const [x, y, r] of [
      [0, 0, 10.5],
      [-7, 4, 6.5],
      [7, 4.5, 6.5],
      [-5, -6, 6.5],
      [5.5, -6, 6.5],
    ] as const) {
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, TAU);
    }
  };
  unionFill(ctx, shapes, P.cream, CREAM_LINE, 1.8);
}

/** "!" puff for the eep. */
export function drawBang(ctx: Ctx): void {
  puffCloud(ctx);
  ctx.beginPath();
  ctx.moveTo(-1.6, -6.5);
  ctx.quadraticCurveTo(0, -8.2, 1.6, -6.5);
  ctx.lineTo(0.9, 2.4);
  ctx.quadraticCurveTo(0, 3.4, -0.9, 2.4);
  ctx.closePath();
  ctx.fillStyle = GURANS_DEEP;
  ctx.fill();
  dot(ctx, 0, 6.2, 1.7, GURANS_DEEP);
}

/** "?" puff for the guardian-night tell. */
export function drawQuestion(ctx: Ctx): void {
  puffCloud(ctx);
  const c = mix(P.lavender, P.ink, 0.45);
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-3.6, -3.4);
  ctx.bezierCurveTo(-3.6, -8.6, 4.2, -8.6, 4, -3.6);
  ctx.bezierCurveTo(3.9, -0.6, 0, -0.4, 0, 2.4);
  ctx.stroke();
  dot(ctx, 0, 6.4, 1.6, c);
}

export function drawZ(ctx: Ctx): void {
  const c = mix(P.lavender, P.ink, 0.25);
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

function partTex(b: Baker, key: string, boxKey: string, draw: (ctx: Ctx) => void): void {
  const bx = HERO_BOX[boxKey];
  b.tex(key, bx.w, bx.h, (ctx) => {
    ctx.translate(-bx.x0, -bx.y0);
    draw(ctx);
  });
}

export function bake(b: Baker): void {
  partTex(b, 'hero_body', 'hero_body', drawBody);
  partTex(b, 'hero_ear', 'hero_ear', (c) => drawEar(c, false));
  partTex(b, 'hero_ear_far', 'hero_ear_far', (c) => drawEar(c, true));
  for (const k of EYE_KINDS) partTex(b, `hero_eyes_${k}`, 'hero_eyes', (c) => drawEyes(c, k));
  for (const k of MOUTH_KINDS) partTex(b, `hero_mouth_${k}`, 'hero_mouth', (c) => drawMouth(c, k));
  partTex(b, 'hero_muzzle', 'hero_muzzle', (c) => drawMuzzle(c, 9));
  partTex(b, 'hero_muzzle_puff', 'hero_muzzle', (c) => drawMuzzle(c, 11));
  partTex(b, 'hero_blush', 'hero_blush', drawBlush);
  partTex(b, 'hero_paw', 'hero_paw', drawPaw);
  partTex(b, 'hero_foot', 'hero_foot', drawFoot);
  partTex(b, 'hero_namlo', 'hero_namlo', drawNamlo);
  partTex(b, 'hero_doko_back', 'hero_doko_back', drawDokoBack);
  partTex(b, 'hero_doko_front', 'hero_doko_front', drawDokoFront);
  partTex(b, 'hero_item_grass', 'hero_item', drawItemGrass);
  partTex(b, 'hero_item_gurans', 'hero_item', drawItemGurans);
  partTex(b, 'hero_item_fern', 'hero_item', drawItemFern);
  partTex(b, 'hero_item_primula', 'hero_item', drawItemPrimula);
  partTex(b, 'hero_item_lavender', 'hero_item', drawItemLavender);
  partTex(b, 'hero_item_scale', 'hero_item', drawItemScale);
  partTex(b, 'hero_earflower', 'hero_earflower', drawEarFlower);
  partTex(b, 'hero_ghum', 'hero_ghum', drawGhum);
  partTex(b, 'hero_rod', 'hero_rod', drawRod);
  partTex(b, 'hero_book', 'hero_book', drawBook);
  partTex(b, 'hero_bang', 'hero_puff', drawBang);
  partTex(b, 'hero_q', 'hero_puff', drawQuestion);
  partTex(b, 'hero_z', 'hero_z', drawZ);
  partTex(b, 'hero_shadow', 'hero_shadow', (c) => softShadow(c, 0, 0, 31, 6.5, 0.2));
}

// ---------------------------------------------------------------------------
// Portrait (rotate card + app icons)
// ---------------------------------------------------------------------------

function drawDokoAssembly(ctx: Ctx, items: number): void {
  withState(ctx, () => {
    ctx.translate(DOKO_POS.x, DOKO_POS.y);
    ctx.rotate((DOKO_POS.a * Math.PI) / 180);
    drawDokoBack(ctx);
    const fns = [drawItemGrass, drawItemGurans, drawItemFern, drawItemPrimula, drawItemLavender];
    for (let i = 0; i < Math.min(items, 5); i++) {
      const s = DOKO_SLOTS[i];
      withState(ctx, () => {
        ctx.translate(s.u, s.v);
        ctx.rotate((s.a * Math.PI) / 180);
        fns[i](ctx);
      });
    }
    drawDokoFront(ctx);
  });
}

function drawEarAt(ctx: Ctx, p: { x: number; y: number; a: number }, far: boolean): void {
  withState(ctx, () => {
    ctx.translate(p.x, p.y);
    ctx.rotate((p.a * Math.PI) / 180);
    ctx.translate(0, -10);
    drawEar(ctx, far);
  });
}

/**
 * Draw Tuki's portrait (head + ears + doko top, tilted) into a 2D context of
 * size x size: the "Turn your device sideways" card and the app icons. One
 * gurans tips out of the doko and floats down.
 */
export function drawHeroPortrait(ctx: CanvasRenderingContext2D, size: number, opts: { tilt?: number; expression?: 'neutral' | 'happy' } = {}): void {
  const tilt = opts.tilt ?? -0.16;
  const k = size / 118;
  ctx.save();
  ctx.translate(size * 0.53, size * 0.98);
  ctx.scale(k, k);
  // Pivot the head tilt around the neck.
  ctx.translate(0, -36);
  ctx.rotate(tilt);
  ctx.translate(0, 36);
  drawDokoAssembly(ctx, 5);
  drawEarAt(ctx, EAR_POS.far, true);
  drawEarAt(ctx, EAR_POS.near, false);
  drawBody(ctx);
  if (size >= 64) drawNamlo(ctx);
  drawMuzzle(ctx, 9);
  for (const [x, y] of [
    [-20, -49],
    [25, -49],
  ] as const) {
    withState(ctx, () => {
      ctx.translate(x, y);
      ctx.scale(1.15, 1.15);
      drawBlush(ctx);
    });
  }
  const happy = opts.expression === 'happy';
  drawEyes(ctx, happy ? 'happy' : 'open');
  drawMouth(ctx, happy ? 'smile' : 'w');
  withState(ctx, () => {
    ctx.translate(-10, -10);
    drawPaw(ctx);
  });
  withState(ctx, () => {
    ctx.translate(14, -10);
    drawPaw(ctx);
  });
  ctx.restore();
  // The tipped-out gurans, drifting down beside the doko (unrotated).
  ctx.save();
  ctx.translate(size * 0.16, size * 0.36);
  ctx.scale(k * 1.05, k * 1.05);
  ctx.rotate(0.5);
  drawEarFlower(ctx);
  ctx.restore();
}

/** Paint the portrait into the DOM rotate card once the art is ready. */
export function afterBake(_game: Phaser.Game): void {
  const c = document.getElementById('rotate-hero') as HTMLCanvasElement | null;
  const ctx = c?.getContext('2d');
  if (!c || !ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  drawHeroPortrait(ctx, Math.min(c.width, c.height), { expression: 'happy' });
}
