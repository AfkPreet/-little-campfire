/**
 * Action bubbles for world interactables (spec section 7): rounded paper
 * speech bubbles whose tail points down at the object ("Cook", "Sit"...).
 * A Bubble's origin is its tail tip, so place it right above the object.
 * BubbleGroup lays out 1-3 bubbles in a gentle arc and pops them in.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { bus } from '@/core/bus';
import { reduceMotion } from '@/core/settings';
import { EASE, popIn } from '@/fx/juice';
import { artObj } from '@/art/kit';
import { UI_INK, UI_INK_FAINT, iconObj, panel, shadowPanel } from '@/art/ui';
import { P, hexToInt } from '@/palette';
import { TEXT_NUDGE, pressable } from './Button';
import { textStyle, txtObj } from './text';

export interface BubbleOpts {
  label: string;
  /** Optional icon texture key shown before the label. */
  icon?: string;
  onTap?: () => void;
  disabled?: boolean;
  onDisabledTap?: () => void;
  /** Horizontal offset of the tail along the body (px, + = right). */
  tailShift?: number;
  /** Tail tilt in radians (+ = tip leans right). */
  tailTilt?: number;
}

const BODY_H = 56;
const TAIL_H = 20;
const PAD = 22;
const ICON = 28;

function bubbleWidth(contentW: number): number {
  return Math.max(MIN_TOUCH + 28, contentW + PAD * 2);
}

export class Bubble extends Phaser.GameObjects.Container {
  /** Body width a bubble with this label would have (no objects left behind). */
  static measure(scene: Phaser.Scene, label: string, icon?: string): number {
    const t = new Phaser.GameObjects.Text(scene, 0, 0, label, textStyle('button', { size: 24 }));
    const w = bubbleWidth(t.width - 4 + (icon ? ICON + 8 : 0));
    t.destroy();
    return w;
  }

  readonly bw: number;
  readonly label: string;
  private o: BubbleOpts;
  private inner: Phaser.GameObjects.Container;
  private bobTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: BubbleOpts) {
    super(scene, x, y);
    this.o = opts;
    this.label = opts.label;
    // Everything lives in `inner` so the bob doesn't fight the press squash.
    this.inner = new Phaser.GameObjects.Container(scene, 0, 0);
    this.add(this.inner);
    const text = txtObj(scene, 0, 0, opts.label, 'button', { color: opts.disabled ? UI_INK_FAINT : UI_INK, size: 24 });
    const icon = opts.icon ? iconObj(scene, 0, 0, opts.icon, ICON) : undefined;
    if (icon && opts.disabled) icon.setAlpha(0.5);
    const contentW = text.width - 4 + (icon ? ICON + 8 : 0);
    const w = bubbleWidth(contentW);
    this.bw = w;
    const cy = -TAIL_H - BODY_H / 2 + 3;
    this.inner.add(shadowPanel(scene, 'pill', w, BODY_H, 0, cy + 5, 0.16));
    const shadowTail = artObj(scene, (opts.tailShift ?? 0) + 0, cy + BODY_H / 2 - 4 + 5, 'ui.bubbleTail').setOrigin(0.5, 0).setTint(hexToInt(P.ink)).setAlpha(0.08);
    shadowTail.setRotation(-(opts.tailTilt ?? 0));
    this.inner.add(shadowTail);
    this.inner.add(panel(scene, 'ui.bubble', w, BODY_H, 0, cy));
    const tail = artObj(scene, opts.tailShift ?? 0, cy + BODY_H / 2 - 4, 'ui.bubbleTail').setOrigin(0.5, 0);
    tail.setRotation(-(opts.tailTilt ?? 0));
    this.inner.add(tail);
    let x0 = -contentW / 2;
    if (icon) {
      icon.setPosition(x0 + ICON / 2, cy);
      this.inner.add(icon);
      x0 += ICON + 8;
    }
    text.setPosition(x0 + (text.width - 4) / 2, cy + TEXT_NUDGE);
    this.inner.add(text);

    // Hit area: the body plus most of the tail, never under MIN_TOUCH.
    const hitH = Math.max(MIN_TOUCH, BODY_H + TAIL_H) + 6;
    this.setSize(w + 8, hitH);
    this.setInteractive({ useHandCursor: true });
    (this.input!.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, w + 8, hitH);
    // The container's hit rect is centred on its origin (the tail tip); shift it up.
    this.input!.hitArea.y = -hitH / 2 + 2;
    pressable(scene, this, {
      onTap: () => this.o.onTap?.(),
      isDisabled: () => !!this.o.disabled,
      onDisabledTap: () => this.o.onDisabledTap?.(),
      juiceTarget: this.inner,
      squashAmount: 0.9,
    });
    scene.add.existing(this);
  }

  /** Gentle idle bob (off with Reduce motion). */
  bob(delay = 0): this {
    if (reduceMotion()) return this;
    this.bobTween?.stop();
    this.bobTween = this.scene.tweens.add({ targets: this, y: this.y - 3, duration: 1300, yoyo: true, repeat: -1, ease: EASE.loop, delay });
    return this;
  }

  override destroy(fromScene?: boolean): void {
    this.bobTween?.stop();
    super.destroy(fromScene);
  }
}

export interface BubbleGroupOpts {
  /** Gap between the object point and the tail tips (default 18). */
  lift?: number;
  /** How much the outer bubbles drop to form the arc (default 18). */
  dip?: number;
  /** Horizontal gap between bubbles (default 14). */
  gap?: number;
  /** Close the group after any bubble is tapped (default true). */
  closeOnTap?: boolean;
}

export class BubbleGroup extends Phaser.GameObjects.Container {
  readonly bubbles: Bubble[] = [];
  private closing = false;

  constructor(scene: Phaser.Scene, x: number, y: number, items: BubbleOpts[], opts: BubbleGroupOpts = {}) {
    super(scene, x, y);
    const n = Math.min(3, items.length);
    const lift = opts.lift ?? 18;
    const dip = opts.dip ?? 18;
    const gap = opts.gap ?? 14;
    const widths = items.slice(0, n).map((it) => Bubble.measure(scene, it.label, it.icon));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
    let cx = -total / 2;
    const xs = widths.map((w) => {
      const x0 = cx + w / 2;
      cx += w + gap;
      return x0;
    });
    const span = Math.max(1, Math.abs(xs[0] ?? 1));
    items.slice(0, n).forEach((it, i) => {
      const bx = xs[i];
      const k = n === 1 ? 0 : bx / span; // -1..1
      const by = -lift + (n === 3 ? dip * k * k : n === 2 ? dip * 0.35 : 0);
      // Tails lean in toward the object point.
      const tailShift = Phaser.Math.Clamp(-k * (widths[i] / 2 - 30), -40, 40);
      const tailTilt = -k * 0.32;
      const b = new Bubble(scene, bx, by, {
        ...it,
        tailShift,
        tailTilt,
        onTap: () => {
          it.onTap?.();
          if (opts.closeOnTap !== false) this.close();
        },
      });
      this.add(b);
      this.bubbles.push(b);
    });
    // Pop in, staggered, growing out of the tail tips.
    this.bubbles.forEach((b, i) => {
      b.setData('baseScaleX', 1).setData('baseScaleY', 1);
      const t = popIn(scene, b, i * 70, 440);
      t.once('complete', () => b.bob(i * 220));
    });
    bus.emit('sfx', { id: 'pop', vol: 0.6 });
    scene.add.existing(this);
  }

  /** Pop the bubbles out and destroy the group. */
  close(onDone?: () => void): void {
    if (this.closing) return;
    this.closing = true;
    this.bubbles.forEach((b) => b.disableInteractive());
    const rm = reduceMotion();
    this.scene.tweens.add({
      targets: this.bubbles,
      scaleX: rm ? 1 : 0.3,
      scaleY: rm ? 1 : 0.3,
      alpha: 0,
      duration: rm ? 160 : 220,
      ease: EASE.in,
      delay: this.scene.tweens.stagger(40, {}),
      onComplete: () => {
        onDone?.();
        this.destroy();
      },
    });
  }
}
