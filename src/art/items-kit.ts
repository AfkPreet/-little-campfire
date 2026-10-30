/**
 * Shared drawing helpers for item icons (src/art/items.ts). Every icon is
 * drawn into a 96 x 96 logical square, lit from the top-left, with 2.5 px
 * outlines a darker shade of the fill and a soft ink contact shadow.
 * No bake() here: items.ts owns baking.
 */
import { P, rgba, shade, tint, mix } from '@/palette';
import { OUTLINE, fillOutline, rGrad, lGrad, softShadow, smoothClosed, withState, sparklePath, type Ctx } from './kit';

export type Draw = (ctx: Ctx) => void;
export type Pt = [number, number];

export const OL = OUTLINE;
export const S = 96;
export const CX = 48;

/** Fill + outline a path built by `build`. */
export function shape(ctx: Ctx, build: (c: Ctx) => void, fill: string | CanvasGradient, base?: string, lw = OL): void {
  ctx.beginPath();
  build(ctx);
  fillOutline(ctx, fill, base, lw);
}

/** Fill only (no outline). */
export function fillOnly(ctx: Ctx, build: (c: Ctx) => void, fill: string | CanvasGradient): void {
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Stroke only, round caps. */
export function line(ctx: Ctx, build: (c: Ctx) => void, color: string, lw = OL): void {
  ctx.beginPath();
  build(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Ellipse fill+outline. */
export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, base?: string, rot = 0, lw = OL): void {
  shape(ctx, (c) => c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2), fill, base, lw);
}

/** Cream specular highlight (top-left light). */
export function hi(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.5, alpha = 0.75): void {
  ctx.fillStyle = rgba(P.cream, alpha);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

/** Small round highlight dot. */
export function dot(ctx: Ctx, x: number, y: number, r: number, color: string = P.cream, alpha = 1): void {
  ctx.fillStyle = alpha >= 1 ? color : rgba(color, alpha);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Contact shadow under an icon. */
export function ground(ctx: Ctx, y = 84, rx = 30, alpha = 0.16, x = CX): void {
  softShadow(ctx, x, y, rx, rx * 0.2, alpha);
}

/** Radial gradient for a round body lit from the top-left. */
export function ball(ctx: Ctx, x: number, y: number, r: number, base: string, lift = 0.45, sink = 0.12): CanvasGradient {
  return rGrad(ctx, x, y, 0, r * 1.25, [
    [0, tint(base, lift)],
    [0.55, base],
    [1, shade(base, sink)],
  ], x - r * 0.4, y - r * 0.45);
}

/** Vertical body gradient: light top, base, slightly deeper bottom. */
export function vbody(ctx: Ctx, y0: number, y1: number, base: string, lift = 0.3, sink = 0.1): CanvasGradient {
  return lGrad(ctx, 0, y0, 0, y1, [
    [0, tint(base, lift)],
    [0.5, base],
    [1, shade(base, sink)],
  ]);
}

/** Horizontal body gradient (light on the left). */
export function hbody(ctx: Ctx, x0: number, x1: number, base: string, lift = 0.3, sink = 0.1): CanvasGradient {
  return lGrad(ctx, x0, 0, x1, 0, [
    [0, tint(base, lift)],
    [0.45, base],
    [1, shade(base, sink)],
  ]);
}

/** Soft steam wisp (two S curves). */
export function steam(ctx: Ctx, x: number, y: number, h = 16, alpha = 0.6): void {
  withState(ctx, () => {
    ctx.strokeStyle = rgba(P.cream, alpha);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [dx, k] of [[-5, 1], [5, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.bezierCurveTo(x + dx + 5 * k, y - h * 0.3, x + dx - 5 * k, y - h * 0.6, x + dx + 2 * k, y - h);
      ctx.stroke();
    }
  });
}

/** Four-point twinkle in cream with a faint glow. */
export function twinkle(ctx: Ctx, x: number, y: number, r: number, color: string = P.cream, alpha = 0.95): void {
  withState(ctx, () => {
    ctx.fillStyle = rGrad(ctx, x, y, 0, r * 1.6, [
      [0, P.glow, 0.35 * alpha],
      [1, P.glow, 0],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    sparklePath(ctx, x, y, r);
    ctx.fill();
  });
}

/** Clip to a path and run fn (decor inside a body). */
export function clipTo(ctx: Ctx, path: Path2D, fn: () => void): void {
  withState(ctx, () => {
    ctx.clip(path);
    fn();
  });
}

/** Smooth closed Path2D through points. */
export function smoothPath(pts: Pt[], tension = 0.5): Path2D {
  const p = new Path2D();
  smoothClosed(p, pts, tension);
  return p;
}

/** Fill + outline a Path2D. */
export function fillPath(ctx: Ctx, path: Path2D, fill: string | CanvasGradient, base?: string, lw = OL): void {
  fillOutline(ctx, fill, base, lw, path);
}

/** A little sage leaf (pointed-oval, soft tip), with a midrib. */
export function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, rot: number, base: string = P.sage): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    shape(ctx, (c) => {
      c.moveTo(0, 0);
      c.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid, len, 0);
      c.bezierCurveTo(len * 0.75, wid, len * 0.25, wid, 0, 0);
      c.closePath();
    }, lGrad(ctx, 0, -wid, 0, wid, [[0, tint(base, 0.3)], [1, base]]), base, 2);
    line(ctx, (c) => {
      c.moveTo(len * 0.1, 0);
      c.quadraticCurveTo(len * 0.5, -wid * 0.12, len * 0.85, 0);
    }, rgba(shade(base, 0.25), 0.7), 1.4);
  });
}

/** Mix shortcut re-export for icon modules. */
export { mix, tint, shade, rgba };
