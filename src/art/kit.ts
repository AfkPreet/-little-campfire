import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { P, rgba, shade, mix } from '@/palette';

/**
 * Procedural art pipeline (spec section 10).
 *
 * Art modules (src/art/*.ts) export `bake(b: Baker)` and queue textures with
 * b.tex(key, w, h, draw). `draw` receives a 2D context pre-scaled so authors
 * work in LOGICAL px; the backing canvas is ART_SCALE x larger. Boot runs every
 * queued draw once, converts each canvas to an ImageBitmap and registers it as
 * a Phaser texture (canvases are released right away to stay under iOS Safari's
 * canvas-memory cap). Nothing is ever redrawn per frame.
 */

export type Ctx = CanvasRenderingContext2D;
export type DrawFn = (ctx: Ctx, w: number, h: number) => void;

interface TexJob {
  key: string;
  w: number;
  h: number;
  draw: DrawFn;
  /** For strips: chunk index + x offset in logical px. */
  chunk?: { x: number; cw: number };
}

export interface StripInfo {
  key: string;
  w: number;
  h: number;
  chunks: { key: string; x: number; w: number }[];
}

/** Largest device-pixel width of one texture chunk. */
const MAX_CHUNK_DEVICE_PX = 2048;

const strips = new Map<string, StripInfo>();
const sizes = new Map<string, { w: number; h: number }>();

export class Baker {
  readonly jobs: TexJob[] = [];

  /** Queue a single texture of logical size w x h. */
  tex(key: string, w: number, h: number, draw: DrawFn): void {
    this.jobs.push({ key, w, h, draw });
    sizes.set(key, { w, h });
  }

  /**
   * Queue a wide texture that is split into chunks automatically (for parallax
   * bands and long ground strips). Use addStrip() to display it.
   */
  strip(key: string, w: number, h: number, draw: DrawFn): void {
    const maxLogical = Math.floor(MAX_CHUNK_DEVICE_PX / ART_SCALE);
    const n = Math.max(1, Math.ceil(w / maxLogical));
    const cw = Math.ceil(w / n);
    const info: StripInfo = { key, w, h, chunks: [] };
    for (let i = 0; i < n; i++) {
      const x = i * cw;
      const thisW = Math.min(cw, w - x);
      const ck = `${key}#${i}`;
      info.chunks.push({ key: ck, x, w: thisW });
      this.jobs.push({ key: ck, w: thisW, h, draw, chunk: { x, cw: thisW } });
      sizes.set(ck, { w: thisW, h });
    }
    strips.set(key, info);
    sizes.set(key, { w, h });
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ART_SCALE));
  c.height = Math.max(1, Math.ceil(h * ART_SCALE));
  return c;
}

function renderJob(job: TexJob): HTMLCanvasElement {
  const c = makeCanvas(job.w, job.h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  if (job.chunk) {
    // Draw the whole strip, shifted, clipped to this chunk.
    ctx.beginPath();
    ctx.rect(0, 0, job.chunk.cw, job.h);
    ctx.clip();
    ctx.translate(-job.chunk.x, 0);
    const full = strips.get(job.key.split('#')[0]);
    job.draw(ctx, full ? full.w : job.w, job.h);
  } else {
    job.draw(ctx, job.w, job.h);
  }
  return c;
}

const canBitmap = typeof window !== 'undefined' && 'createImageBitmap' in window;

/** Render all queued jobs into Phaser textures. Yields to keep boot responsive. */
export async function bakeAll(
  textures: Phaser.Textures.TextureManager,
  baker: Baker,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = baker.jobs.length;
  let done = 0;
  let lastYield = performance.now();
  for (const job of baker.jobs) {
    if (textures.exists(job.key)) textures.remove(job.key);
    const canvas = renderJob(job);
    if (canBitmap) {
      try {
        const bmp = await createImageBitmap(canvas, { premultiplyAlpha: 'premultiply' });
        textures.addImage(job.key, bmp as unknown as HTMLImageElement);
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        textures.addCanvas(job.key, canvas);
      }
    } else {
      textures.addCanvas(job.key, canvas);
    }
    done++;
    if (performance.now() - lastYield > 24) {
      onProgress?.(done, total);
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }
  }
  onProgress?.(total, total);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Logical size of a baked texture. */
export function texSize(key: string): { w: number; h: number } {
  return sizes.get(key) ?? { w: 0, h: 0 };
}

/** Add a baked texture as an Image in logical units. */
export function art(scene: Phaser.Scene, x: number, y: number, key: string, frame?: string): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key, frame).setScale(1 / ART_SCALE);
}

/** Create (not add) an Image for use inside containers. */
export function artObj(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  return new Phaser.GameObjects.Image(scene, x, y, key).setScale(1 / ART_SCALE);
}

/** Scale an existing image to logical units, optionally multiplied. */
export function artScale(img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, k = 1): typeof img {
  img.setScale(k / ART_SCALE);
  return img;
}

/**
 * A wide baked strip shown as a row of images. Behaves like one object for
 * the things layers need (position, depth, tint, alpha, scroll factor).
 */
export class Strip {
  readonly images: Phaser.GameObjects.Image[] = [];
  readonly info: StripInfo;
  private _x = 0;
  private _y = 0;

  constructor(scene: Phaser.Scene, key: string, x: number, y: number, originY = 0) {
    const info = strips.get(key);
    if (!info) throw new Error(`Strip ${key} not baked`);
    this.info = info;
    for (const c of info.chunks) {
      const img = art(scene, 0, 0, c.key).setOrigin(0, originY);
      this.images.push(img);
    }
    this.setPosition(x, y);
  }

  setPosition(x: number, y: number): this {
    this._x = x;
    this._y = y;
    this.info.chunks.forEach((c, i) => this.images[i].setPosition(x + c.x, y));
    return this;
  }

  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }
  get width(): number {
    return this.info.w;
  }

  setDepth(d: number): this {
    this.images.forEach((i) => i.setDepth(d));
    return this;
  }
  setScrollFactor(x: number, y = 1): this {
    this.images.forEach((i) => i.setScrollFactor(x, y));
    return this;
  }
  setTint(c: number): this {
    this.images.forEach((i) => i.setTint(c));
    return this;
  }
  setAlpha(a: number): this {
    this.images.forEach((i) => i.setAlpha(a));
    return this;
  }
  setVisible(v: boolean): this {
    this.images.forEach((i) => i.setVisible(v));
    return this;
  }
  setBlendMode(m: Phaser.BlendModes | string): this {
    this.images.forEach((i) => i.setBlendMode(m));
    return this;
  }
  setFlipY(v: boolean): this {
    this.images.forEach((i) => i.setFlipY(v));
    return this;
  }
  setScaleY(s: number): this {
    this.images.forEach((i) => i.setScale(i.scaleX, s / ART_SCALE));
    return this;
  }
  destroy(): void {
    this.images.forEach((i) => i.destroy());
  }
}

export function addStrip(scene: Phaser.Scene, key: string, x: number, y: number, originY = 0): Strip {
  return new Strip(scene, key, x, y, originY);
}

export function stripInfo(key: string): StripInfo | undefined {
  return strips.get(key);
}

// ---------------------------------------------------------------------------
// Drawing helpers (logical px). Rounded everything; outlines are a darker
// shade of the fill, 2-3 px, never black.
// ---------------------------------------------------------------------------

export const OUTLINE = 2.5;

/** Small seeded RNG for art (mulberry32). */
export function artRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise for ridges, wobble etc. */
export function noise1(seed: number): (x: number) => number {
  const r = artRng(seed);
  const pts = Array.from({ length: 256 }, () => r());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = pts[((i % 256) + 256) % 256];
    const b = pts[(((i + 1) % 256) + 256) % 256];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

/** Fractal noise (sum of octaves) in 0..1. */
export function fbm(seed: number, octaves = 3): (x: number) => number {
  const ns = Array.from({ length: octaves }, (_, i) => noise1(seed + i * 101));
  return (x: number) => {
    let amp = 1;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (const n of ns) {
      sum += n(x * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

export function roundRectPath(ctx: Ctx | Path2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
  const rr = Array.isArray(r) ? r : [r, r, r, r];
  const [tl, tr, br, bl] = rr.map((v) => Math.max(0, Math.min(v, w / 2, h / 2)));
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/** Closed smooth curve through points (Catmull-Rom -> Bezier). */
export function smoothClosed(ctx: Ctx | Path2D, pts: [number, number][], tension = 0.5): void {
  const n = pts.length;
  if (n < 3) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const t = tension / 3;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * t,
      p1[1] + (p2[1] - p0[1]) * t,
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
      p2[0],
      p2[1],
    );
  }
  ctx.closePath();
}

/** Open smooth curve through points (no moveTo if `continuePath`). */
export function smoothOpen(ctx: Ctx | Path2D, pts: [number, number][], continuePath = false, tension = 0.5): void {
  const n = pts.length;
  if (n < 2) return;
  if (!continuePath) ctx.moveTo(pts[0][0], pts[0][1]);
  else ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const t = tension / 3;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * t,
      p1[1] + (p2[1] - p0[1]) * t,
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
      p2[0],
      p2[1],
    );
  }
}

/** Organic rounded blob around (cx, cy). wobble 0..0.3. */
export function blobPath(ctx: Ctx | Path2D, cx: number, cy: number, rx: number, ry: number, wobble = 0.08, seed = 1, points = 10): void {
  const r = artRng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + (r() * 2 - 1) * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  smoothClosed(ctx, pts);
}

export function ellipsePath(ctx: Ctx | Path2D, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
  ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

/** Linear vertical gradient with [offset, colour] or [offset, colour, alpha] stops. */
export function vGrad(ctx: Ctx, y0: number, y1: number, stops: [number, string, number?][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c, a] of stops) g.addColorStop(o, a === undefined ? c : rgba(c, a));
  return g;
}

export function lGrad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string, number?][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c, a] of stops) g.addColorStop(o, a === undefined ? c : rgba(c, a));
  return g;
}

export function rGrad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string, number?][], fx = x, fy = y): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  for (const [o, c, a] of stops) g.addColorStop(o, a === undefined ? c : rgba(c, a));
  return g;
}

/**
 * Fill the current path, then stroke it with a darker shade of `base`.
 * `fill` may be a gradient; `base` is the colour used to derive the outline.
 */
export function fillOutline(ctx: Ctx, fill: string | CanvasGradient, base?: string, width = OUTLINE, path?: Path2D): void {
  ctx.fillStyle = fill;
  if (path) ctx.fill(path);
  else ctx.fill();
  const b = base ?? (typeof fill === 'string' ? fill : P.bark);
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(b, 0.28);
  if (path) ctx.stroke(path);
  else ctx.stroke();
}

/** Run fn with a temporary state (save/restore). */
export function withState(ctx: Ctx, fn: () => void): void {
  ctx.save();
  fn();
  ctx.restore();
}

/** Soft ink-tinted contact shadow (never grey/black). */
export function softShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.18): void {
  withState(ctx, () => {
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = rGrad(ctx, 0, 0, 0, rx, [
      [0, P.ink, alpha],
      [0.6, P.ink, alpha * 0.55],
      [1, P.ink, 0],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Radial glow disc. */
export function glowDisc(ctx: Ctx, x: number, y: number, r: number, color: string, core = 1, falloff = 1): void {
  ctx.fillStyle = rGrad(ctx, x, y, 0, r, [
    [0, color, core],
    [0.25 * falloff, color, core * 0.55],
    [0.6, color, core * 0.14],
    [1, color, 0],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Faint paper grain over the current clip, seeded. */
export function grain(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.05, seed = 7, density = 0.35): void {
  const r = artRng(seed);
  const n = Math.floor(w * h * density * 0.02);
  withState(ctx, () => {
    for (let i = 0; i < n; i++) {
      const px = x + r() * w;
      const py = y + r() * h;
      const dark = r() < 0.5;
      ctx.fillStyle = rgba(dark ? P.bark : P.cream, alpha * (0.4 + r() * 0.6));
      const s = 0.6 + r() * 1.1;
      ctx.beginPath();
      ctx.ellipse(px, py, s, s * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Cute eye: ink oval + 1-2 cream highlight dots. */
export function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, look = 0): void {
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.cream;
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3 + look * rx * 0.2, y - ry * 0.35, rx * 0.36, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rx * 0.32 + look * rx * 0.2, y + ry * 0.3, Math.max(0.6, rx * 0.16), 0, Math.PI * 2);
  ctx.fill();
}

/** Happy closed eye ^ */
export function eyeHappy(ctx: Ctx, x: number, y: number, w: number, lw = 2.4): void {
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + w * 0.18);
  ctx.quadraticCurveTo(x, y - w * 0.42, x + w / 2, y + w * 0.18);
  ctx.stroke();
}

/** Closed sleepy/blissful eye (downward arc). */
export function eyeClosed(ctx: Ctx, x: number, y: number, w: number, lw = 2.4): void {
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - w * 0.08);
  ctx.quadraticCurveTo(x, y + w * 0.34, x + w / 2, y - w * 0.08);
  ctx.stroke();
}

/** Blush oval at 60% alpha. */
export function blush(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.6): void {
  ctx.fillStyle = rGrad(ctx, x, y, 0, rx, [
    [0, P.blush, alpha],
    [0.7, P.blush, alpha * 0.8],
    [1, P.blush, 0],
  ]);
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.translate(-x, -y);
    ctx.fill();
  });
}

/** Tiny mouth shapes. */
export function mouth(ctx: Ctx, x: number, y: number, w: number, kind: 'smile' | 'open' | 'o' | 'flat' | 'w' | 'munch' = 'smile', lw = 2): void {
  ctx.strokeStyle = P.ink;
  ctx.fillStyle = mix(P.rose, P.ink, 0.35);
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'smile':
      ctx.moveTo(x - w / 2, y);
      ctx.quadraticCurveTo(x, y + w * 0.55, x + w / 2, y);
      ctx.stroke();
      break;
    case 'w':
      ctx.moveTo(x - w / 2, y);
      ctx.quadraticCurveTo(x - w / 4, y + w * 0.45, x, y);
      ctx.quadraticCurveTo(x + w / 4, y + w * 0.45, x + w / 2, y);
      ctx.stroke();
      break;
    case 'open':
      ctx.moveTo(x - w / 2, y);
      ctx.quadraticCurveTo(x, y + w * 0.95, x + w / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'o':
      ctx.ellipse(x, y + w * 0.2, w * 0.28, w * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'munch':
      ctx.moveTo(x - w / 2, y + w * 0.1);
      ctx.quadraticCurveTo(x - w / 4, y - w * 0.15, x, y + w * 0.1);
      ctx.quadraticCurveTo(x + w / 4, y - w * 0.15, x + w / 2, y + w * 0.1);
      ctx.stroke();
      break;
    case 'flat':
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.stroke();
      break;
  }
}

/** Small 5-point rounded star (rarity, sparkles). */
export function starPath(ctx: Ctx | Path2D, cx: number, cy: number, r: number, inner = 0.48, points = 5, rot = -Math.PI / 2): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // Rounded star: smooth with low tension so tips stay soft but readable.
  smoothClosed(ctx, pts, 0.18);
}

/** Four-point sparkle. */
export function sparklePath(ctx: Ctx | Path2D, cx: number, cy: number, r: number): void {
  const k = r * 0.22;
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + k, cy - k, cx + r, cy);
  ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
  ctx.quadraticCurveTo(cx - k, cy + k, cx - r, cy);
  ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
  ctx.closePath();
}

export function heartPath(ctx: Ctx | Path2D, cx: number, cy: number, s: number): void {
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.3, cy + s * 0.1, cx - s * 0.9, cy - s * 0.9, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.9, cx + s * 1.3, cy + s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
}
