/**
 * UI kit textures (spec sections 7 and 8, "UI kit"). Everything is baked once
 * at boot at ART_SCALE; components in src/ui/* show them as nine-slices so a
 * card or button of any size keeps crisp 20 px corners and 2-3 px outlines.
 *
 * Panels (nine-slice, see SLICES):
 *   ui.card.<cream|butter|sage|lavender|peach>   paper card, radius 20
 *   ui.face.<FaceTint>, ui.lip.<FaceTint>         chunky button face + its lip
 *   ui.tab.off, ui.pill, ui.bubble, ui.well, ui.track, ui.trackFill, ui.bar,
 *   ui.banner (3-slice ribbon)
 *   ui.shadow.<card|btn|pill|round|knob>          soft ink-tinted shadows
 * Fixed pieces: ui.round.<FaceTint>, ui.roundLip.<FaceTint>, ui.knob,
 *   ui.knobLip, ui.toggle.on, ui.toggle.off, ui.offRing, ui.bubbleTail, ui.grain
 * Icons (48 x 48 logical unless noted): see ICONS below.
 */
import Phaser from 'phaser';
import {
  Baker,
  OUTLINE,
  artObj,
  artRng,
  ellipsePath,
  eyeClosed,
  eyeHappy,
  fillOutline,
  glowDisc,
  heartPath,
  rGrad,
  roundRectPath,
  smoothClosed,
  starPath,
  vGrad,
  withState,
  blush as blushOval,
  mouth,
  type Ctx,
} from './kit';
import { ART_SCALE } from '@/core/layout';
import { P, mix, rgba, shade } from '@/palette';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type CardTint = 'cream' | 'butter' | 'sage' | 'lavender' | 'peach';
export type FaceTint = 'butter' | 'peach' | 'cream' | 'sage' | 'lavender' | 'off';

/** Paper fills for cards. Tinted papers are washed toward cream so text stays readable. */
export const CARD_FILL: Record<CardTint, string> = {
  cream: P.cream,
  butter: mix(P.butter, P.cream, 0.45),
  sage: mix(P.sage, P.cream, 0.58),
  lavender: mix(P.lavender, P.cream, 0.58),
  peach: mix(P.peach, P.cream, 0.55),
};

/** Outline for a paper fill: a darker shade, never black. */
export function paperLine(fill: string): string {
  return shade(mix(fill, P.bark, 0.18), 0.16);
}

/** Button face colours: [top, bottom] of the vertical gradient. */
export const FACE: Record<FaceTint, { top: string; bot: string; base: string }> = {
  butter: { top: mix(P.butter, P.cream, 0.4), bot: P.butter, base: P.butter },
  peach: { top: mix(P.peach, P.cream, 0.42), bot: mix(P.peach, P.butter, 0.12), base: mix(P.peach, P.bark, 0.16) },
  cream: { top: P.cream, bot: mix(P.cream, P.butter, 0.22), base: mix(P.cream, P.bark, 0.12) },
  sage: { top: mix(P.sage, P.cream, 0.45), bot: mix(P.sage, P.cream, 0.08), base: P.sage },
  lavender: { top: mix(P.lavender, P.cream, 0.45), bot: mix(P.lavender, P.cream, 0.1), base: P.lavender },
  off: { top: mix(P.cream, P.lavender, 0.16), bot: mix(P.cream, P.lavender, 0.3), base: mix(P.cream, P.lavender, 0.45) },
};

export function faceLine(t: FaceTint): string {
  return shade(FACE[t].base, 0.3);
}

/** Text colours used across the kit. */
export const UI_INK = P.ink;
export const UI_INK_SOFT = mix(P.ink, P.cream, 0.3);
export const UI_INK_FAINT = mix(P.ink, P.cream, 0.5);

/** Radius of cards (spec: 20 px). */
export const CARD_R = 20;
/** Radius of chunky button faces. */
export const FACE_R = 22;

// ---------------------------------------------------------------------------
// Nine-slice registry (logical px). `pad` is the transparent margin around a
// shadow shape: display shadows at (w + 2 pad) x (h + 2 pad).
// ---------------------------------------------------------------------------

export interface SliceDef {
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
  pad: number;
}

function sd(w: number, h: number, inset: number, pad = 0, tb?: number): SliceDef {
  return { w, h, l: inset, r: inset, t: tb ?? inset, b: tb ?? inset, pad };
}

const SHADOW_PAD = { card: 24, btn: 16, pill: 18, round: 16, knob: 12 };

export const SLICES: Record<string, SliceDef> = {
  card: sd(96, 96, 28),
  face: sd(76, 76, 30),
  tabOff: sd(76, 76, 30),
  pill: sd(80, 56, 30, 0, 27),
  bubble: sd(80, 56, 30, 0, 27),
  well: sd(64, 64, 24),
  track: sd(40, 18, 10, 0, 8),
  trackFill: sd(40, 18, 10, 0, 8),
  bar: sd(24, 7, 5, 0, 0),
  banner: { w: 260, h: 104, l: 68, r: 68, t: 0, b: 0, pad: 0 },
  'shadow.card': sd(96 + 2 * SHADOW_PAD.card, 96 + 2 * SHADOW_PAD.card, SHADOW_PAD.card + 30, SHADOW_PAD.card),
  'shadow.btn': sd(76 + 2 * SHADOW_PAD.btn, 76 + 2 * SHADOW_PAD.btn, SHADOW_PAD.btn + 30, SHADOW_PAD.btn),
  'shadow.pill': sd(80 + 2 * SHADOW_PAD.pill, 56 + 2 * SHADOW_PAD.pill, SHADOW_PAD.pill + 28, SHADOW_PAD.pill),
};

/** Slice definition for a texture key like 'ui.card.sage' or 'ui.shadow.btn'. */
export function sliceOf(key: string): SliceDef {
  const k = key.replace(/^ui\./, '');
  if (SLICES[k]) return SLICES[k];
  const base = k.split('.')[0];
  if (base === 'card') return SLICES.card;
  if (base === 'face' || base === 'lip') return SLICES.face;
  if (base === 'tab') return SLICES.tabOff;
  const d = SLICES[base];
  if (!d) throw new Error(`ui: no slice definition for ${key}`);
  return d;
}

// ---------------------------------------------------------------------------
// Display helpers: NineSlice in WebGL, a 9-image container on Canvas.
// ---------------------------------------------------------------------------

/** Nine-slice fallback for the Canvas renderer (NineSlice is WebGL-only). */
export class Slice9 extends Phaser.GameObjects.Container {
  private parts: Phaser.GameObjects.Image[] = [];
  private def: SliceDef;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, def: SliceDef, w: number, h: number) {
    super(scene, x, y);
    this.def = def;
    const tex = scene.textures.get(key);
    const T = ART_SCALE;
    const fw = tex.source[0].width;
    const fh = tex.source[0].height;
    const xs = [0, Math.round(def.l * T), fw - Math.round(def.r * T), fw];
    const ys = def.t || def.b ? [0, Math.round(def.t * T), fh - Math.round(def.b * T), fh] : [0, 0, fh, fh];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const name = `s9_${i}_${j}`;
        const sw = xs[i + 1] - xs[i];
        const sh = ys[j + 1] - ys[j];
        if (!tex.has(name) && sw > 0 && sh > 0) tex.add(name, 0, xs[i], ys[j], sw, sh);
        const img = new Phaser.GameObjects.Image(scene, 0, 0, key, tex.has(name) ? name : undefined).setOrigin(0);
        img.setVisible(sw > 0 && sh > 0);
        this.parts.push(img);
        this.add(img);
      }
    }
    this.resize(w, h);
  }

  resize(w: number, h: number): this {
    const d = this.def;
    const fixedH = !(d.t || d.b);
    const hh = fixedH ? d.h : h;
    const cols = [d.l, Math.max(0, w - d.l - d.r), d.r];
    const rows = fixedH ? [0, hh, 0] : [d.t, Math.max(0, hh - d.t - d.b), d.b];
    const srcCols = [d.l, d.w - d.l - d.r, d.r];
    const srcRows = fixedH ? [0, d.h, 0] : [d.t, d.h - d.t - d.b, d.b];
    let y = -hh / 2;
    for (let j = 0; j < 3; j++) {
      let x = -w / 2;
      for (let i = 0; i < 3; i++) {
        const img = this.parts[j * 3 + i];
        img.setPosition(x, y);
        const sx = srcCols[i] > 0 ? cols[i] / srcCols[i] : 0;
        const sy = srcRows[j] > 0 ? rows[j] / srcRows[j] : 0;
        img.setScale(sx / ART_SCALE, sy / ART_SCALE);
        x += cols[i];
      }
      y += rows[j];
    }
    return this;
  }

  setTint(c?: number): this {
    this.parts.forEach((p) => (c === undefined ? p.clearTint() : p.setTint(c)));
    return this;
  }

  clearTint(): this {
    this.parts.forEach((p) => p.clearTint());
    return this;
  }
}

export type Panel = Phaser.GameObjects.NineSlice | Slice9;

/** A nine-slice panel of logical size w x h centred on (x, y). Not added to the scene. */
export function panel(scene: Phaser.Scene, key: string, w: number, h: number, x = 0, y = 0): Panel {
  const d = sliceOf(key);
  const T = ART_SCALE;
  if (scene.sys.renderer.type === Phaser.WEBGL) {
    const threeSlice = !(d.t || d.b);
    const ns = new Phaser.GameObjects.NineSlice(
      scene,
      x,
      y,
      key,
      undefined,
      Math.round(Math.max(w, d.l + d.r) * T),
      threeSlice ? 0 : Math.round(Math.max(h, d.t + d.b) * T),
      Math.round(d.l * T),
      Math.round(d.r * T),
      Math.round(d.t * T),
      Math.round(d.b * T),
    );
    ns.setScale(1 / T);
    return ns;
  }
  return new Slice9(scene, x, y, key, d, Math.max(w, d.l + d.r), Math.max(h, d.t + d.b));
}

/** Resize a panel made by panel(). */
export function resizePanel(p: Panel, w: number, h: number): void {
  if (p instanceof Slice9) {
    p.resize(w, h);
    return;
  }
  const T = ART_SCALE;
  p.setSize(Math.round(Math.max(w, (p.leftWidth + p.rightWidth) / T) * T), Math.round(Math.max(h, (p.topHeight + p.bottomHeight) / T) * T));
}

/** A soft ink shadow for a panel of size w x h (shape size, padding added here). */
export function shadowPanel(scene: Phaser.Scene, kind: 'card' | 'btn' | 'pill', w: number, h: number, x = 0, y = 0, alpha = 0.15): Panel {
  const pad = SHADOW_PAD[kind];
  const p = panel(scene, `ui.shadow.${kind}`, w + 2 * pad, h + 2 * pad, x, y);
  p.setAlpha(alpha);
  return p;
}

export function resizeShadow(p: Panel, kind: 'card' | 'btn' | 'pill', w: number, h: number): void {
  const pad = SHADOW_PAD[kind];
  resizePanel(p, w + 2 * pad, h + 2 * pad);
}

/** An icon (or any baked texture) shown at `size` logical px on its longest side. */
export function iconObj(scene: Phaser.Scene, x: number, y: number, key: string, size?: number): Phaser.GameObjects.Image {
  const img = artObj(scene, x, y, key);
  if (size) {
    const fw = img.frame.realWidth / ART_SCALE;
    const fh = img.frame.realHeight / ART_SCALE;
    img.setScale((size / Math.max(fw, fh)) / ART_SCALE);
  }
  return img;
}

/**
 * Faint paper grain laid over a w x h rounded panel centred on (cx, cy) as a
 * few cropped tiles (no per-object canvases). Inset keeps it inside the corners.
 */
export function addGrain(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, w: number, h: number, alpha = 1, cx = 0, cy = 0, inset = 7): Phaser.GameObjects.Image[] {
  const out: Phaser.GameObjects.Image[] = [];
  const gw = w - inset * 2;
  const gh = h - inset * 2;
  const tile = GRAIN_TILE;
  for (let y = 0; y < gh; y += tile) {
    for (let x = 0; x < gw; x += tile) {
      const cw = Math.min(tile, gw - x);
      const ch = Math.min(tile, gh - y);
      const img = artObj(scene, cx - w / 2 + inset + x, cy - h / 2 + inset + y, 'ui.grain').setOrigin(0).setAlpha(alpha);
      img.setCrop(0, 0, Math.ceil(cw * ART_SCALE), Math.ceil(ch * ART_SCALE));
      parent.add(img);
      out.push(img);
    }
  }
  return out;
}

const GRAIN_TILE = 128;

/** Icon texture keys baked by this module. */
export const ICONS = [
  'icon.coin',
  'icon.sun',
  'icon.moon',
  'icon.lantern',
  'icon.lanternLit',
  'icon.lanternGlow',
  'icon.backpack',
  'icon.journal',
  'icon.settings',
  'icon.close',
  'icon.arrowLeft',
  'icon.arrowRight',
  'icon.check',
  'icon.star',
  'icon.starEmpty',
  'icon.leafTag',
  'icon.ribbon',
  'icon.heartFull',
  'icon.heartEmpty',
  'icon.speaker',
  'icon.music',
  'icon.minus',
  'icon.plus',
] as const;

export type IconKey = (typeof ICONS)[number];

// ---------------------------------------------------------------------------
// Drawing helpers local to the UI kit
// ---------------------------------------------------------------------------

/** Rounded rect with a vertical gradient, soft top highlight and outline. */
function drawFace(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, top: string, bot: string, line: string, hi = 0.55, lw = OUTLINE): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = vGrad(ctx, y, y + h, [
    [0, top],
    [1, bot],
  ]);
  ctx.fill();
  if (hi > 0) {
    // Soft inner highlight hugging the top edge (stays in the top slice).
    withState(ctx, () => {
      ctx.beginPath();
      ctx.rect(x, y, w, Math.min(r, h / 2));
      ctx.clip();
      ctx.beginPath();
      roundRectPath(ctx, x + lw + 1, y + lw + 1, w - 2 * lw - 2, h - 2 * lw - 2, Math.max(1, r - lw - 1));
      ctx.strokeStyle = rgba(P.cream, hi);
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });
  }
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = line;
  ctx.stroke();
}

/** A sunken well (inner shadow at the top), for tracks and value displays. */
function drawWell(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, line: string, lw = 2): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  withState(ctx, () => {
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.beginPath();
    roundRectPath(ctx, x - 6, y + Math.min(4, h * 0.22), w + 12, h + 10, r + 4);
    roundRectPath(ctx, x - 20, y - 20, w + 40, h + 40, r);
    ctx.fillStyle = rgba(P.ink, 0.1);
    ctx.fill('evenodd');
  });
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = lw;
  ctx.strokeStyle = line;
  ctx.stroke();
}

/** Blurred ink shape used as a soft drop shadow (blur in logical px). */
function shadowTex(b: Baker, key: string, w: number, h: number, r: number, blur: number, pad: number): void {
  b.tex(key, w + pad * 2, h + pad * 2, (ctx) => {
    const off = 4000;
    ctx.shadowColor = rgba(P.ink, 1);
    // Canvas shadows ignore the transform, so convert to device px.
    ctx.shadowBlur = blur * ART_SCALE;
    ctx.shadowOffsetX = off * ART_SCALE;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    roundRectPath(ctx, pad - off, pad, w, h, r);
    ctx.fill();
  });
}

/** Stroke a path twice (dark wide, then light narrow) for outlined strokes. */
function outlinedStroke(ctx: Ctx, path: (c: Ctx) => void, fill: string, width: number, line = shade(fill, 0.32), edge = 2.2): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = line;
  ctx.lineWidth = width + edge * 2;
  ctx.stroke();
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Tiny cream highlight (a soft oval) used on most icons. */
function hilite(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.6, a = 0.75): void {
  ctx.fillStyle = rgba(P.cream, a);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}

/** Crescent between circle 1 and the part of it not covered by circle 2. */
function crescentPath(ctx: Ctx, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = x1 + (a * dx) / d;
  const my = y1 + (a * dy) / d;
  const p1: [number, number] = [mx + (hh * dy) / d, my - (hh * dx) / d];
  const p2: [number, number] = [mx - (hh * dy) / d, my + (hh * dx) / d];
  const ang = (cx: number, cy: number, p: [number, number]) => Math.atan2(p[1] - cy, p[0] - cx);
  const a1 = ang(x1, y1, p1);
  const a2 = ang(x1, y1, p2);
  // Outer arc: the direction whose midpoint is outside circle 2.
  const span = (s: number, e: number, acw: boolean) => {
    let dd = acw ? s - e : e - s;
    dd = ((dd % TAU) + TAU) % TAU;
    return dd;
  };
  const midOuter = (acw: boolean) => {
    const m = acw ? a1 - span(a1, a2, true) / 2 : a1 + span(a1, a2, false) / 2;
    return [x1 + Math.cos(m) * r1, y1 + Math.sin(m) * r1];
  };
  const mo = midOuter(false);
  const outerAcw = Math.hypot(mo[0] - x2, mo[1] - y2) < r2;
  const b1 = ang(x2, y2, p1);
  const b2 = ang(x2, y2, p2);
  const midInner = (acw: boolean) => {
    const m = acw ? b2 - span(b2, b1, true) / 2 : b2 + span(b2, b1, false) / 2;
    return [x2 + Math.cos(m) * r2, y2 + Math.sin(m) * r2];
  };
  const mi = midInner(false);
  const innerAcw = Math.hypot(mi[0] - x1, mi[1] - y1) > r1;
  ctx.moveTo(p1[0], p1[1]);
  ctx.arc(x1, y1, r1, a1, a2, outerAcw);
  ctx.arc(x2, y2, r2, b2, b1, innerAcw);
  ctx.closePath();
}

/** Ribbon with notched tails folding behind the band. */
function drawRibbon(ctx: Ctx, w: number, h: number, band: { top: string; bot: string }, tail: string, bandH: number, tailW: number, drop: number, r = 8): void {
  const by = (h - bandH - drop) / 2;
  const tailLine = shade(tail, 0.3);
  const bandLine = shade(mix(band.bot, P.bark, 0.1), 0.26);
  // Tails (behind), each with a V notch at the outer end.
  for (const side of [-1, 1]) {
    withState(ctx, () => {
      if (side === 1) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      const x0 = 3;
      const x1 = tailW + 10;
      const y0 = by + drop;
      const y1 = by + bandH + drop;
      const notch = tailW * 0.34;
      ctx.beginPath();
      ctx.moveTo(x0 + 2, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x0 + 2, y1);
      ctx.quadraticCurveTo(x0 - 1, y1, x0 + 1, y1 - 3);
      ctx.lineTo(x0 + notch, (y0 + y1) / 2);
      ctx.lineTo(x0 + 1, y0 + 3);
      ctx.quadraticCurveTo(x0 - 1, y0, x0 + 2, y0);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, y0, y1, [
        [0, mix(tail, P.cream, 0.12)],
        [1, tail],
      ]);
      ctx.fill();
      ctx.lineWidth = OUTLINE;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = tailLine;
      ctx.stroke();
      // Fold: a small darker triangle tucking the tail under the band.
      ctx.beginPath();
      ctx.moveTo(tailW + 8, by + bandH - 2);
      ctx.lineTo(tailW + 22, by + bandH - 2);
      ctx.lineTo(tailW + 22, by + bandH + drop);
      ctx.lineTo(tailW + 10, by + bandH + drop);
      ctx.closePath();
      ctx.fillStyle = shade(tail, 0.2);
      ctx.fill();
      ctx.strokeStyle = tailLine;
      ctx.stroke();
    });
  }
  // Band.
  drawFace(ctx, tailW + 6, by, w - (tailW + 6) * 2, bandH, r, band.top, band.bot, bandLine, 0.6);
}

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export function bake(b: Baker): void {
  bakePanels(b);
  bakePieces(b);
  bakeIcons(b);
}

function bakePanels(b: Baker): void {
  const lw = OUTLINE;
  // Cards: paper with a soft vertical wash.
  const card = SLICES.card;
  (Object.keys(CARD_FILL) as CardTint[]).forEach((t) => {
    const f = CARD_FILL[t];
    b.tex(`ui.card.${t}`, card.w, card.h, (ctx, w, h) => {
      const top = t === 'cream' ? mix(P.cream, P.butter, 0.04) : mix(f, P.cream, 0.25);
      const bot = t === 'cream' ? mix(P.cream, P.peach, 0.1) : f;
      drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, CARD_R, top, bot, paperLine(f), 0.5, lw);
    });
  });

  // Chunky faces + lips.
  const face = SLICES.face;
  (Object.keys(FACE) as FaceTint[]).forEach((t) => {
    const c = FACE[t];
    const line = faceLine(t);
    b.tex(`ui.face.${t}`, face.w, face.h, (ctx, w, h) => {
      drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, FACE_R, c.top, c.bot, line, t === 'off' ? 0.3 : 0.75, lw);
    });
    b.tex(`ui.lip.${t}`, face.w, face.h, (ctx, w, h) => {
      const lip = shade(c.base, t === 'cream' ? 0.08 : 0.12);
      drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, FACE_R, lip, shade(c.base, 0.18), line, 0, lw);
    });
  });

  // Unselected tab: a flatter, cooler paper.
  b.tex('ui.tab.off', SLICES.tabOff.w, SLICES.tabOff.h, (ctx, w, h) => {
    const f = mix(P.cream, P.lavender, 0.24);
    drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, FACE_R, mix(f, P.cream, 0.35), f, shade(mix(P.cream, P.lavender, 0.4), 0.18), 0.4, lw);
  });

  // Toast pill.
  b.tex('ui.pill', SLICES.pill.w, SLICES.pill.h, (ctx, w, h) => {
    drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, (h - lw) / 2, P.cream, mix(P.cream, P.butter, 0.2), paperLine(P.cream), 0.6, lw);
  });

  // Action bubble body (same paper, rounder).
  b.tex('ui.bubble', SLICES.bubble.w, SLICES.bubble.h, (ctx, w, h) => {
    drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, 24, P.cream, BUBBLE_BOT, paperLine(P.cream), 0.7, lw);
  });

  // Sunken well (stepper value, slider track).
  b.tex('ui.well', SLICES.well.w, SLICES.well.h, (ctx, w, h) => {
    drawWell(ctx, lw / 2, lw / 2, w - lw, h - lw, 18, mix(P.cream, P.bark, 0.07), paperLine(P.cream), lw);
  });
  b.tex('ui.track', SLICES.track.w, SLICES.track.h, (ctx, w, h) => {
    drawWell(ctx, 1, 1, w - 2, h - 2, (h - 2) / 2, mix(P.cream, P.lavender, 0.22), shade(mix(P.cream, P.lavender, 0.3), 0.16), 2);
  });
  b.tex('ui.trackFill', SLICES.trackFill.w, SLICES.trackFill.h, (ctx, w, h) => {
    drawFace(ctx, 1, 1, w - 2, h - 2, (h - 2) / 2, mix(P.butter, P.cream, 0.25), mix(P.butter, P.peach, 0.2), shade(P.butter, 0.28), 0.6, 2);
  });
  b.tex('ui.bar', SLICES.bar.w, SLICES.bar.h, (ctx, w, h) => {
    ctx.beginPath();
    roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, (h - 1) / 2);
    ctx.fillStyle = mix(P.rose, P.ember, 0.18);
    ctx.fill();
  });

  // Moment banner ribbon (3-slice).
  const bn = SLICES.banner;
  b.tex('ui.banner', bn.w, bn.h, (ctx, w, h) => {
    drawRibbon(ctx, w, h, { top: mix(P.cream, P.butter, 0.2), bot: mix(P.cream, P.butter, 0.55) }, mix(P.peach, P.rose, 0.35), 66, 46, 16, 12);
  });

  // Shadows.
  shadowTex(b, 'ui.shadow.card', card.w, card.h, CARD_R, 12, SHADOW_PAD.card);
  shadowTex(b, 'ui.shadow.btn', face.w, face.h, FACE_R, 7, SHADOW_PAD.btn);
  shadowTex(b, 'ui.shadow.pill', SLICES.pill.w, SLICES.pill.h, SLICES.pill.h / 2, 9, SHADOW_PAD.pill);
}

const BUBBLE_BOT = mix(P.cream, P.butter, 0.24);

/** Diameter of the baked round button face (IconButton scales it). */
export const ROUND_D = 64;
export const KNOB_D = 40;
export const TOGGLE_W = 86;
export const TOGGLE_H = 48;

function bakePieces(b: Baker): void {
  const lw = OUTLINE;
  // Round faces and lips (IconButton).
  (Object.keys(FACE) as FaceTint[]).forEach((t) => {
    const c = FACE[t];
    const line = faceLine(t);
    b.tex(`ui.round.${t}`, ROUND_D, ROUND_D, (ctx, w, h) => {
      drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, (w - lw) / 2, c.top, c.bot, line, t === 'off' ? 0.3 : 0.75, lw);
    });
    b.tex(`ui.roundLip.${t}`, ROUND_D, ROUND_D, (ctx, w, h) => {
      drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, (w - lw) / 2, shade(c.base, 0.12), shade(c.base, 0.18), line, 0, lw);
    });
  });
  shadowTex(b, 'ui.shadow.round', ROUND_D, ROUND_D, ROUND_D / 2, 7, SHADOW_PAD.round);

  // Slider/toggle knob.
  b.tex('ui.knob', KNOB_D, KNOB_D, (ctx, w, h) => {
    drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, (w - lw) / 2, P.cream, mix(P.cream, P.butter, 0.25), paperLine(P.cream), 0.8, lw);
  });
  b.tex('ui.knobLip', KNOB_D, KNOB_D, (ctx, w, h) => {
    const base = mix(P.cream, P.bark, 0.14);
    drawFace(ctx, lw / 2, lw / 2, w - lw, h - lw, (w - lw) / 2, shade(base, 0.06), shade(base, 0.12), paperLine(P.cream), 0, lw);
  });
  shadowTex(b, 'ui.shadow.knob', KNOB_D, KNOB_D, KNOB_D / 2, 6, SHADOW_PAD.knob);
  // Knob grip: two tiny soft grooves.
  b.tex('ui.grip', 16, 16, (ctx) => {
    ctx.strokeStyle = rgba(shade(mix(P.cream, P.bark, 0.2), 0.12), 0.75);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(5, 3.5);
    ctx.lineTo(5, 12.5);
    ctx.moveTo(11, 3.5);
    ctx.lineTo(11, 12.5);
    ctx.stroke();
  });

  // Toggle tracks (fixed size).
  b.tex('ui.toggle.off', TOGGLE_W, TOGGLE_H, (ctx, w, h) => {
    drawWell(ctx, lw / 2, lw / 2, w - lw, h - lw, (h - lw) / 2, mix(P.cream, P.lavender, 0.3), shade(mix(P.cream, P.lavender, 0.45), 0.2), lw);
  });
  b.tex('ui.toggle.on', TOGGLE_W, TOGGLE_H, (ctx, w, h) => {
    drawWell(ctx, lw / 2, lw / 2, w - lw, h - lw, (h - lw) / 2, mix(P.sage, P.cream, 0.15), shade(P.sage, 0.28), lw);
  });
  // "Off" glyph for the toggle knob: a small hollow ring (shape, not colour).
  b.tex('ui.offRing', 24, 24, (ctx) => {
    ctx.beginPath();
    ctx.arc(12, 12, 6.5, 0, TAU);
    ctx.strokeStyle = shade(mix(P.cream, P.lavender, 0.5), 0.12);
    ctx.lineWidth = 3.2;
    ctx.stroke();
  });

  // Bubble tail: fill overlaps the body's bottom edge; only the sides are outlined.
  b.tex('ui.bubbleTail', 32, 24, (ctx) => {
    const line = paperLine(P.cream);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(32, 0);
    ctx.lineTo(28, 4);
    ctx.quadraticCurveTo(20, 9, 17.5, 19);
    ctx.quadraticCurveTo(16, 22.5, 14.5, 19);
    ctx.quadraticCurveTo(12, 9, 4, 4);
    ctx.closePath();
    ctx.fillStyle = BUBBLE_BOT;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(28, 4);
    ctx.quadraticCurveTo(20, 9, 17.5, 19);
    ctx.quadraticCurveTo(16, 22.5, 14.5, 19);
    ctx.quadraticCurveTo(12, 9, 4, 4);
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  });

  // Paper grain tile: sparse warm specks and the odd fibre. Tileable.
  b.tex('ui.grain', GRAIN_TILE, GRAIN_TILE, (ctx, w, h) => {
    const r = artRng(4242);
    const speck = (x: number, y: number, s: number, col: string, a: number, rot: number) => {
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          const px = x + ox;
          const py = y + oy;
          if (px < -4 || px > w + 4 || py < -4 || py > h + 4) continue;
          ctx.fillStyle = rgba(col, a);
          ctx.beginPath();
          ctx.ellipse(px, py, s, s * 0.7, rot, 0, TAU);
          ctx.fill();
        }
      }
    };
    for (let i = 0; i < 260; i++) {
      const dark = r() < 0.7;
      speck(r() * w, r() * h, 0.45 + r() * 0.75, dark ? P.bark : P.cream, dark ? 0.05 + r() * 0.06 : 0.5, r() * Math.PI);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = 6 + r() * (w - 12);
      const y = 6 + r() * (h - 12);
      const a = r() * Math.PI;
      const len = 3 + r() * 5;
      ctx.strokeStyle = rgba(P.bark, 0.05 + r() * 0.03);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 1, y + Math.sin(a) * len * 0.5 - 1, x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  });
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** Shared stroke-icon colour (arrows, plus/minus): a soft bark-plum. */
const GLYPH = mix(P.bark, P.lavender, 0.35);

function bakeIcons(b: Baker): void {
  // Coin: generic currency (the world may restyle it).
  b.tex('icon.coin', 48, 48, (ctx) => {
    const cx = 24;
    const cy = 22.5;
    const r = 18;
    const edge = mix(P.butter, P.ember, 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy + 3.2, r, 0, TAU);
    fillOutline(ctx, shade(edge, 0.12), P.butter);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    fillOutline(
      ctx,
      rGrad(ctx, cx - 6, cy - 7, 1, r * 1.35, [
        [0, mix(P.butter, P.cream, 0.55)],
        [0.55, P.butter],
        [1, edge],
      ]),
      P.butter,
    );
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, TAU);
    ctx.strokeStyle = rgba(shade(P.butter, 0.22), 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Embossed leaf.
    withState(ctx, () => {
      ctx.translate(cx, cy);
      ctx.rotate(-0.7);
      ctx.beginPath();
      ctx.moveTo(-7.5, 0);
      ctx.quadraticCurveTo(0, -6.5, 7.5, 0);
      ctx.quadraticCurveTo(0, 6.5, -7.5, 0);
      ctx.closePath();
      ctx.fillStyle = mix(P.butter, P.ember, 0.12);
      ctx.fill();
      ctx.strokeStyle = shade(P.butter, 0.26);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5.5, 0);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2.6, Math.PI * 1.08, Math.PI * 1.42);
    ctx.strokeStyle = rgba(P.cream, 0.9);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  // Sun with a sleepy-happy face.
  b.tex('icon.sun', 48, 48, (ctx) => {
    const cx = 24;
    const cy = 24;
    const rayFill = mix(P.butter, P.glow, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      ctx.beginPath();
      ellipsePath(ctx, cx + Math.cos(a) * 17.2, cy + Math.sin(a) * 17.2, 4.6, 3.3, a);
      fillOutline(ctx, rayFill, P.butter, 2.2);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, TAU);
    fillOutline(
      ctx,
      rGrad(ctx, cx - 4, cy - 5, 1, 16, [
        [0, mix(P.glow, P.cream, 0.45)],
        [0.6, P.glow],
        [1, mix(P.glow, P.ember, 0.18)],
      ]),
      P.butter,
    );
    eyeHappy(ctx, cx - 5, cy - 0.5, 4.4, 1.8);
    eyeHappy(ctx, cx + 5, cy - 0.5, 4.4, 1.8);
    blushOval(ctx, cx - 8, cy + 4, 2.8, 1.8, 0.7);
    blushOval(ctx, cx + 8, cy + 4, 2.8, 1.8, 0.7);
    mouth(ctx, cx, cy + 3.6, 3.2, 'smile', 1.5);
  });

  // Crescent moon, dozing, with a tiny star.
  b.tex('icon.moon', 48, 48, (ctx) => {
    const fill = mix(P.butter, P.cream, 0.42);
    ctx.beginPath();
    crescentPath(ctx, 22, 25, 17, 31.5, 18.5, 13.5);
    fillOutline(
      ctx,
      rGrad(ctx, 14, 22, 1, 22, [
        [0, mix(fill, P.cream, 0.5)],
        [1, mix(fill, P.lavender, 0.12)],
      ]),
      mix(P.butter, P.lavender, 0.3),
    );
    eyeClosed(ctx, 14.5, 26, 4.6, 1.8);
    blushOval(ctx, 13.5, 31, 2.8, 1.8, 0.7);
    ctx.beginPath();
    starPath(ctx, 37, 30, 5.2);
    fillOutline(ctx, mix(P.butter, P.glow, 0.4), P.butter, 1.8);
    ctx.beginPath();
    starPath(ctx, 40.5, 12, 3);
    fillOutline(ctx, mix(P.butter, P.glow, 0.4), P.butter, 1.5);
  });

  // Contentment lantern: unlit, lit, and a halo for ADD blending.
  const lantern = (lit: boolean) => (ctx: Ctx) => {
    const frame = P.bark;
    const frameLine = shade(frame, 0.25);
    // Handle loop.
    outlinedStroke(ctx, (c) => c.arc(24, 11, 6, Math.PI * 1.05, Math.PI * 1.95), mix(frame, P.cream, 0.15), 2.2, frameLine, 1.3);
    // Cap.
    ctx.beginPath();
    ctx.moveTo(17, 11.5);
    ctx.lineTo(31, 11.5);
    ctx.quadraticCurveTo(34, 11.5, 35.5, 16.5);
    ctx.lineTo(12.5, 16.5);
    ctx.quadraticCurveTo(14, 11.5, 17, 11.5);
    ctx.closePath();
    fillOutline(ctx, vGrad(ctx, 11, 17, [[0, mix(frame, P.cream, 0.2)], [1, frame]]), frame, 2.2);
    // Glass.
    ctx.beginPath();
    roundRectPath(ctx, 14.5, 16.5, 19, 20, 5);
    if (lit) {
      ctx.fillStyle = rGrad(ctx, 24, 27, 1, 14, [
        [0, mix(P.glow, P.cream, 0.55)],
        [0.5, P.glow],
        [1, mix(P.glow, P.ember, 0.3)],
      ]);
    } else {
      ctx.fillStyle = vGrad(ctx, 17, 36, [
        [0, mix(P.cream, P.lavender, 0.3)],
        [1, mix(P.cream, P.lavender, 0.5)],
      ]);
    }
    ctx.fill();
    ctx.strokeStyle = frameLine;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    if (lit) {
      // Flame.
      ctx.beginPath();
      ctx.moveTo(24, 20.5);
      ctx.bezierCurveTo(27.5, 25, 28.5, 28, 24, 31.5);
      ctx.bezierCurveTo(19.5, 28, 20.5, 25, 24, 20.5);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 21, 31.5, [[0, P.ember], [1, mix(P.ember, P.glow, 0.5)]]);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(24, 28, 2, 2.8, 0, 0, TAU);
      ctx.fillStyle = mix(P.glow, P.cream, 0.6);
      ctx.fill();
    } else {
      // Little candle and wick.
      ctx.beginPath();
      roundRectPath(ctx, 21.5, 26.5, 5, 8, 1.5);
      fillOutline(ctx, P.cream, P.cream, 1.5);
      ctx.beginPath();
      ctx.moveTo(24, 26.5);
      ctx.lineTo(24, 23.5);
      ctx.strokeStyle = shade(P.bark, 0.1);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // Frame bars.
    ctx.strokeStyle = rgba(frameLine, 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(19.5, 17.5);
    ctx.lineTo(19.5, 35.5);
    ctx.moveTo(28.5, 17.5);
    ctx.lineTo(28.5, 35.5);
    ctx.stroke();
    hilite(ctx, 17.6, 21.5, 1.2, 2.6, 0, lit ? 0.7 : 0.85);
    // Base.
    ctx.beginPath();
    roundRectPath(ctx, 12.5, 35.5, 23, 6, 3);
    fillOutline(ctx, vGrad(ctx, 35, 42, [[0, mix(frame, P.cream, 0.15)], [1, frame]]), frame, 2.2);
  };
  b.tex('icon.lantern', 48, 48, lantern(false));
  b.tex('icon.lanternLit', 48, 48, lantern(true));
  b.tex('icon.lanternGlow', 96, 96, (ctx) => glowDisc(ctx, 48, 50, 46, P.glow, 0.9, 1.1));

  // Backpack.
  b.tex('icon.backpack', 48, 48, (ctx) => {
    const body = P.sage;
    // Side straps.
    for (const x of [8.5, 35.5]) {
      ctx.beginPath();
      roundRectPath(ctx, x, 23, 4.5, 13, 2.2);
      fillOutline(ctx, P.moss, P.moss, 2);
    }
    // Handle.
    outlinedStroke(ctx, (c) => c.arc(24, 11.5, 5, Math.PI, 0), mix(P.moss, P.cream, 0.1), 2.4, shade(P.moss, 0.2), 1.3);
    // Body.
    ctx.beginPath();
    roundRectPath(ctx, 11, 11.5, 26, 31, 10);
    fillOutline(ctx, vGrad(ctx, 11, 42, [[0, mix(body, P.cream, 0.2)], [1, mix(body, P.moss, 0.25)]]), body);
    // Pocket.
    ctx.beginPath();
    roundRectPath(ctx, 15.5, 29, 17, 10.5, 4.5);
    fillOutline(ctx, mix(body, P.cream, 0.32), body, 2);
    ctx.beginPath();
    ctx.moveTo(18, 32.5);
    ctx.lineTo(30, 32.5);
    ctx.setLineDash([1.8, 2]);
    ctx.strokeStyle = rgba(shade(body, 0.2), 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    // Flap.
    ctx.beginPath();
    roundRectPath(ctx, 11, 11.5, 26, 13, [10, 10, 7, 7]);
    fillOutline(ctx, vGrad(ctx, 11, 24, [[0, mix(body, P.cream, 0.08)], [1, mix(body, P.moss, 0.3)]]), body);
    // Buckle.
    ctx.beginPath();
    roundRectPath(ctx, 21, 21, 6, 6.5, 2);
    fillOutline(ctx, P.butter, P.butter, 1.8);
    hilite(ctx, 15.5, 15.5, 1.6, 3, 0.7, 0.75);
  });

  // Journal (notebook with a bookmark ribbon).
  b.tex('icon.journal', 48, 48, (ctx) => {
    withState(ctx, () => {
      ctx.translate(24, 24);
      ctx.rotate(-0.07);
      ctx.translate(-24, -24);
      const cover = mix(P.rose, P.peach, 0.3);
      // Ribbon bookmark.
      ctx.beginPath();
      ctx.moveTo(26, 38);
      ctx.lineTo(26, 45);
      ctx.lineTo(28.5, 42.8);
      ctx.lineTo(31, 45);
      ctx.lineTo(31, 38);
      ctx.closePath();
      fillOutline(ctx, P.butter, P.butter, 1.8);
      // Page block.
      ctx.beginPath();
      roundRectPath(ctx, 13.5, 8.5, 25.5, 31.5, 4);
      fillOutline(ctx, P.cream, P.cream, 2);
      ctx.strokeStyle = rgba(shade(P.cream, 0.2), 0.7);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(37.2, 12);
      ctx.lineTo(37.2, 37);
      ctx.stroke();
      // Cover.
      ctx.beginPath();
      roundRectPath(ctx, 10, 7, 25.5, 31.5, [3, 6, 6, 3]);
      fillOutline(ctx, vGrad(ctx, 7, 38, [[0, mix(cover, P.cream, 0.18)], [1, cover]]), cover);
      // Spine.
      ctx.beginPath();
      roundRectPath(ctx, 10, 7, 5, 31.5, [3, 0, 0, 3]);
      ctx.fillStyle = shade(cover, 0.1);
      ctx.fill();
      // Label.
      ctx.beginPath();
      roundRectPath(ctx, 18.5, 13, 12.5, 8.5, 2.5);
      fillOutline(ctx, P.cream, P.cream, 1.5);
      ctx.strokeStyle = rgba(shade(cover, 0.2), 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(21, 16.2);
      ctx.lineTo(28.5, 16.2);
      ctx.moveTo(21, 18.6);
      ctx.lineTo(26.5, 18.6);
      ctx.stroke();
      // Little heart.
      ctx.beginPath();
      heartPath(ctx, 24.7, 29.5, 3.6);
      ctx.fillStyle = mix(P.cream, cover, 0.25);
      ctx.fill();
      // Elastic band.
      ctx.beginPath();
      ctx.moveTo(31.5, 7.5);
      ctx.lineTo(31.5, 38);
      ctx.strokeStyle = shade(cover, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // Settings: a soft rounded gear.
  b.tex('icon.settings', 48, 48, (ctx) => {
    const cx = 24;
    const cy = 24;
    const pts: [number, number][] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const d = Math.PI / n;
      for (const [r, off] of [
        [14.5, -d * 0.82],
        [19.5, -d * 0.42],
        [19.5, d * 0.42],
        [14.5, d * 0.82],
      ] as [number, number][]) {
        pts.push([cx + Math.cos(a + off) * r, cy + Math.sin(a + off) * r]);
      }
    }
    ctx.beginPath();
    smoothClosed(ctx, pts, 0.22);
    fillOutline(
      ctx,
      rGrad(ctx, cx - 5, cy - 6, 2, 22, [
        [0, mix(P.lavender, P.cream, 0.45)],
        [1, mix(P.lavender, P.ink, 0.04)],
      ]),
      P.lavender,
    );
    ctx.beginPath();
    ctx.arc(cx, cy, 6.2, 0, TAU);
    fillOutline(ctx, mix(P.cream, P.lavender, 0.12), P.lavender, 2.2);
    ctx.beginPath();
    ctx.arc(cx, cy, 14.5 - 3, Math.PI * 1.1, Math.PI * 1.45);
    ctx.strokeStyle = rgba(P.cream, 0.8);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  // Close: an x of rounded strokes.
  b.tex('icon.close', 48, 48, (ctx) => {
    outlinedStroke(
      ctx,
      (c) => {
        c.moveTo(16, 16);
        c.lineTo(32, 32);
        c.moveTo(32, 16);
        c.lineTo(16, 32);
      },
      mix(P.rose, P.cream, 0.1),
      6,
      shade(P.rose, 0.32),
    );
  });

  // Arrows: soft chevrons.
  const chevron = (dir: 1 | -1) => (ctx: Ctx) => {
    outlinedStroke(
      ctx,
      (c) => {
        c.moveTo(24 - 5 * dir, 13);
        c.lineTo(24 + 6 * dir, 24);
        c.lineTo(24 - 5 * dir, 35);
      },
      mix(GLYPH, P.cream, 0.15),
      6,
      shade(GLYPH, 0.3),
    );
  };
  b.tex('icon.arrowRight', 48, 48, chevron(1));
  b.tex('icon.arrowLeft', 48, 48, chevron(-1));

  b.tex('icon.check', 48, 48, (ctx) => {
    outlinedStroke(
      ctx,
      (c) => {
        c.moveTo(13.5, 25);
        c.lineTo(21, 32.5);
        c.lineTo(35, 16);
      },
      mix(P.sage, P.cream, 0.05),
      6.5,
      shade(P.sage, 0.34),
    );
  });

  b.tex('icon.minus', 48, 48, (ctx) => {
    outlinedStroke(ctx, (c) => {
      c.moveTo(15, 24);
      c.lineTo(33, 24);
    }, mix(GLYPH, P.cream, 0.15), 6, shade(GLYPH, 0.3));
  });
  b.tex('icon.plus', 48, 48, (ctx) => {
    outlinedStroke(ctx, (c) => {
      c.moveTo(15, 24);
      c.lineTo(33, 24);
      c.moveTo(24, 15);
      c.lineTo(24, 33);
    }, mix(GLYPH, P.cream, 0.15), 6, shade(GLYPH, 0.3));
  });

  // Rarity stars: filled and empty (shape differs, not only colour).
  b.tex('icon.star', 48, 48, (ctx) => {
    ctx.beginPath();
    starPath(ctx, 24, 25.5, 19.5, 0.5);
    fillOutline(
      ctx,
      rGrad(ctx, 20, 18, 1, 24, [
        [0, mix(P.glow, P.cream, 0.45)],
        [0.55, mix(P.glow, P.butter, 0.4)],
        [1, mix(P.butter, P.ember, 0.18)],
      ]),
      P.butter,
    );
    hilite(ctx, 19.5, 19, 1.8, 3.4, 0.5, 0.85);
  });
  b.tex('icon.starEmpty', 48, 48, (ctx) => {
    ctx.beginPath();
    starPath(ctx, 24, 25.5, 19.5, 0.5);
    ctx.fillStyle = rgba(mix(P.cream, P.butter, 0.25), 0.55);
    ctx.fill();
    ctx.setLineDash([]);
    ctx.lineWidth = OUTLINE;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = mix(shade(P.butter, 0.3), P.cream, 0.3);
    ctx.stroke();
  });

  // Leaf tag (essentials).
  b.tex('icon.leafTag', 48, 48, (ctx) => {
    // String.
    ctx.beginPath();
    ctx.moveTo(14.5, 31.5);
    ctx.bezierCurveTo(9, 36, 7, 40, 5, 43);
    ctx.strokeStyle = P.bark;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.stroke();
    withState(ctx, () => {
      ctx.translate(26, 21.5);
      ctx.rotate(-0.62);
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.bezierCurveTo(-9, -12, 8, -12, 17, 0);
      ctx.bezierCurveTo(8, 12, -9, 12, -17, 0);
      ctx.closePath();
      fillOutline(ctx, vGrad(ctx, -10, 10, [[0, mix(P.sage, P.cream, 0.25)], [1, mix(P.sage, P.moss, 0.3)]]), P.sage);
      ctx.strokeStyle = rgba(shade(P.sage, 0.22), 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(3, -1, 13, 0);
      for (const x of [-2, 4, 9]) {
        ctx.moveTo(x, -0.3);
        ctx.lineTo(x + 3.5, -4.5);
        ctx.moveTo(x, 0.3);
        ctx.lineTo(x + 3.5, 4.5);
      }
      ctx.stroke();
      // Hole.
      ctx.beginPath();
      ctx.arc(-11.5, 0, 2.3, 0, TAU);
      fillOutline(ctx, P.cream, P.sage, 1.4);
      hilite(ctx, -2, -5.5, 1.3, 3.2, 1.3, 0.7);
    });
  });

  // NEW! ribbon background (text is added by the Card).
  b.tex('icon.ribbon', 124, 48, (ctx, w, h) => {
    const band = mix(P.rose, P.ember, 0.22);
    drawRibbon(ctx, w, h, { top: mix(band, P.cream, 0.18), bot: band }, mix(P.rose, P.lavender, 0.25), 32, 20, 9, 7);
  });

  // Hearts.
  b.tex('icon.heartFull', 48, 48, (ctx) => {
    ctx.beginPath();
    heartPath(ctx, 24, 24, 15.5);
    fillOutline(
      ctx,
      rGrad(ctx, 18, 17, 1, 24, [
        [0, mix(P.blush, P.cream, 0.35)],
        [0.6, P.blush],
        [1, mix(P.blush, P.rose, 0.6)],
      ]),
      P.rose,
    );
    hilite(ctx, 16.5, 18, 2, 3.6, 0.7, 0.85);
  });
  b.tex('icon.heartEmpty', 48, 48, (ctx) => {
    ctx.beginPath();
    heartPath(ctx, 24, 24, 15.5);
    ctx.fillStyle = rgba(mix(P.cream, P.blush, 0.2), 0.55);
    ctx.fill();
    ctx.lineWidth = OUTLINE;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = mix(shade(P.rose, 0.3), P.cream, 0.25);
    ctx.stroke();
  });

  // Speaker with two sound waves.
  b.tex('icon.speaker', 48, 48, (ctx) => {
    const f = P.lavender;
    ctx.beginPath();
    smoothClosed(
      ctx,
      [
        [8.5, 19.5],
        [15.5, 19.5],
        [25, 11.5],
        [26.5, 13],
        [26.5, 35],
        [25, 36.5],
        [15.5, 28.5],
        [8.5, 28.5],
      ],
      0.12,
    );
    fillOutline(ctx, vGrad(ctx, 11, 37, [[0, mix(f, P.cream, 0.4)], [1, f]]), f);
    ctx.strokeStyle = shade(f, 0.3);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(27, 24, 7, -0.75, 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(27, 24, 13, -0.72, 0.72);
    ctx.stroke();
    hilite(ctx, 12, 22, 1.2, 1.8, 0, 0.75);
  });

  // Music: two beamed notes.
  b.tex('icon.music', 48, 48, (ctx) => {
    const f = P.lavender;
    const line = shade(f, 0.3);
    const fillC = mix(f, P.cream, 0.15);
    const stems = (c: Ctx) => {
      c.moveTo(19.5, 33);
      c.lineTo(19.5, 13);
      c.moveTo(35.5, 29);
      c.lineTo(35.5, 9);
    };
    const beam = (c: Ctx) => {
      c.moveTo(19.5, 13);
      c.lineTo(35.5, 9);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.8 + 4.4;
    ctx.beginPath();
    stems(ctx);
    ctx.stroke();
    ctx.lineWidth = 5 + 4.4;
    ctx.beginPath();
    beam(ctx);
    ctx.stroke();
    for (const [x, y] of [
      [14.5, 34],
      [30.5, 30],
    ]) {
      ctx.beginPath();
      ellipsePath(ctx, x, y, 6.2, 4.8, -0.35);
      fillOutline(ctx, vGrad(ctx, y - 5, y + 5, [[0, mix(f, P.cream, 0.35)], [1, f]]), f);
    }
    ctx.strokeStyle = fillC;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    stems(ctx);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    beam(ctx);
    ctx.stroke();
  });
}
