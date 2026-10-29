/**
 * Base for part-built characters (spec section 8, "Characters"): separate
 * parts (head, body, ears, eyes, limbs, tail) inside a container whose origin
 * is at the feet, so squash/stretch and breathing scale from the ground.
 *
 * Subclasses add parts with part(), implement applyExpression()/applyBlink(),
 * and may override idleTick() for their quirk.
 */
import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';

export type Expression = 'neutral' | 'happy' | 'blissful' | 'surprised' | 'sleepy' | 'munching';
export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'blissful', 'surprised', 'sleepy', 'munching'];

export class Rig extends Phaser.GameObjects.Container {
  /** Squash/flip container (origin at feet). */
  readonly inner: Phaser.GameObjects.Container;
  /** Breathing container (inside inner); parts go here by default. */
  readonly breath: Phaser.GameObjects.Container;
  readonly parts = new Map<string, Phaser.GameObjects.Image>();
  expression: Expression = 'neutral';
  facing: 1 | -1 = 1;
  /** Logical height (for layout/hit areas). */
  heightPx = 100;

  /** Breathing: scaleY 1.00 -> 1.03 on a 2.4 s sine. */
  breathAmount = 0.03;
  breathPeriod = 2400;
  blinkMin = 2000;
  blinkMax = 5000;

  protected t = 0;
  private nextBlink = 0;
  private blinking = false;
  private squashY = 1;
  private squashX = 1;
  private squashTween?: Phaser.Tweens.Tween;

  // Walking
  walking = false;
  walkSpeed = 150; // logical px / s
  hopHeight = 5;
  hopPeriod = 0.36; // s per hop
  private walkTarget: number | null = null;
  private walkDone?: () => void;
  private hopPhase = 0;
  private lastHopIndex = 0;
  /** Called each time a hop lands (for dust puffs + footstep sounds). */
  onStep?: (x: number, y: number) => void;

  private tintColor = 0xffffff;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.inner = new Phaser.GameObjects.Container(scene, 0, 0);
    this.breath = new Phaser.GameObjects.Container(scene, 0, 0);
    this.inner.add(this.breath);
    this.add(this.inner);
    this.nextBlink = Phaser.Math.Between(this.blinkMin, this.blinkMax);
    scene.add.existing(this);
  }

  /**
   * Add a part texture in logical coords relative to the feet (y negative is up).
   * Parts are layered in call order. Returns the image for further tweaking.
   */
  part(name: string, key: string, x: number, y: number, ox = 0.5, oy = 0.5, parent: Phaser.GameObjects.Container = this.breath): Phaser.GameObjects.Image {
    const img = new Phaser.GameObjects.Image(this.scene, x, y, key).setOrigin(ox, oy).setScale(1 / ART_SCALE);
    img.setData('baseX', x);
    img.setData('baseY', y);
    img.setData('baseAngle', 0);
    parent.add(img);
    this.parts.set(name, img);
    if (this.tintColor !== 0xffffff) img.setTint(this.tintColor);
    return img;
  }

  /** Swap the texture of a part (e.g. eyes for an expression). */
  swapPart(name: string, key: string): void {
    const p = this.parts.get(name);
    if (p && p.texture.key !== key && this.scene.textures.exists(key)) p.setTexture(key);
  }

  setExpression(e: Expression): this {
    if (this.expression === e) return this;
    this.expression = e;
    this.applyExpression(e);
    return this;
  }

  /** Override: swap face parts for the expression. */
  protected applyExpression(_e: Expression): void {}

  /** Override: show/hide closed eyes. */
  protected applyBlink(_closed: boolean): void {}

  /** Override: per-frame idle details (ear flicks, glances, the quirk). */
  protected idleTick(_t: number, _dt: number): void {}

  face(dir: 1 | -1): this {
    this.facing = dir;
    this.inner.scaleX = dir * this.squashX;
    return this;
  }

  /** Squash & stretch from the feet (0.92 / 1.06 on landing by default). */
  squash(x = 1.06, y = 0.92, ms = 110): void {
    if (reduceMotion()) return;
    this.squashTween?.stop();
    const o = { sx: this.squashX, sy: this.squashY };
    this.squashX = x;
    this.squashY = y;
    o.sx = x;
    o.sy = y;
    this.squashTween = this.scene.tweens.add({
      targets: o,
      sx: 1,
      sy: 1,
      duration: ms * 3,
      ease: 'Back.easeOut',
      easeParams: [2.5],
      onUpdate: () => {
        this.squashX = o.sx;
        this.squashY = o.sy;
      },
    });
  }

  /** Little pop on spawn/pickup. */
  pop(): void {
    this.squash(0.86, 1.14, 90);
  }

  /** Walk (hop) to x; resolves on arrival. */
  walkTo(x: number, onArrive?: () => void): void {
    this.walkTarget = x;
    this.walkDone = onArrive;
    if (Math.abs(x - this.x) < 2) {
      this.stopWalk(true);
      return;
    }
    this.walking = true;
    this.face(x > this.x ? 1 : -1);
  }

  stopWalk(arrived = false): void {
    const done = this.walkDone;
    this.walking = false;
    this.walkTarget = null;
    this.walkDone = undefined;
    this.inner.y = 0;
    if (arrived) done?.();
  }

  setLightTint(color: number): this {
    if (color === this.tintColor) return this;
    this.tintColor = color;
    for (const p of this.parts.values()) {
      if (!p.getData('noTint')) p.setTint(color);
    }
    return this;
  }

  get lightTint(): number {
    return this.tintColor;
  }

  /** Call from the scene's update(). */
  tick(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const rm = reduceMotion();

    // Breathing.
    const breath = rm ? 0 : this.breathAmount * (0.5 - 0.5 * Math.cos((this.t * 1000 * Math.PI * 2) / this.breathPeriod));
    this.breath.scaleY = 1 + breath;
    this.breath.scaleX = 1 - breath * 0.25;

    // Walking: hop bob + squash on landing.
    if (this.walking && this.walkTarget !== null) {
      const dir = Math.sign(this.walkTarget - this.x);
      const step = this.walkSpeed * dt;
      if (Math.abs(this.walkTarget - this.x) <= step) {
        this.x = this.walkTarget;
        this.stopWalk(true);
        this.squash(1.06, 0.92);
      } else {
        this.x += dir * step;
        this.hopPhase += dt / this.hopPeriod;
        const idx = Math.floor(this.hopPhase);
        const f = this.hopPhase - idx;
        this.inner.y = rm ? 0 : -Math.sin(f * Math.PI) * this.hopHeight;
        if (idx !== this.lastHopIndex) {
          this.lastHopIndex = idx;
          if (!rm) this.squash(1.06, 0.92, 70);
          this.onStep?.(this.x, this.y);
        }
      }
    }

    this.inner.scaleX = this.facing * this.squashX;
    this.inner.scaleY = this.squashY;

    // Blink every 2-5 s.
    if (!this.blinking && this.t * 1000 > this.nextBlink && this.expression !== 'sleepy' && this.expression !== 'blissful') {
      this.blinking = true;
      this.applyBlink(true);
      this.scene.time.delayedCall(120, () => {
        this.blinking = false;
        this.applyBlink(false);
        this.nextBlink = this.t * 1000 + Phaser.Math.Between(this.blinkMin, this.blinkMax);
      });
    }

    this.idleTick(time, dt);
  }

  /** Helper for subclasses: gentle loop tween on a part's angle. */
  protected sway(name: string, deg: number, ms: number, delay = 0): void {
    const p = this.parts.get(name);
    if (!p || reduceMotion()) return;
    this.scene.tweens.add({ targets: p, angle: { from: -deg, to: deg }, duration: ms, yoyo: true, repeat: -1, ease: EASE.loop, delay });
  }
}
