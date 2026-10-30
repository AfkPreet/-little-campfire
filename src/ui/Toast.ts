/**
 * Toasts (spec section 7): rounded paper pills at the top centre that fade
 * after 2.5 s. ToastManager stacks up to three, queues the rest, merges
 * repeats, and listens to bus 'toast' for the lifetime of its scene.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { bus } from '@/core/bus';
import { layout, onLayout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE, squash } from '@/fx/juice';
import { UI_INK, iconObj, panel, shadowPanel } from '@/art/ui';
import { TEXT_NUDGE } from './Button';
import { txtObj } from './text';

export interface ToastOpts {
  text: string;
  /** Optional icon texture key shown before the text. */
  icon?: string;
  /** Wrap width cap (default 560). */
  maxW?: number;
}

const H = 56;
const PAD = 26;
const ICON = 30;

/** The pill itself (no timing); usable on its own for static layouts. */
export class Toast extends Phaser.GameObjects.Container {
  readonly pw: number;
  readonly text: string;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ToastOpts) {
    super(scene, x, y);
    this.text = opts.text;
    const label = txtObj(scene, 0, TEXT_NUDGE, opts.text, 'label', { color: UI_INK });
    const maxW = opts.maxW ?? Math.min(560, layout().w - 64);
    const icon = opts.icon ? iconObj(scene, 0, 0, opts.icon, ICON) : undefined;
    const contentW = label.width - 4 + (icon ? ICON + 10 : 0);
    const w = Math.min(maxW, Math.max(140, contentW + PAD * 2));
    this.pw = w;
    this.add(shadowPanel(scene, 'pill', w, H, 0, 4, 0.16));
    this.add(panel(scene, 'ui.pill', w, H));
    let x0 = -contentW / 2;
    if (icon) {
      icon.setPosition(x0 + ICON / 2, 0);
      this.add(icon);
      x0 += ICON + 10;
    }
    label.setPosition(x0 + (label.width - 4) / 2, TEXT_NUDGE);
    this.add(label);
    this.setSize(w, H);
    scene.add.existing(this);
  }
}

export interface ToastManagerOpts {
  /** Centre y of the first toast (default safe top + 46). */
  y?: number;
  /** Seconds each toast stays (default 2.5). */
  hold?: number;
  /** Max simultaneously visible toasts (default 3). */
  maxVisible?: number;
  depth?: number;
  /** Listen to bus 'toast' (default true). */
  subscribe?: boolean;
}

interface Live {
  toast: Toast;
  timer: Phaser.Time.TimerEvent;
  leaving: boolean;
}

const GAP = 10;

export class ToastManager {
  private scene: Phaser.Scene;
  private o: ToastManagerOpts;
  private live: Live[] = [];
  private queue: { text: string; icon?: string }[] = [];

  constructor(scene: Phaser.Scene, opts: ToastManagerOpts = {}) {
    this.scene = scene;
    this.o = opts;
    if (opts.subscribe !== false) bus.onScene(scene, 'toast', (e) => this.show(e.text, e.icon));
    const off = onLayout(() => this.relayout(true));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.clear();
    });
  }

  private get x(): number {
    return layout().w / 2;
  }

  private y0(): number {
    return this.o.y ?? layout().safe.top + 18 + H / 2;
  }

  private slotY(i: number): number {
    return this.y0() + i * (H + GAP);
  }

  show(text: string, icon?: string): void {
    // A repeat of a visible toast just refreshes it with a little squash.
    const dup = this.live.find((l) => !l.leaving && l.toast.text === text);
    if (dup) {
      dup.timer.remove(false);
      dup.timer = this.scene.time.delayedCall((this.o.hold ?? 2.5) * 1000, () => this.dismiss(dup));
      squash(this.scene, dup.toast, 0.5, 1, 1);
      return;
    }
    if (this.live.filter((l) => !l.leaving).length >= (this.o.maxVisible ?? 3)) {
      if (!this.queue.some((q) => q.text === text)) this.queue.push({ text, icon });
      return;
    }
    const scene = this.scene;
    const slot = this.live.filter((l) => !l.leaving).length;
    const t = new Toast(scene, this.x, this.slotY(slot) - 14, { text, icon });
    t.setDepth(this.o.depth ?? DEPTH.toast).setScrollFactor(0);
    t.setAlpha(0);
    const rm = reduceMotion();
    t.setScale(rm ? 1 : 0.86);
    scene.tweens.add({ targets: t, alpha: 1, y: this.slotY(slot), scaleX: 1, scaleY: 1, duration: rm ? 200 : 380, ease: rm ? EASE.out : EASE.pop });
    bus.emit('sfx', { id: 'pop', vol: 0.5 });
    const live: Live = { toast: t, leaving: false, timer: scene.time.delayedCall((this.o.hold ?? 2.5) * 1000, () => this.dismiss(live)) };
    this.live.push(live);
  }

  private dismiss(l: Live): void {
    if (l.leaving) return;
    l.leaving = true;
    l.timer.remove(false);
    this.scene.tweens.add({
      targets: l.toast,
      alpha: 0,
      y: l.toast.y - 12,
      duration: 360,
      ease: EASE.in,
      onComplete: () => {
        l.toast.destroy();
        this.live = this.live.filter((x) => x !== l);
        this.relayout(false);
        const next = this.queue.shift();
        if (next) this.scene.time.delayedCall(120, () => this.show(next.text, next.icon));
      },
    });
  }

  private relayout(instant: boolean): void {
    this.live
      .filter((l) => !l.leaving)
      .forEach((l, i) => {
        const y = this.slotY(i);
        if (instant) l.toast.setPosition(this.x, y);
        else this.scene.tweens.add({ targets: l.toast, x: this.x, y, duration: 320, ease: EASE.out });
      });
  }

  /** Remove every toast and empty the queue. */
  clear(): void {
    this.live.forEach((l) => {
      l.timer.remove(false);
      l.toast.destroy();
    });
    this.live = [];
    this.queue = [];
  }
}
