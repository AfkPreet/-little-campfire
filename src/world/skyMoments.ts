/**
 * Sky spectacles for the rare moments (WORLD 7.7) and the guardian finale
 * (WORLD 5.4). Drawn behind the far bands (DEPTH.celestial) with a tiny
 * scroll factor so they sit in the sky. Each returns a Promise that resolves
 * when its main beat is done (some linger and clean themselves up later).
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { ART_SCALE, layout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { A, LIGHT, P, hexToInt, mixInt } from '@/palette';
import { ARC } from '@/art/skyMoments';
import { gurans } from '@/art/kuhiro';

const K = 1 / ART_SCALE;
const SF = 0.02;

type Img = Phaser.GameObjects.Image;

function tw(scene: Phaser.Scene, targets: object, props: Record<string, unknown>, duration: number, ease = 'Sine.easeInOut', delay = 0): Promise<void> {
  return new Promise((res) => {
    scene.tweens.add({ targets, ...props, duration, ease, delay, onComplete: () => res() });
  });
}

function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((res) => scene.time.delayedCall(ms, () => res()));
}

/** Convert a screen x into the world x of an object with scroll factor sf. */
function skyX(scene: Phaser.Scene, screenX: number, sf = SF): number {
  return screenX + scene.cameras.main.scrollX * sf;
}

function skyImg(scene: Phaser.Scene, x: number, y: number, key: string, depth: number = DEPTH.celestial, sf = SF): Img {
  return scene.add.image(x, y, key).setDepth(depth).setScrollFactor(sf);
}

// ---------------------------------------------------------------------------
// Wishing Star
// ---------------------------------------------------------------------------

/** "It slid down right behind the Snow Grannies." Start point in screen px (defaults high over the left sky). */
export async function playShootingStar(scene: Phaser.Scene, opts: { x?: number; y?: number } = {}): Promise<void> {
  const l = layout();
  const x0 = skyX(scene, opts.x ?? l.w * 0.4);
  const y0 = opts.y ?? 46;
  const ang = 0.5; // ~29 degrees down to the right
  const dist = reduceMotion() ? 220 : 380;
  const dx = Math.cos(ang) * dist;
  const dy = Math.sin(ang) * dist;
  const d = DEPTH.celestial;
  const trail = skyImg(scene, x0, y0, 'sky_trail', d).setOrigin(1, 0.5).setRotation(ang).setBlendMode(Phaser.BlendModes.ADD);
  trail.setTint(mixInt(P.cream, A['moon-gurans'], 0.5)).setScale(0, K).setAlpha(0);
  const halo = skyImg(scene, x0, y0, 'glowSmall', d).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow'])).setScale(0.9 * K).setAlpha(0);
  const head = skyImg(scene, x0, y0, 'sparkle', d).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.cream)).setScale(0.55 * K).setAlpha(0);
  const s = { t: 0 };
  const crumbs: number[] = [0.32, 0.5, 0.66, 0.8];
  let crumbI = 0;
  await new Promise<void>((res) => {
    scene.tweens.add({
      targets: s,
      t: 1,
      duration: 1500,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const t = s.t;
        const x = x0 + dx * t;
        const y = y0 + dy * t;
        const a = Math.min(1, t / 0.12) * (1 - Math.max(0, (t - 0.82) / 0.18));
        head.setPosition(x, y).setAlpha(a).setRotation(t * 2);
        halo.setPosition(x, y).setAlpha(a * 0.8);
        trail.setPosition(x, y).setAlpha(a * 0.95).setScale(K * Math.min(1, t / 0.4) * 0.9, K);
        if (crumbI < crumbs.length && t >= crumbs[crumbI]) {
          crumbI++;
          const c = skyImg(scene, x - Math.cos(ang) * 30, y - Math.sin(ang) * 30, 'sparkle', d).setBlendMode(Phaser.BlendModes.ADD);
          c.setTint(hexToInt(A['moon-gurans'])).setScale(0.28 * K).setAlpha(0.9);
          scene.tweens.add({ targets: c, alpha: 0, scale: 0.05 * K, angle: 90, duration: 1300, ease: 'Sine.easeIn', onComplete: () => c.destroy() });
        }
      },
      onComplete: () => res(),
    });
  });
  tw(scene, trail, { alpha: 0 }, 400, 'Sine.easeOut').then(() => trail.destroy());
  head.destroy();
  halo.destroy();
  await wait(scene, 900);
}

// ---------------------------------------------------------------------------
// Bows
// ---------------------------------------------------------------------------

function bow(scene: Phaser.Scene, key: string, cx: number, add: boolean): Img[] {
  const base = 452 + ARC.R * 0.22; // the bow's centre sits below the lake horizon
  const left = skyImg(scene, cx, base, key).setOrigin(1, 1).setScale(2 * K).setAlpha(0);
  const right = skyImg(scene, cx, base, key).setOrigin(0, 1).setScale(2 * K).setFlipX(true).setAlpha(0);
  if (add) {
    left.setBlendMode(Phaser.BlendModes.ADD);
    right.setBlendMode(Phaser.BlendModes.ADD);
  }
  return [left, right];
}

/** Monsoon Rainbow: a muted pastel arc over the lake at dawn; fades in, holds, fades out. centerX in screen px. */
export async function playRainbow(scene: Phaser.Scene, opts: { centerX?: number; hold?: number; peak?: number } = {}): Promise<void> {
  const l = layout();
  const parts = bow(scene, 'sky_rainbow', skyX(scene, opts.centerX ?? l.w * 0.6), false);
  const peak = opts.peak ?? 0.5;
  await tw(scene, parts, { alpha: peak }, 3800, 'Sine.easeInOut');
  await wait(scene, opts.hold ?? 7000);
  await tw(scene, parts, { alpha: 0 }, 4800, 'Sine.easeInOut');
  parts.forEach((p) => p.destroy());
}

/** Moonbow: a pale milky arc. With hold it stays until fadeOut(); otherwise it fades by itself after ~12 s. */
export function showMoonbow(scene: Phaser.Scene, opts: { centerX?: number; hold?: boolean; peak?: number } = {}): { fadeOut(ms?: number): void } {
  const l = layout();
  const parts = bow(scene, 'sky_moonbow', skyX(scene, opts.centerX ?? l.w * 0.6), true);
  const peak = opts.peak ?? 0.42;
  let gone = false;
  scene.tweens.add({ targets: parts, alpha: peak, duration: 4200, ease: 'Sine.easeInOut' });
  const fadeOut = (ms = 4500) => {
    if (gone) return;
    gone = true;
    scene.tweens.killTweensOf(parts);
    scene.tweens.add({ targets: parts, alpha: 0, duration: ms, ease: 'Sine.easeInOut', onComplete: () => parts.forEach((p) => p.destroy()) });
  };
  if (!opts.hold) scene.time.delayedCall(12000, () => fadeOut());
  return { fadeOut };
}

// ---------------------------------------------------------------------------
// The Gurans constellation
// ---------------------------------------------------------------------------

/**
 * The 6-star flower brightens one star at a time (ring from the top,
 * clockwise, then the centre: the same order as Kuhiro's freckles). (x, y)
 * is the constellation centre in sky px; it uses scroll factor 0 by default
 * to sit exactly on the sky band's stars. The glints linger ~40 s.
 */
export async function highlightGurans(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { ring?: number; scrollFactor?: number; depth?: number; linger?: number } = {},
): Promise<void> {
  const sf = opts.scrollFactor ?? 0;
  const depth = opts.depth ?? DEPTH.celestial + 0.3;
  const pts = gurans(x, y, opts.ring ?? 18);
  const made: Img[] = [];
  // One soft bloom over the whole flower, growing as the stars light.
  const bloom = skyImg(scene, x, y, 'glow', depth - 0.05, sf).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['moon-gurans'])).setAlpha(0);
  bloom.setScale((K * 130) / 256);
  made.push(bloom);
  scene.tweens.add({ targets: bloom, alpha: 0.32, scale: (K * 170) / 256, duration: 3200, ease: 'Sine.easeInOut' });
  for (const p of pts) {
    const big = p.centre ? 1.15 : 1;
    const halo = skyImg(scene, p.x, p.y, 'glowSmall', depth, sf).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow'])).setAlpha(0).setScale(0.3 * K);
    const star = skyImg(scene, p.x, p.y, 'sky_starGlow', depth, sf).setBlendMode(Phaser.BlendModes.ADD).setTint(mixInt(P.cream, A['moon-gurans'], 0.5)).setAlpha(0).setScale(0.1 * K);
    const warm = skyImg(scene, p.x, p.y, 'dot', depth, sf).setTint(mixInt(P.glow, P.cream, 0.5)).setAlpha(0).setScale(0.36 * K * big);
    made.push(halo, star, warm);
    scene.tweens.add({ targets: halo, alpha: 0.6, scale: 0.72 * big * K, duration: 700, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: warm, alpha: 1, duration: 400, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: star,
      alpha: 1,
      scale: 0.62 * K * big,
      angle: 45,
      duration: 520,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({ targets: star, scale: 0.4 * K * big, angle: 0, alpha: 0.9, duration: 900, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: [star, halo], alpha: '-=0.25', duration: 1600 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900 });
      },
    });
    await wait(scene, 460);
  }
  scene.time.delayedCall(opts.linger ?? 40000, () => {
    scene.tweens.killTweensOf(made);
    scene.tweens.add({ targets: made, alpha: 0, duration: 6000, ease: 'Sine.easeInOut', onComplete: () => made.forEach((m) => m.destroy()) });
  });
  await wait(scene, 300);
}

// ---------------------------------------------------------------------------
// The great plume parting the clouds
// ---------------------------------------------------------------------------

/**
 * The mist plume rises straight up from (x, fromY) (world px) and the rain
 * clouds part like curtains above it. Pair with Landscape.setSkyOpen().
 */
export async function cloudPartingPlume(
  scene: Phaser.Scene,
  x: number,
  fromY: number,
  opts: { plumeDepth?: number; cloudTint?: number; cloudDepth?: number } = {},
): Promise<void> {
  const l = layout();
  const rm = reduceMotion();
  const pd = opts.plumeDepth ?? DEPTH.water + 2;
  const mistTint = mixInt(P.cream, A['fish-glow'], 0.35);
  // The column.
  const col = scene.add.image(x, fromY + 6, 'sky_plume').setOrigin(0.5, 1).setDepth(pd).setTint(mistTint).setAlpha(0);
  const fullH = fromY + 140;
  col.setScale(K * 1.2, K * 0.04);
  const colScaleY = (K * fullH) / 300;
  tw(scene, col, { alpha: 0.75 }, 600, 'Sine.easeOut');
  tw(scene, col, { scaleY: colScaleY, scaleX: K * 2.1 }, 2600, 'Sine.easeOut').then(() =>
    tw(scene, col, { alpha: 0, scaleX: K * 4.2 }, 4200, 'Sine.easeInOut').then(() => col.destroy()),
  );
  // Billows riding up the column.
  const life = ((fromY + 120) / 230) * 1000;
  const billows = scene.add.particles(x, fromY - 10, 'puff', {
    speedY: { min: -260, max: -200 },
    speedX: { min: -18, max: 18 },
    accelerationX: { min: -8, max: 8 },
    lifespan: life,
    scale: { start: 0.45 * K * 1.5, end: 3.4 * K * 1.5 },
    // Clear as they leave the mouth, gathering as they climb past the head.
    alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => 0.42 * Math.min(1, t * t * 9) * (1 - t) },
    rotate: { min: 0, max: 360 },
    tint: mistTint,
    frequency: rm ? 220 : 70,
  });
  billows.setDepth(pd + 0.1);
  scene.time.delayedCall(2600, () => billows.stop());
  scene.time.delayedCall(2600 + life + 200, () => billows.destroy());

  // Cloud curtains at the top of the sky, centred over the plume on screen.
  const cd = opts.cloudDepth ?? DEPTH.celestial + 0.5;
  // Rain-cloud grey-indigo, a touch lighter than the night sky so the parting reveals deeper, starry sky.
  const cloudTint = opts.cloudTint ?? mixInt(LIGHT.night.horizon, A['cloud-sea'], 0.22);
  const sx = x - scene.cameras.main.scrollX;
  const cx = skyX(scene, sx);
  const sc = 2 * K * 1.35;
  const left = skyImg(scene, cx + 60, -24, 'sky_curtain', cd).setOrigin(1, 0).setScale(sc).setTint(cloudTint).setAlpha(0);
  const right = skyImg(scene, cx - 60, -24, 'sky_curtain', cd).setOrigin(0, 0).setScale(sc).setFlipX(true).setTint(cloudTint).setAlpha(0);
  const wash = skyImg(scene, cx, 40, 'glow', cd + 0.1).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['moon-snow'])).setScale((K * 520) / 256, (K * 300) / 256).setAlpha(0);
  tw(scene, [left, right], { alpha: 0.85 }, 1400, 'Sine.easeOut');
  await wait(scene, 2300);
  const spread = l.w * 0.62;
  tw(scene, left, { x: cx + 60 - spread, alpha: 0 }, 5600, 'Sine.easeInOut');
  tw(scene, right, { x: cx - 60 + spread, alpha: 0 }, 5600, 'Sine.easeInOut').then(() => {
    left.destroy();
    right.destroy();
  });
  tw(scene, wash, { alpha: 0.14 }, 2200, 'Sine.easeOut').then(() => tw(scene, wash, { alpha: 0 }, 3800, 'Sine.easeInOut').then(() => wash.destroy()));
  await wait(scene, 4200);
}
