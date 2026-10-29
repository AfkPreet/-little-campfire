import Phaser from 'phaser';
import { LOGICAL_H, MAX_DPR } from '@/config';

/**
 * Resolution model:
 * - The canvas backing store is sized in device pixels (CSS size x DPR, DPR capped at 2).
 * - Every scene camera has origin (0,0) and zoom Z = deviceHeight / 720, so all
 *   game code works in logical units: height is always 720, width is
 *   W = deviceWidth / Z (wider screens show more world; no letterboxing).
 * - Art is drawn into textures at ART_SCALE (>= 2) and displayed at 1/ART_SCALE,
 *   and Text objects render at resolution Z, so edges stay crisp on Retina.
 */

export interface Layout {
  /** CSS pixels */
  cssW: number;
  cssH: number;
  dpr: number;
  /** Camera zoom (device px per logical px). */
  zoom: number;
  /** Logical size. */
  w: number;
  h: number;
  /** Safe-area insets in logical px. */
  safe: { top: number; right: number; bottom: number; left: number };
  portrait: boolean;
}

let current: Layout = compute();
const listeners = new Set<(l: Layout) => void>();

function readSafeAreas(): { top: number; right: number; bottom: number; left: number } {
  const probe = document.getElementById('safe-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(probe);
  const n = (v: string) => parseFloat(v) || 0;
  return { top: n(cs.paddingTop), right: n(cs.paddingRight), bottom: n(cs.paddingBottom), left: n(cs.paddingLeft) };
}

function compute(): Layout {
  const vv = window.visualViewport;
  const cssW = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
  const cssH = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  const dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  const devH = Math.round(cssH * dpr);
  const zoom = devH / LOGICAL_H;
  const w = Math.round((cssW * dpr) / zoom);
  const s = readSafeAreas();
  const k = dpr / zoom; // css px -> logical px
  return {
    cssW,
    cssH,
    dpr,
    zoom,
    w,
    h: LOGICAL_H,
    safe: { top: s.top * k, right: s.right * k, bottom: s.bottom * k, left: s.left * k },
    portrait: cssH > cssW,
  };
}

export function layout(): Layout {
  return current;
}

/** Art textures are drawn at this scale (spec: 2x; slightly higher on big Retina screens). */
export const ART_SCALE = Math.min(2.5, Math.max(2, Math.round(compute().zoom * 4) / 4));

export function onLayout(fn: (l: Layout) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function gameConfigSize(): { width: number; height: number; zoom: number } {
  const l = current;
  return { width: Math.round(l.cssW * l.dpr), height: Math.round(l.cssH * l.dpr), zoom: 1 / l.dpr };
}

/** Configure a scene's main camera for logical units. Call in create(). */
export function setupCamera(scene: Phaser.Scene, cam = scene.cameras.main): void {
  const apply = () => {
    const l = current;
    cam.setOrigin(0, 0);
    cam.setSize(Math.round(l.cssW * l.dpr), Math.round(l.cssH * l.dpr));
    cam.setZoom(l.zoom);
  };
  apply();
  const off = onLayout(apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  scene.events.once(Phaser.Scenes.Events.DESTROY, off);
}

let resizeTimer = 0;
export function installResize(game: Phaser.Game): void {
  const handler = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      current = compute();
      const { width, height, zoom } = gameConfigSize();
      game.scale.setZoom(zoom);
      game.scale.resize(width, height);
      listeners.forEach((fn) => fn(current));
      document.body.classList.toggle('portrait', current.portrait);
    }, 60);
  };
  window.addEventListener('resize', handler);
  window.visualViewport?.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  document.body.classList.toggle('portrait', current.portrait);
}

export function refreshLayout(): Layout {
  current = compute();
  return current;
}
