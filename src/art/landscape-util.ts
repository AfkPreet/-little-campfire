/**
 * Small drawing utilities shared by the landscape bakers. No bake() here.
 */
import type { Ctx } from './kit';
import { rgba } from '@/palette';

/**
 * Draw into a scratch canvas with the same size and transform as ctx, then
 * composite it back. Lets a baker use destination-out tricks (rims, holes)
 * without disturbing what is already on ctx. Works inside strip chunks.
 */
export function layer(ctx: Ctx, draw: (t: Ctx) => void, alpha = 1, op: GlobalCompositeOperation = 'source-over'): void {
  const c = document.createElement('canvas');
  c.width = ctx.canvas.width;
  c.height = ctx.canvas.height;
  const t = c.getContext('2d')!;
  t.setTransform(ctx.getTransform());
  t.imageSmoothingQuality = 'high';
  draw(t);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
  c.width = 0;
  c.height = 0;
}

/**
 * Rim light on the light-facing edges of a silhouette: S minus S shifted away
 * from the light. `shape` adds the silhouette subpaths (no beginPath).
 * (lx, ly) points toward the light. Two passes: a crisp core and a soft halo.
 */
export function rimOf(t: Ctx, shape: (c: Ctx) => void, lx: number, ly: number, core = 2.6, soft = 7, color = '#FFFFFF'): void {
  const pass = (d: number, a: number) => {
    layer(t, (u) => {
      u.fillStyle = rgba(color, a);
      u.beginPath();
      shape(u);
      u.fill();
      u.globalCompositeOperation = 'destination-out';
      u.translate(-lx * d, -ly * d);
      u.fillStyle = '#FFFFFF';
      u.beginPath();
      shape(u);
      u.fill();
    });
  };
  if (soft > 0) pass(soft, 0.32);
  pass(core, 0.95);
}

/** Erase a silhouette (used so front shapes hide rims/masks of shapes behind). */
export function erase(t: Ctx, shape: (c: Ctx) => void): void {
  t.save();
  t.globalCompositeOperation = 'destination-out';
  t.fillStyle = '#FFFFFF';
  t.beginPath();
  shape(t);
  t.fill();
  t.restore();
}

/** Normalise a direction. */
export function dir(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/**
 * Circle with a lit crescent: fill with `lit`, then the circle shifted away
 * from the light with `base`, clipped to the circle.
 */
export function litCircle(ctx: Ctx, x: number, y: number, r: number, base: string | CanvasGradient, lit: string, lx: number, ly: number, d = 0.18): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = lit;
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  ctx.arc(x - lx * r * d, y - ly * r * d, r, 0, Math.PI * 2);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.restore();
}

/** Points along a function y(x) from x0 to x1 (inclusive) every step px. */
export function sample(fn: (x: number) => number, x0: number, x1: number, step = 4): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = x0; x < x1; x += step) pts.push([x, fn(x)]);
  pts.push([x1, fn(x1)]);
  return pts;
}

/** Closed silhouette under a crest function down to yBottom. */
export function underCurve(c: Ctx, fn: (x: number) => number, x0: number, x1: number, yBottom: number, step = 4): void {
  c.moveTo(x0, yBottom);
  for (let x = x0; x < x1; x += step) c.lineTo(x, fn(x));
  c.lineTo(x1, fn(x1));
  c.lineTo(x1, yBottom);
  c.closePath();
}

/** A rounded teardrop (dhupi cone): tip at (x, top), widest near 70%, round base. */
export function teardrop(c: Ctx, x: number, top: number, w: number, h: number, lean = 0): void {
  const bot = top + h;
  const hw = w / 2;
  const tx = x + lean;
  c.moveTo(tx, top);
  c.bezierCurveTo(tx + hw * 0.35, top + h * 0.18, x + hw * 1.02, top + h * 0.5, x + hw, top + h * 0.74);
  c.bezierCurveTo(x + hw * 0.98, bot - h * 0.02, x + hw * 0.4, bot, x, bot);
  c.bezierCurveTo(x - hw * 0.4, bot, x - hw * 0.98, bot - h * 0.02, x - hw, top + h * 0.74);
  c.bezierCurveTo(x - hw * 1.02, top + h * 0.5, tx - hw * 0.35, top + h * 0.18, tx, top);
  c.closePath();
}
