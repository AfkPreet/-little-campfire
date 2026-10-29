/**
 * Motion helpers (spec section 8, "Motion and juice"): easeOutBack for pops,
 * easeInOutSine for loops, squash & stretch (0.85 / 1.15 then settle) on every
 * pickup, press and spawn. All respect Reduce motion.
 */
import Phaser from 'phaser';
import { reduceMotion } from '@/core/settings';

export const EASE = {
  pop: 'Back.easeOut',
  loop: 'Sine.easeInOut',
  out: 'Sine.easeOut',
  in: 'Sine.easeIn',
  soft: 'Quad.easeOut',
  settle: 'Elastic.easeOut',
} as const;

type Scalable = Phaser.GameObjects.GameObject & { scaleX: number; scaleY: number };

/** Squash & stretch then settle back to the object's base scale. */
export function squash(scene: Phaser.Scene, obj: Scalable, amount = 1, baseX?: number, baseY?: number): void {
  const bx = baseX ?? (obj.getData('baseScaleX') as number | undefined) ?? obj.scaleX;
  const by = baseY ?? (obj.getData('baseScaleY') as number | undefined) ?? obj.scaleY;
  obj.setData('baseScaleX', bx);
  obj.setData('baseScaleY', by);
  scene.tweens.killTweensOf(obj);
  if (reduceMotion()) {
    obj.scaleX = bx;
    obj.scaleY = by;
    return;
  }
  const k = 0.15 * amount;
  obj.scaleX = bx * (1 + k);
  obj.scaleY = by * (1 - k);
  scene.tweens.add({
    targets: obj,
    scaleX: bx * (1 - k * 0.6),
    scaleY: by * (1 + k * 0.6),
    duration: 90,
    ease: EASE.out,
    onComplete: () => {
      scene.tweens.add({ targets: obj, scaleX: bx, scaleY: by, duration: 380, ease: EASE.settle, easeParams: [1.1, 0.5] });
    },
  });
}

/** Pop in from zero with easeOutBack. */
export function popIn(scene: Phaser.Scene, obj: Scalable & { alpha?: number }, delay = 0, duration = 420): Phaser.Tweens.Tween {
  const bx = (obj.getData('baseScaleX') as number | undefined) ?? obj.scaleX;
  const by = (obj.getData('baseScaleY') as number | undefined) ?? obj.scaleY;
  obj.setData('baseScaleX', bx);
  obj.setData('baseScaleY', by);
  if (reduceMotion()) {
    obj.scaleX = bx;
    obj.scaleY = by;
    (obj as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(0);
    return scene.tweens.add({ targets: obj, alpha: 1, duration: 200, delay });
  }
  obj.scaleX = bx * 0.2;
  obj.scaleY = by * 0.2;
  return scene.tweens.add({ targets: obj, scaleX: bx, scaleY: by, duration, delay, ease: EASE.pop, easeParams: [2.2] });
}

/** Gentle wobble (e.g. a disabled button saying "nope"). */
export function wobble(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject & { angle: number; x: number }): void {
  if (reduceMotion()) return;
  const x0 = (obj.getData('wobbleX') as number | undefined) ?? obj.x;
  obj.setData('wobbleX', x0);
  scene.tweens.add({
    targets: obj,
    x: { from: x0 - 6, to: x0 },
    angle: { from: -3, to: 0 },
    duration: 420,
    ease: 'Elastic.easeOut',
    easeParams: [1.2, 0.25],
  });
}

/** Infinite breathing loop on scaleY (characters breathe 1.00 -> 1.03 on 2.4 s). */
export function breathe(scene: Phaser.Scene, obj: Scalable, amount = 0.03, period = 2400): Phaser.Tweens.Tween {
  const by = obj.scaleY;
  return scene.tweens.add({
    targets: obj,
    scaleY: by * (1 + amount),
    duration: period / 2,
    yoyo: true,
    repeat: -1,
    ease: EASE.loop,
  });
}

/** Float up and fade (hearts, notes, +sparkles). */
export function floatAway(scene: Phaser.Scene, obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text, dy = -60, duration = 1400, delay = 0): void {
  const rm = reduceMotion();
  scene.tweens.add({
    targets: obj,
    y: obj.y + (rm ? dy * 0.3 : dy),
    x: obj.x + (rm ? 0 : Phaser.Math.Between(-12, 12)),
    alpha: { from: obj.alpha || 1, to: 0 },
    duration,
    delay,
    ease: EASE.out,
    onComplete: () => obj.destroy(),
  });
}

/** Small camera nudge (disabled with Reduce motion). */
export function nudge(scene: Phaser.Scene, intensity = 0.002, duration = 120): void {
  if (reduceMotion()) return;
  scene.cameras.main.shake(duration, intensity);
}
