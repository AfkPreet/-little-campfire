/**
 * Moment banner: a handwritten (Patrick Hand) paper ribbon that floats in,
 * holds about 3 s with a gentle bob and a few twinkles, then floats away.
 * BannerManager shows them one at a time and listens to bus 'banner'.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { bus } from '@/core/bus';
import { ART_SCALE, layout, onLayout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';
import { artObj } from '@/art/kit';
import { SLICES, UI_INK, panel } from '@/art/ui';
import { P, hexToInt } from '@/palette';
import { txtObj } from './text';

export interface BannerOpts {
  text: string;
  /** Add twinkling sparkles around the ribbon (default true). */
  sparkles?: boolean;
}

/** The ribbon itself; BannerManager animates it. */
export class Banner extends Phaser.GameObjects.Container {
  readonly bw: number;
  private twinkles: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, opts: BannerOpts) {
    super(scene, x, y);
    const def = SLICES.banner;
    // Band centre sits above the texture centre (the tails hang lower).
    const bandDy = -8;
    const label = txtObj(scene, 0, bandDy + 1, opts.text, 'handBig', { color: UI_INK });
    const w = Math.max(def.l + def.r + 40, label.width + 2 * def.l + 8);
    this.bw = w;
    const shadow = panel(scene, 'ui.banner', w, def.h, 0, 5);
    shadow.setTint(hexToInt(P.ink));
    shadow.setAlpha(0.12);
    this.add(shadow);
    this.add(panel(scene, 'ui.banner', w, def.h));
    this.add(label);
    if (opts.sparkles !== false) {
      const spots: [number, number, number][] = [
        [-w / 2 + 52, bandDy - 42, 0.6],
        [w / 2 - 44, bandDy - 38, 0.75],
        [w / 2 - 18, bandDy + 4, 0.45],
        [-w / 2 + 20, bandDy + 14, 0.4],
      ];
      for (const [sx, sy, s] of spots) {
        const sp = artObj(scene, sx, sy, 'sparkle');
        sp.setTint(hexToInt(P.glow)).setScale(s / ART_SCALE);
        sp.setData('s', s);
        this.add(sp);
        this.twinkles.push(sp);
      }
    }
    scene.add.existing(this);
  }

  /** Start the idle twinkle (called by the manager once it has landed). */
  twinkle(): void {
    if (reduceMotion()) return;
    this.twinkles.forEach((sp, i) => {
      const s = sp.getData('s') as number;
      this.scene.tweens.add({
        targets: sp,
        scale: { from: (s * 0.5) / ART_SCALE, to: (s * 1.1) / ART_SCALE },
        alpha: { from: 0.4, to: 1 },
        angle: { from: -10, to: 10 },
        duration: 700 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: EASE.loop,
        delay: i * 160,
      });
    });
  }
}

export interface BannerManagerOpts {
  /** Centre y (default 168, upper third). */
  y?: number;
  /** Hold time in seconds (default 3). */
  hold?: number;
  depth?: number;
  /** Listen to bus 'banner' (default true). */
  subscribe?: boolean;
}

export class BannerManager {
  private scene: Phaser.Scene;
  private o: BannerManagerOpts;
  private queue: string[] = [];
  private current?: Banner;

  constructor(scene: Phaser.Scene, opts: BannerManagerOpts = {}) {
    this.scene = scene;
    this.o = opts;
    if (opts.subscribe !== false) bus.onScene(scene, 'banner', (e) => this.show(e.text));
    const off = onLayout((l) => this.current?.setX(l.w / 2));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.queue = [];
      this.current?.destroy();
    });
  }

  show(text: string): void {
    if (this.current || this.queue.length) {
      if (!this.queue.includes(text)) this.queue.push(text);
      if (!this.current) this.next();
      return;
    }
    this.play(text);
  }

  private next(): void {
    const t = this.queue.shift();
    if (t) this.play(t);
  }

  private play(text: string): void {
    const scene = this.scene;
    const y = this.o.y ?? Math.max(168, layout().safe.top + 150);
    const b = new Banner(scene, layout().w / 2, y - 46, { text });
    b.setDepth(this.o.depth ?? DEPTH.toast - 1).setScrollFactor(0);
    this.current = b;
    const rm = reduceMotion();
    b.setAlpha(0).setAngle(rm ? 0 : -4);
    bus.emit('sfx', { id: 'chime', vol: 0.6 });
    scene.tweens.add({
      targets: b,
      y,
      alpha: 1,
      angle: 0,
      duration: rm ? 300 : 900,
      ease: rm ? EASE.out : 'Back.easeOut',
      easeParams: [1.2],
      onComplete: () => {
        b.twinkle();
        if (!rm) {
          scene.tweens.add({ targets: b, y: y + 4, angle: 0.8, duration: 1500, yoyo: true, repeat: -1, ease: EASE.loop });
        }
        scene.time.delayedCall((this.o.hold ?? 3) * 1000, () => this.leave(b, y));
      },
    });
  }

  private leave(b: Banner, y: number): void {
    const scene = this.scene;
    scene.tweens.killTweensOf(b);
    const rm = reduceMotion();
    scene.tweens.add({
      targets: b,
      y: y - (rm ? 10 : 60),
      alpha: 0,
      angle: rm ? 0 : 3,
      duration: rm ? 300 : 1100,
      ease: EASE.in,
      onComplete: () => {
        b.destroy();
        if (this.current === b) this.current = undefined;
        scene.time.delayedCall(250, () => this.next());
      },
    });
  }
}
