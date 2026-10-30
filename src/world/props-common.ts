/**
 * Shared bits for the camp props: the Lightable contract, the soft breathing
 * highlight outline, a once-per-frame wind sample, and fire warmth for props
 * standing near a campfire.
 */
import Phaser from 'phaser';
import { artObj } from '@/art/kit';
import type { ResolvedLight } from '@/fx/lighting';
import { P, hexToInt, mix } from '@/palette';
import { windAt, type Wind } from './wind';

export interface Lightable {
  setLight(l: ResolvedLight): void;
  update(time: number, delta: number): void;
  destroy(): void;
}

type Img = Phaser.GameObjects.Image;
type Box = Phaser.GameObjects.Container;

export const GLOW_INT = hexToInt(P.glow);
export const EMBER_INT = hexToInt(P.ember);
const WARM_HEX = mix(P.glow, P.cream, 0.4);

// ---------------------------------------------------------------------------
// Wind: sampled once per frame for every prop (windAt allocates a result).
// ---------------------------------------------------------------------------

let windT = -1;
let windV: Wind = { base: 0, gust: 0, gustStart: false };
export function wind(timeMs: number): Wind {
  if (timeMs !== windT) {
    windT = timeMs;
    windV = windAt(timeMs / 1000);
  }
  return windV;
}

// ---------------------------------------------------------------------------
// Fire warmth: props near a campfire pick up its warm light at night.
// ---------------------------------------------------------------------------

interface WarmSource {
  lightPoolAt(x: number): number;
}
const fires = new Set<WarmSource>();
export function registerFire(f: WarmSource): void {
  fires.add(f);
}
export function unregisterFire(f: WarmSource): void {
  fires.delete(f);
}

/** l.actor warmed by nearby firelight (computed in setLight, not per frame). */
export function warmTint(l: ResolvedLight, x: number, k = 1): number {
  if (l.warmLight <= 0.01 || fires.size === 0) return l.actor;
  let w = 0;
  for (const f of fires) w = Math.max(w, f.lightPoolAt(x));
  w *= l.warmLight * k;
  if (w < 0.02) return l.actor;
  return hexToInt(mix(l.hex.actor, WARM_HEX, Math.min(0.6, w * 0.8)));
}

/** Tint between the light's actor colour and full brightness (for glowing things). */
export function liftTint(l: ResolvedLight, lift: number): number {
  return lift <= 0 ? l.actor : hexToInt(mix(l.hex.actor, P.cream, Math.min(1, lift)));
}

// ---------------------------------------------------------------------------
// Highlight: a soft breathing outline (silhouette copy tinted glow, slightly
// larger, behind the target) plus a faint additive aura.
// ---------------------------------------------------------------------------

export class Highlight {
  private copy: Img | null = null;
  private aura: Img;
  private on = false;
  private tween: Phaser.Tweens.Tween | null = null;
  private k = { v: 0 };

  constructor(
    private scene: Phaser.Scene,
    private target: Img | Box,
    private w: number,
    private h: number,
    parent?: Box | null,
  ) {
    const host = parent ?? (target instanceof Phaser.GameObjects.Container ? target : target.parentContainer);
    this.aura = artObj(scene, 0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GLOW_INT).setAlpha(0).setVisible(false);
    if (target instanceof Phaser.GameObjects.Image) {
      this.copy = new Phaser.GameObjects.Image(scene, target.x, target.y, target.texture.key).setVisible(false).setAlpha(0);
      this.sync();
      if (host) {
        const idx = target.parentContainer === host ? Math.max(0, host.getIndex(target)) : 0;
        host.addAt(this.copy, idx);
        host.addAt(this.aura, idx);
      } else {
        scene.add.existing(this.aura);
        scene.add.existing(this.copy);
        this.aura.setDepth(target.depth - 0.02);
        this.copy.setDepth(target.depth - 0.01);
      }
    } else {
      this.aura.setPosition(0, -h / 2).setDisplaySize(w * 1.5, h * 1.35);
      target.addAt(this.aura, 0);
    }
  }

  /** Re-copy texture, origin, scale and position from the target (after swaps). */
  sync(): void {
    const t = this.target;
    if (!this.copy || !(t instanceof Phaser.GameObjects.Image)) return;
    const c = this.copy;
    c.setTexture(t.texture.key);
    c.setOrigin(t.originX, t.originY);
    c.setPosition(t.x, t.y);
    c.setScale(t.scaleX * (1 + 8 / this.w), t.scaleY * (1 + 8 / this.h));
    c.setFlip(t.flipX, t.flipY);
    c.setTintFill(GLOW_INT);
    const cx = t.x + (0.5 - t.originX) * t.displayWidth;
    const cy = t.y + (0.5 - t.originY) * t.displayHeight;
    this.aura.setPosition(cx, cy).setDisplaySize(this.w * 1.45, this.h * 1.3);
  }

  private apply(): void {
    const v = this.k.v;
    if (this.copy) this.copy.setAlpha(v * 0.85);
    this.aura.setAlpha(v * 0.28);
  }

  set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.tween?.stop();
    if (on) {
      this.sync();
      this.copy?.setVisible(true);
      this.aura.setVisible(true);
      this.k.v = Math.max(this.k.v, 0.2);
      this.tween = this.scene.tweens.add({
        targets: this.k,
        v: { from: 0.45, to: 1 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.apply(),
      });
    } else {
      this.tween = this.scene.tweens.add({
        targets: this.k,
        v: 0,
        duration: 260,
        ease: 'Sine.easeOut',
        onUpdate: () => this.apply(),
        onComplete: () => {
          this.copy?.setVisible(false);
          this.aura.setVisible(false);
        },
      });
    }
  }

  destroy(): void {
    this.tween?.stop();
    this.copy?.destroy();
    this.aura.destroy();
  }
}

/** Small soft breathing outline/glow used to mark nearby interactables (max 3 glowing at once is the scene's job). */
export function makeHighlight(scene: Phaser.Scene, target: Phaser.GameObjects.Image | Phaser.GameObjects.Container, w: number, h: number): { set(on: boolean): void; destroy(): void } {
  return new Highlight(scene, target, w, h);
}

/** An additive glow sprite (fx 'glow' texture), hidden until lit. */
export function glowSprite(scene: Phaser.Scene, x: number, y: number, w: number, h: number, colour: number, depth?: number, key = 'glow'): Img {
  const g = artObj(scene, x, y, key).setBlendMode(Phaser.BlendModes.ADD).setTint(colour).setAlpha(0);
  g.setDisplaySize(w, h);
  if (depth !== undefined) {
    scene.add.existing(g);
    g.setDepth(depth);
  }
  return g;
}
