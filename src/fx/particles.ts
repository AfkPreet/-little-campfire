/**
 * Pooled particles (spec section 8): fireflies (20-40, noise wander, glow
 * pulse), embers, steam, 2-layer rain with splashes and drips, drifting
 * petals/leaves by day, sparkles on discoveries, dust puffs. Budget ~400 live
 * particles total; Reduce motion thins everything out.
 */
import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { P, hexToInt, mixInt } from '@/palette';

const K = 1 / ART_SCALE;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

function rmScale(n: number): number {
  return reduceMotion() ? Math.max(1, Math.round(n * 0.35)) : n;
}

// ---------------------------------------------------------------------------
// Bursts
// ---------------------------------------------------------------------------

/** Sparkles on discoveries/pickups. */
export function sparkleBurst(scene: Phaser.Scene, x: number, y: number, opts: { count?: number; color?: string; depth?: number; spread?: number; scrollFactor?: number } = {}): void {
  const count = rmScale(opts.count ?? 10);
  const em = scene.add.particles(x, y, 'sparkle', {
    speed: { min: 60, max: (opts.spread ?? 1) * 170 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 500, max: 900 },
    scale: { start: 0.5 * K, end: 0 },
    rotate: { min: -90, max: 90 },
    alpha: { start: 1, end: 0 },
    tint: [hexToInt(opts.color ?? P.glow), hexToInt(P.cream), hexToInt(P.butter)],
    blendMode: Phaser.BlendModes.ADD,
    gravityY: 40,
    emitting: false,
  });
  em.setDepth(opts.depth ?? 75);
  if (opts.scrollFactor !== undefined) em.setScrollFactor(opts.scrollFactor);
  em.explode(count);
  scene.time.delayedCall(1200, () => em.destroy());
}

/** A soft trail of sparkles following a path (forage items arcing to basket). */
export function sparkleTrail(scene: Phaser.Scene, follow: Phaser.GameObjects.Components.Transform, depth = 75, scrollFactor?: number): Emitter {
  const em = scene.add.particles(0, 0, 'sparkle', {
    follow: follow as Phaser.Types.Math.Vector2Like,
    speed: { min: 5, max: 25 },
    lifespan: 420,
    frequency: reduceMotion() ? 120 : 45,
    scale: { start: 0.4 * K, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint: [hexToInt(P.glow), hexToInt(P.cream)],
    blendMode: Phaser.BlendModes.ADD,
  });
  em.setDepth(depth);
  if (scrollFactor !== undefined) em.setScrollFactor(scrollFactor);
  return em;
}

/** Tiny dust puffs at the feet on landing. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, tint = P.cream, depth = 59): void {
  if (reduceMotion()) return;
  const em = scene.add.particles(x, y, 'puff', {
    speedX: { min: -30, max: 30 },
    speedY: { min: -14, max: -4 },
    lifespan: { min: 300, max: 500 },
    scale: { start: 0.14 * K * 1.6, end: 0.32 * K * 1.6 },
    alpha: { start: 0.45, end: 0 },
    tint: hexToInt(tint),
    emitting: false,
  });
  em.setDepth(depth);
  em.explode(3);
  scene.time.delayedCall(700, () => em.destroy());
}

/** Floating hearts (release a fish, share with the companion). */
export function heartBurst(scene: Phaser.Scene, x: number, y: number, count = 4, depth = 76, scrollFactor?: number): void {
  const em = scene.add.particles(x, y, 'heart', {
    speedX: { min: -30, max: 30 },
    speedY: { min: -70, max: -40 },
    lifespan: { min: 900, max: 1400 },
    scale: { start: 0.55 * K, end: 0.3 * K },
    alpha: { start: 1, end: 0 },
    tint: [hexToInt(P.blush), hexToInt(P.rose), hexToInt(P.peach)],
    emitting: false,
  });
  em.setDepth(depth);
  if (scrollFactor !== undefined) em.setScrollFactor(scrollFactor);
  em.explode(rmScale(count));
  scene.time.delayedCall(1600, () => em.destroy());
}

/** Expanding water rings (bobber landing, raindrops, splashes). */
export function ripple(scene: Phaser.Scene, x: number, y: number, opts: { rings?: number; size?: number; depth?: number; tint?: string } = {}): void {
  const rings = opts.rings ?? 2;
  for (let i = 0; i < rings; i++) {
    const r = scene.add.image(x, y, 'ring').setDepth(opts.depth ?? 45).setTint(hexToInt(opts.tint ?? P.cream));
    r.setScale(0.15 * K, 0.05 * K).setAlpha(0.8);
    scene.tweens.add({
      targets: r,
      scaleX: (opts.size ?? 1) * 1.1 * K,
      scaleY: (opts.size ?? 1) * 0.32 * K,
      alpha: 0,
      duration: 900 + i * 250,
      delay: i * 180,
      ease: 'Sine.easeOut',
      onComplete: () => r.destroy(),
    });
  }
}

// ---------------------------------------------------------------------------
// Continuous emitters
// ---------------------------------------------------------------------------

/** Rising embers above a fire. */
export function embers(scene: Phaser.Scene, x: number, y: number, depth = 72): Emitter {
  const em = scene.add.particles(x, y, 'dot', {
    x: { min: -14, max: 14 },
    speedY: { min: -60, max: -30 },
    speedX: { min: -12, max: 12 },
    accelerationX: { min: -10, max: 10 },
    lifespan: { min: 1200, max: 2200 },
    frequency: reduceMotion() ? 600 : 180,
    scale: { start: 0.5 * K, end: 0.05 * K },
    alpha: { start: 1, end: 0 },
    tint: [hexToInt(P.ember), hexToInt(P.glow), hexToInt(P.butter)],
    blendMode: Phaser.BlendModes.ADD,
  });
  em.setDepth(depth);
  return em;
}

/** Steam rising from a pot/kettle. */
export function steam(scene: Phaser.Scene, x: number, y: number, depth = 72, strength = 1): Emitter {
  const em = scene.add.particles(x, y, 'puff', {
    x: { min: -10, max: 10 },
    speedY: { min: -40 * strength, max: -22 * strength },
    speedX: { min: -8, max: 8 },
    lifespan: { min: 1200, max: 1900 },
    frequency: reduceMotion() ? 400 : 140 / strength,
    scale: { start: 0.25 * K * 1.4, end: 0.9 * K * 1.4 },
    alpha: { start: 0.38, end: 0 },
    tint: hexToInt(P.cream),
  });
  em.setDepth(depth);
  return em;
}

// ---------------------------------------------------------------------------
// Rain (screen space, 2 layers) + splashes + drips
// ---------------------------------------------------------------------------

export class Rain {
  private far: Emitter;
  private near: Emitter;
  private splashes: Emitter;
  private drips: Emitter | null = null;
  private amount = 0;
  private target = 0;
  private w: number;
  private h: number;

  constructor(private scene: Phaser.Scene, w: number, h: number, depth = 95, groundY = 612) {
    this.w = w;
    this.h = h;
    const zone = (y0: number) => ({ type: 'random' as const, source: new Phaser.Geom.Rectangle(-80, y0, w + 200, 10) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource });
    this.far = scene.add.particles(0, 0, 'streak', {
      emitZone: zone(-40),
      speedY: { min: 520, max: 620 },
      speedX: { min: -70, max: -50 },
      lifespan: 1700,
      scaleX: 0.55 * K,
      scaleY: { min: 0.45 * K, max: 0.6 * K },
      rotate: 6,
      alpha: { min: 0.18, max: 0.32 },
      tint: hexToInt(P.cream),
      frequency: 30,
      quantity: 1,
      emitting: false,
    });
    this.near = scene.add.particles(0, 0, 'streak', {
      emitZone: zone(-60),
      speedY: { min: 820, max: 980 },
      speedX: { min: -110, max: -80 },
      lifespan: 1100,
      scaleX: 0.85 * K,
      scaleY: { min: 0.9 * K, max: 1.2 * K },
      rotate: 6,
      alpha: { min: 0.3, max: 0.5 },
      tint: hexToInt(P.cream),
      frequency: 45,
      quantity: 1,
      emitting: false,
    });
    this.splashes = scene.add.particles(0, 0, 'dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, groundY - 30, w, 60) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      speedY: { min: -60, max: -25 },
      speedX: { min: -25, max: 25 },
      gravityY: 260,
      lifespan: 320,
      scale: { start: 0.32 * K, end: 0.05 * K },
      alpha: { start: 0.55, end: 0 },
      tint: hexToInt(P.cream),
      frequency: 60,
      quantity: 2,
      emitting: false,
    });
    for (const e of [this.far, this.near, this.splashes]) e.setScrollFactor(0).setDepth(depth);
    this.far.setDepth(depth - 60); // far rain behind the near trees
  }

  /** Drips falling off a tent edge (world coords). */
  setDrips(x0: number, x1: number, y: number, depth = 66): void {
    this.drips?.destroy();
    this.drips = this.scene.add.particles(0, 0, 'drop', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(x0, y, x1 - x0, 2) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      speedY: { min: 40, max: 80 },
      gravityY: 700,
      lifespan: 520,
      scale: 0.5 * K,
      alpha: { start: 0.7, end: 0.2 },
      tint: hexToInt(P.powder),
      frequency: 260,
      emitting: this.amount > 0.3,
    });
    this.drips.setDepth(depth);
  }

  clearDrips(): void {
    this.drips?.destroy();
    this.drips = null;
  }

  /** Target rain amount 0..1 (eases toward it in update). */
  set(target: number, instant = false): void {
    this.target = target;
    if (instant) this.amount = target;
    this.apply();
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    const r1 = (this.far.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined)?.source;
    const r2 = (this.near.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined)?.source;
    const r3 = (this.splashes.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined)?.source;
    if (r1) r1.width = w + 200;
    if (r2) r2.width = w + 200;
    if (r3) r3.width = w;
  }

  update(dt: number): void {
    if (Math.abs(this.amount - this.target) > 0.001) {
      const step = dt / 6; // ~6 s fade
      this.amount += Math.sign(this.target - this.amount) * Math.min(step, Math.abs(this.target - this.amount));
      this.apply();
    }
  }

  get value(): number {
    return this.amount;
  }

  private apply(): void {
    const a = this.amount;
    const rm = reduceMotion();
    const on = a > 0.02;
    const set = (e: Emitter, base: number, rmMult: number) => {
      if (!on) {
        if (e.emitting) e.stop();
        return;
      }
      e.frequency = Math.max(8, base / Math.max(0.05, a) / (rm ? rmMult : 1));
      if (!e.emitting) e.start();
    };
    set(this.far, 26, 0.35);
    set(this.near, 40, 0.35);
    set(this.splashes, 70, 0.4);
    if (this.drips) {
      if (a > 0.3 && !this.drips.emitting) this.drips.start();
      if (a <= 0.3 && this.drips.emitting) this.drips.stop();
    }
    void this.w;
    void this.h;
  }

  destroy(): void {
    this.far.destroy();
    this.near.destroy();
    this.splashes.destroy();
    this.drips?.destroy();
  }
}

// ---------------------------------------------------------------------------
// Drifting petals / leaves by day (screen space)
// ---------------------------------------------------------------------------

export class Drifters {
  private em: Emitter;
  constructor(scene: Phaser.Scene, w: number, h: number, depth = 88) {
    this.em = scene.add.particles(0, 0, 'petal', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(w * 0.2, -20, w * 1.0, 10) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      speedY: { min: 18, max: 40 },
      speedX: { min: -50, max: -20 },
      accelerationX: { min: -6, max: 6 },
      rotate: { start: 0, end: 360 },
      lifespan: { min: 12000, max: 18000 },
      scale: { min: 0.5 * K, max: 0.9 * K },
      alpha: { start: 0.85, end: 0.4 },
      tint: [hexToInt(P.blush), hexToInt(P.rose), hexToInt(P.peach), hexToInt(P.cream)],
      frequency: reduceMotion() ? 3200 : 1100,
      emitting: false,
    });
    this.em.setScrollFactor(0).setDepth(depth);
    void h;
  }
  setActive(on: boolean): void {
    if (on && !this.em.emitting) this.em.start();
    if (!on && this.em.emitting) this.em.stop();
  }
  destroy(): void {
    this.em.destroy();
  }
}

// ---------------------------------------------------------------------------
// Fireflies: pooled glow sprites with noise-driven wander and glow pulse
// ---------------------------------------------------------------------------

interface Fly {
  core: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  x: number;
  y: number;
  phase: number;
  speed: number;
  seedX: number;
  seedY: number;
}

export class Fireflies {
  private flies: Fly[] = [];
  private visibleAmount = 0;
  private target = 0;
  private swirlT = -1;
  private swirlC = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, private area: { x0: number; x1: number; y0: number; y1: number }, count = 30, depth = 74) {
    const n = rmScale(Math.max(20, Math.min(40, count)));
    for (let i = 0; i < n; i++) {
      const halo = scene.add.image(0, 0, 'glowSmall').setBlendMode(Phaser.BlendModes.ADD).setTint(mixInt(P.glow, P.ember, 0.35)).setDepth(depth).setScale(0.9 * K);
      const core = scene.add.image(0, 0, 'dot').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.butter)).setDepth(depth).setScale(0.32 * K);
      const fly: Fly = {
        core,
        halo,
        x: Phaser.Math.FloatBetween(area.x0, area.x1),
        y: Phaser.Math.FloatBetween(area.y0, area.y1),
        phase: Math.random() * Math.PI * 2,
        speed: Phaser.Math.FloatBetween(0.5, 1.1),
        seedX: Math.random() * 100,
        seedY: Math.random() * 100,
      };
      this.flies.push(fly);
    }
    this.applyAlpha(0);
  }

  /** 0..1 visibility (night amount, fewer in rain). */
  setAmount(a: number, instant = false): void {
    this.target = a;
    if (instant) this.visibleAmount = a;
  }

  /** The firefly-swirl rare moment: gather into a slow spiral around a point. */
  swirl(x: number, y: number): void {
    this.swirlT = 0;
    this.swirlC = { x, y };
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.visibleAmount += (this.target - this.visibleAmount) * Math.min(1, dt * 0.8);
    if (this.visibleAmount < 0.01 && this.target === 0) {
      this.applyAlpha(0);
      return;
    }
    const t = time / 1000;
    const rm = reduceMotion();
    if (this.swirlT >= 0) {
      this.swirlT += dt;
      if (this.swirlT > 9) this.swirlT = -1;
    }
    this.flies.forEach((f, i) => {
      // Smooth noise wander from summed sines (cheap, organic).
      const nx = Math.sin(t * 0.37 * f.speed + f.seedX) + Math.sin(t * 0.83 * f.speed + f.seedX * 1.7) * 0.5;
      const ny = Math.sin(t * 0.29 * f.speed + f.seedY) + Math.sin(t * 0.71 * f.speed + f.seedY * 1.3) * 0.5;
      f.x += nx * (rm ? 4 : 12) * dt;
      f.y += ny * (rm ? 3 : 9) * dt;
      if (f.x < this.area.x0) f.x += (this.area.x1 - this.area.x0);
      if (f.x > this.area.x1) f.x -= (this.area.x1 - this.area.x0);
      f.y = Phaser.Math.Clamp(f.y, this.area.y0, this.area.y1);
      let x = f.x;
      let y = f.y;
      if (this.swirlT >= 0) {
        const s = this.swirlT;
        const k = Math.min(1, s / 2) * Math.min(1, (9 - s) / 2);
        const a = t * 0.9 + (i / this.flies.length) * Math.PI * 2;
        const r = 40 + (i % 5) * 18 + Math.sin(t + i) * 6;
        x = Phaser.Math.Linear(f.x, this.swirlC.x + Math.cos(a) * r, k);
        y = Phaser.Math.Linear(f.y, this.swirlC.y + Math.sin(a) * r * 0.55 - (i % 7) * 6, k);
      }
      f.core.setPosition(x, y);
      f.halo.setPosition(x, y);
      const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 * f.speed + f.phase));
      f.core.setAlpha(this.visibleAmount * (0.4 + 0.6 * pulse));
      f.halo.setAlpha(this.visibleAmount * pulse * 0.75);
    });
  }

  private applyAlpha(a: number): void {
    for (const f of this.flies) {
      f.core.setAlpha(a);
      f.halo.setAlpha(a);
    }
  }

  destroy(): void {
    for (const f of this.flies) {
      f.core.destroy();
      f.halo.destroy();
    }
    this.flies = [];
  }
}
