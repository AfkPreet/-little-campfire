/**
 * Kuhiro, the great mist-fish of Jun Pokhari (WORLD 5.4): the guardian and
 * the emotional climax of the trip. Enormous (~560 x 300 above the water),
 * soft, slow, calm and luminous. Built from separate baked parts (src/art/
 * kuhiro.ts) and relit only by multiply tint, alpha and additive glows.
 *
 * The Camp scene orchestrates the finale with these building blocks; nothing
 * here touches game state. Call tick() every frame and setLight() when the
 * light changes.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { lightAt, type ResolvedLight } from '@/fx/lighting';
import { ripple, sparkleBurst, sparkleTrail } from '@/fx/particles';
import { A, P, hexToInt, mixInt } from '@/palette';
import { BODY_BOX, KH, LID_FRAMES, crossSection, gurans, scaleList, topContour } from '@/art/kuhiro';

const K = 1 / ART_SCALE;
/** How far below the waterline the body waits before it rises. */
const DEEP = 350;
const TAU = Math.PI * 2;

type Img = Phaser.GameObjects.Image;
type Ctr = Phaser.GameObjects.Container;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

interface Freckle {
  core: Img;
  halo: Img;
  base: number;
  period: number;
  phase: number;
  /** 0 dim .. 1 lit. */
  lit: number;
  /** Extra flash 0..1 (decays). */
  flash: number;
  r: number;
}

interface EyeParts {
  eye: Img;
  lidA: Img;
  lidB: Img;
  closed: Img;
  happy: Img;
  prefix: string;
  lastI: number;
}

export class Kuhiro extends Phaser.GameObjects.Container {
  /** Called on the soft bump of nuzzle() (also emitted as 'nuzzle'). */
  onNuzzle?: () => void;

  private readonly halo: Img;
  private readonly tail: Img;
  private readonly liftC: Ctr;
  private readonly pivotC: Ctr;
  private readonly bodyC: Ctr;
  private readonly bodyImg: Img;
  private readonly crest: Img;
  private readonly finNear: Img;
  private readonly finFar: Img;
  private readonly gills: Img;
  private readonly gleam: Img;
  private readonly heartGlow: Img;
  private readonly heartCore: Img;
  private readonly blushes: Img[];
  private readonly eyes: EyeParts[];
  private readonly mouthSmile: Img;
  private readonly mouthO: Img;
  private readonly glints: { img: Img; p: number }[] = [];
  private readonly flowerF: Freckle[] = [];
  private readonly scatterF: Freckle[] = [];
  private readonly veil: Img;
  private readonly waterGlow: Img;
  private readonly waterline: Img;
  private readonly drops: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly mist: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly plume: Phaser.GameObjects.Particles.ParticleEmitter;

  // Animated state (tweened, applied in tick).
  private clock = 0;
  private lift = 0;
  private presence = 0;
  private glowLevel = 0;
  private tilt = 0;
  private bumpX = 0;
  private tailLift = 0;
  private tailAngle = 0;
  private blinkF = 0;
  private closeF = 0;
  private happyF = 0;
  private mouthOpen = 0;
  private blushA = 0.6;
  private gleamA = 0;
  private gillFlare = 0;
  private breathBoost = 0;
  private rumble = 0;
  private sheeting = 0;

  private risen = false;
  private busy = false;
  private blinking = false;
  private nextBlink = 7;
  private nextBreath = 4;
  private nextSweep = 2;
  private sweepT = -1;
  private nextLap = 1;
  private dropAcc = 0;
  private happy = false;
  private bodyTint = 0xffffff;
  private lastBodyY = 9999;
  private readonly topPts: [number, number][];

  constructor(scene: Phaser.Scene, x: number, waterY: number) {
    super(scene, x, waterY);
    const mk = (key: string, px: number, py: number, ox = 0.5, oy = 0.5): Img =>
      new Phaser.GameObjects.Image(scene, px, py, key).setOrigin(ox, oy).setScale(K);

    this.topPts = topContour(-178, 396, 6).filter((p) => p[1] < -24);

    // Halo (behind everything): additive, 1.5x the body.
    const h = KH.halo;
    this.halo = mk('soft', h.x, h.y).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow-edge']));
    this.halo.setScale((K * h.w) / 128, (K * h.h) / 128);

    // Tail: separate so it can lift and flip out at the far right.
    this.tail = mk('kuhiro_tail', KH.tail.x, 140, 0.5, 0.95);

    this.liftC = new Phaser.GameObjects.Container(scene, 0, DEEP);
    this.pivotC = new Phaser.GameObjects.Container(scene, KH.pivot.x, KH.pivot.y);
    this.bodyC = new Phaser.GameObjects.Container(scene, -KH.pivot.x, -KH.pivot.y);
    this.liftC.add(this.pivotC);
    this.pivotC.add(this.bodyC);

    const bc = this.bodyC;
    this.crest = mk('kuhiro_crest', KH.crest.x, KH.crest.y, 86 / 176, 50 / 66).setAngle(24);
    this.finFar = mk('kuhiro_fin', KH.finFar.x, KH.finFar.y, 6 / 112, 0.5).setAngle(KH.finFar.angle);
    this.finFar.setScale(K * 0.72);
    this.bodyImg = mk('kuhiro_body', BODY_BOX.x0, BODY_BOX.y0, 0, 0);
    bc.add([this.crest, this.finFar, this.bodyImg]);

    // Shimmer glints, one per scallop.
    for (const s of scaleList()) {
      const g = mk('kuhiro_glint', s.x, s.y).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow']));
      g.setRotation(s.a).setScale(K * (s.r / 36), K * (s.r / 36) * 0.92).setAlpha(0);
      this.glints.push({ img: g, p: s.p });
      bc.add(g);
    }

    this.gills = mk('kuhiro_gills', KH.gills.x, KH.gills.y);
    bc.add(this.gills);

    // Heart-glow: a campfire seen through fog, deep in the chest.
    this.heartGlow = mk('glow', KH.heart.x, KH.heart.y).setTint(hexToInt(P.glow)).setAlpha(0.35);
    this.heartGlow.setScale((K * 250) / 256, (K * 210) / 256);
    this.heartCore = mk('glow', KH.heart.x, KH.heart.y).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setAlpha(0.12);
    this.heartCore.setScale((K * 120) / 256, (K * 100) / 256);
    bc.add([this.heartGlow, this.heartCore]);

    // Freckles: 8-12 scattered small ones, then the Gurans flower.
    const addFreckle = (fx: number, fy: number, r: number, list: Freckle[], base: number) => {
      const halo = mk('glowSmall', fx, fy).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow']));
      halo.setScale((K * r * 6.5) / 48);
      const core = mk('kuhiro_freckle', fx, fy).setScale((K * r) / 5.5);
      list.push({ core, halo, base, period: Phaser.Math.FloatBetween(2, 4), phase: Math.random() * TAU, lit: 0, flash: 0, r });
      bc.add([halo, core]);
    };
    for (const [fx, fy, r] of KH.scattered) addFreckle(fx, fy, r, this.scatterF, 0.25);
    const fl = KH.flower;
    for (const p of gurans(fl.x, fl.y, fl.ring)) addFreckle(p.x, p.y, p.centre ? fl.rc : fl.r, this.flowerF, 0.32);

    // Face.
    const bn = KH.blushNear;
    const bf = KH.blushFar;
    this.blushes = [mk('kuhiro_blush', bf.x, bf.y).setScale(K * bf.sx, K), mk('kuhiro_blush', bn.x, bn.y)];
    bc.add(this.blushes);
    const mkEye = (prefix: string, ex: number, ey: number, sx: number): EyeParts => {
      const parts: EyeParts = {
        eye: mk('kuhiro_eye', ex, ey).setScale(K * sx, K),
        lidA: mk(`kuhiro_lid${prefix}1`, ex, ey).setScale(K * sx, K).setVisible(false),
        lidB: mk(`kuhiro_lid${prefix}1`, ex, ey).setScale(K * sx, K).setVisible(false),
        closed: mk('kuhiro_eyeClosed', ex, ey).setScale(K * sx, K).setAlpha(0),
        happy: mk('kuhiro_eyeHappy', ex, ey).setScale(K * sx, K).setAlpha(0),
        prefix,
        lastI: -1,
      };
      bc.add([parts.eye, parts.lidA, parts.lidB, parts.closed, parts.happy]);
      return parts;
    };
    this.eyes = [mkEye('F', KH.eyeFar.x, KH.eyeFar.y, KH.eyeFar.sx), mkEye('N', KH.eyeNear.x, KH.eyeNear.y, 1)];
    this.mouthSmile = mk('kuhiro_mouthSmile', KH.mouth.x, KH.mouth.y);
    this.mouthO = mk('kuhiro_mouthO', KH.mouth.x, KH.mouth.y + 4).setAlpha(0);
    bc.add([this.mouthSmile, this.mouthO]);

    this.finNear = mk('kuhiro_fin', KH.finNear.x, KH.finNear.y, 6 / 112, 0.5).setAngle(KH.finNear.angle);
    bc.add(this.finNear);

    this.gleam = mk('kuhiro_gleam', -200, -320, 0, 0).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A.moonmilk));
    this.gleam.setScale(2 * K).setAlpha(0);
    bc.add(this.gleam);

    // The lake in front of the submerged body.
    this.veil = mk('kuhiro_veil', -300, 0, 0, 0).setScale(2 * K);
    this.waterGlow = mk('glow', 110, 26).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['lake-glow'])).setAlpha(0);
    this.waterGlow.setScale((K * 720) / 256, (K * 120) / 256);
    this.waterline = mk('kuhiro_waterline', 110, 0).setTint(hexToInt(A['fish-glow'])).setAlpha(0);

    // Drop strings, gill mist and the breath plume.
    this.drops = scene.add.particles(0, 0, 'drop', {
      speedY: { min: -10, max: 150 },
      speedX: { min: -8, max: 8 },
      gravityY: 520,
      lifespan: 1800,
      scale: { start: 0.46 * K, end: 0.32 * K },
      alpha: { start: 0.92, end: 0.55 },
      tint: [hexToInt(P.cream), hexToInt(A['fish-glow']), hexToInt(A.moonmilk)],
      deathZone: { type: 'onEnter', source: new Phaser.Geom.Rectangle(-2000, 1, 4000, 2000) },
      emitting: false,
    });
    this.mist = scene.add.particles(0, 0, 'puff', {
      speedX: { min: -46, max: -14 },
      speedY: { min: -10, max: 6 },
      accelerationY: 2,
      lifespan: { min: 4200, max: 6200 },
      scale: { start: 0.42 * K * 1.5, end: 2.3 * K * 1.5 },
      alpha: { start: 0.34, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: hexToInt(P.cream),
      emitting: false,
    });
    this.plume = scene.add.particles(0, 0, 'puff', {
      speedY: { min: -230, max: -170 },
      speedX: { min: -14, max: 14 },
      lifespan: { min: 1900, max: 2500 },
      scale: { start: 0.3 * K * 1.5, end: 2.6 * K * 1.5 },
      alpha: { start: 0.5, end: 0 },
      tint: hexToInt(P.cream),
      frequency: 60,
      emitting: false,
    });

    this.add([this.halo, this.tail, this.liftC, this.veil, this.waterGlow, this.waterline, this.drops, this.mist, this.plume]);
    this.setDepth(DEPTH.water + 1);
    this.setAlpha(0);
    this.setVisible(false);
    scene.add.existing(this);
    this.setLight(lightAt(1, 1));
    this.applyLift(true);
  }

  // -------------------------------------------------------------------------
  // Light
  // -------------------------------------------------------------------------

  /** Relight from the current key. Kuhiro is partly self-luminous, so it takes only part of the actor tint. */
  setLight(l: ResolvedLight): void {
    const t = mixInt(l.hex.actor, '#FFFFFF', 0.5 + 0.2 * l.night);
    if (t !== this.bodyTint) {
      this.bodyTint = t;
      const parts: Img[] = [this.bodyImg, this.crest, this.finNear, this.finFar, this.tail, this.gills, this.mouthSmile, this.mouthO, ...this.blushes];
      for (const e of this.eyes) parts.push(e.eye, e.lidA, e.lidB, e.closed, e.happy);
      for (const p of parts) p.setTint(t);
    }
    this.veil.setTint(l.water);
    this.mist.setParticleTint(mixInt(P.cream, l.hex.haze, 0.25));
    this.plume.setParticleTint(mixInt(P.cream, A['fish-glow'], 0.3));
  }

  /** Tint for the water veil, if the lake uses a different colour than LIGHT.water. */
  setWaterTint(color: number): void {
    this.veil.setTint(color);
  }

  // -------------------------------------------------------------------------
  // Public world points
  // -------------------------------------------------------------------------

  private worldOf(lx: number, ly: number): Phaser.Math.Vector2 {
    const m = this.bodyC.getWorldTransformMatrix();
    const p = m.transformPoint(lx, ly);
    return new Phaser.Math.Vector2(p.x, p.y);
  }

  /** World point of the mouth (for the momos' float). */
  mouthPoint(): Phaser.Math.Vector2 {
    return this.worldOf(KH.mouth.x, KH.mouth.y + 4);
  }

  /** World point where the breath plume leaves (pass to cloudPartingPlume). */
  plumePoint(): Phaser.Math.Vector2 {
    return this.worldOf(KH.mouth.x, KH.mouth.y - 10);
  }

  get isRisen(): boolean {
    return this.risen;
  }

  // -------------------------------------------------------------------------
  // Choreography
  // -------------------------------------------------------------------------

  private tw(targets: object, props: Record<string, unknown>, duration: number, ease = 'Sine.easeInOut', delay = 0): Promise<void> {
    return new Promise((res) => {
      this.scene.tweens.add({ targets, ...props, duration, ease, delay, onComplete: () => res() });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.scene.time.delayedCall(ms, () => res()));
  }

  /** ~5 s easeInOutSine rise: water sheets off in cream drop strings, the back gleams, the freckles pulse. */
  async rise(ms = 5000): Promise<void> {
    this.busy = true;
    this.setVisible(true);
    this.lift = 0;
    this.applyLift(true);
    this.tw(this, { presence: 1 }, Math.min(1800, ms * 0.36), 'Sine.easeOut');
    this.tw(this, { glowLevel: 1 }, ms * 0.8, 'Sine.easeInOut');
    this.sheeting = 0;
    // Water sheets off once the head breaks the surface.
    this.scene.time.delayedCall(ms * 0.16, () => {
      this.sheeting = 1;
      this.surfaceRings(1.4);
    });
    this.tw(this, { gleamA: 0.55 }, ms * 0.5, 'Sine.easeIn', ms * 0.25).then(() => this.tw(this, { gleamA: 0.08 }, 2600, 'Sine.easeOut'));
    // Tail lifts out at the far right late in the rise, then settles.
    this.tw(this, { tailLift: 1, tailAngle: -8 }, ms * 0.45, 'Sine.easeInOut', ms * 0.45).then(() =>
      this.tw(this, { tailLift: 0.12, tailAngle: 0 }, 2600, 'Sine.easeInOut'),
    );
    // Freckles pulse in a wave as it rises.
    this.flowerF.concat(this.scatterF).forEach((f, i) => {
      this.scene.time.delayedCall(ms * 0.35 + i * 90, () => (f.flash = 1));
    });
    await this.tw(this, { lift: 1 }, ms, 'Sine.easeInOut');
    this.risen = true;
    this.surfaceRings(1.1);
    this.scene.time.delayedCall(1400, () => this.tw(this, { sheeting: 0 }, 1400, 'Sine.easeOut'));
    this.nextBlink = this.clock + 2.5;
    this.nextBreath = this.clock + 2;
    this.busy = false;
  }

  /** Widening rings, a gentle tail flip, the glow fades. */
  async sink(ms = 3200): Promise<void> {
    this.busy = true;
    this.risen = false;
    this.sheeting = 0;
    this.tw(this, { closeF: 0.0, happyF: 0 }, 300);
    // Tail flip: up, curl, slap.
    this.tw(this, { tailLift: 1.15, tailAngle: 14 }, ms * 0.3, 'Sine.easeOut', ms * 0.1).then(() =>
      this.tw(this, { tailLift: -0.6, tailAngle: -6 }, ms * 0.35, 'Sine.easeIn').then(() => {
        const p = this.localToWorld(KH.tail.x, 0);
        ripple(this.scene, p.x, p.y, { rings: 3, size: 1.4, depth: this.depth + 0.4, tint: A['fish-glow'] });
      }),
    );
    for (let i = 0; i < 4; i++) this.scene.time.delayedCall(i * ms * 0.22, () => this.surfaceRings(1.2 + i * 0.5));
    this.tw(this, { glowLevel: 0 }, ms, 'Sine.easeIn');
    this.tw(this, { presence: 0 }, ms * 0.35, 'Sine.easeIn', ms * 0.65);
    await this.tw(this, { lift: 0 }, ms, 'Sine.easeInOut');
    this.setVisible(false);
    this.busy = false;
  }

  /** 0.8 s lower / 0.4 s hold / 0.9 s lift. */
  async slowBlink(): Promise<void> {
    if (this.blinking) return;
    this.blinking = true;
    await this.tw(this, { blinkF: 1 }, 800, 'Sine.easeInOut');
    await this.wait(400);
    await this.tw(this, { blinkF: 0 }, 900, 'Sine.easeInOut');
    this.blinking = false;
    this.nextBlink = this.clock + Phaser.Math.FloatBetween(6, 9);
  }

  /** 8 degree head tilt, then a soft bump toward the dock (emits 'nuzzle'). */
  async nuzzle(): Promise<void> {
    this.busy = true;
    await this.tw(this, { tilt: -8 }, 1400, 'Sine.easeInOut');
    await this.tw(this, { bumpX: -18 }, 420, 'Quad.easeOut');
    this.emit('nuzzle');
    this.onNuzzle?.();
    const p = this.localToWorld(KH.eyeFar.x - 50, 0);
    ripple(this.scene, p.x, p.y, { rings: 2, size: 0.9, depth: this.depth + 0.4, tint: A['fish-glow'] });
    await this.tw(this, { bumpX: 0 }, 800, 'Sine.easeInOut');
    await this.wait(300);
    await this.tw(this, { tilt: 0 }, 1300, 'Sine.easeInOut');
    this.busy = false;
  }

  /** "o" mouth, happy rumble shown as expanding ripple rings, blush brightens. */
  async eat(): Promise<void> {
    this.busy = true;
    await this.tw(this, { mouthOpen: 1 }, 380, 'Back.easeOut');
    await this.wait(1300);
    await this.tw(this, { mouthOpen: 0 }, 260, 'Sine.easeIn');
    // Chew, then the happy rumble.
    this.tw(this, { happyF: 1 }, 320, 'Sine.easeOut');
    this.tw(this, { blushA: 0.85 }, 900, 'Sine.easeOut');
    this.tw(this, { rumble: 1 }, 300, 'Sine.easeOut').then(() => this.tw(this, { rumble: 0 }, 1900, 'Sine.easeIn', 300));
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 480, () => {
        const cs = crossSection(-this.bodyOffset());
        const x0 = cs ? cs[0] : -170;
        const x1 = cs ? cs[1] : 390;
        for (const lx of [x0 + 40, (x0 + x1) / 2, x1 - 30]) {
          const p = this.localToWorld(lx, 2);
          ripple(this.scene, p.x, p.y, { rings: 2, size: 1.3 + i * 0.35, depth: this.depth + 0.4, tint: A['fish-glow'] });
        }
      });
    }
    await this.wait(2300);
    await this.tw(this, { happyF: 0 }, 500, 'Sine.easeInOut');
    if (!this.happy) this.tw(this, { blushA: 0.7 }, 1200);
    this.busy = false;
  }

  /** The 6 Gurans freckles light one by one (ring from the top, clockwise, then the centre). */
  async lightFreckles(): Promise<void> {
    for (const f of this.flowerF) {
      f.flash = 1;
      this.tw(f, { lit: 1 }, 420, 'Sine.easeOut');
      const p = this.worldOf(f.core.x, f.core.y);
      sparkleBurst(this.scene, p.x, p.y, { count: 4, color: A['fish-glow'], depth: this.depth + 0.5, spread: 0.35 });
      await this.wait(460);
    }
    for (const f of this.scatterF) this.tw(f, { lit: 0.7 }, 900, 'Sine.easeOut', Math.random() * 500);
    await this.wait(500);
  }

  /** Tilt the face up and breathe one great mist plume straight up (emits 'plume' with the world point). */
  async breathePlume(): Promise<void> {
    this.busy = true;
    await this.tw(this, { tilt: 7, mouthOpen: 1, breathBoost: 1 }, 1300, 'Sine.easeInOut');
    const p = this.plumePoint();
    this.emit('plume', p.x, p.y);
    this.plume.setPosition(0, 0);
    this.plume.start();
    this.tw(this, { breathBoost: -0.6 }, 1600, 'Sine.easeOut');
    this.gillBreath(5);
    await this.wait(1700);
    this.plume.stop();
    await this.wait(1600);
    await this.tw(this, { tilt: 0, mouthOpen: 0, breathBoost: 0 }, 1500, 'Sine.easeInOut');
    this.busy = false;
  }

  /** One freckle-light lifts from the flank and drifts to a world point (Tuki's doko). */
  releaseFreckle(targetX: number, targetY: number): Promise<void> {
    const src = this.flowerF[5];
    const from = this.worldOf(src.core.x, src.core.y);
    const d = this.depth + 30;
    const halo = this.scene.add.image(from.x, from.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow'])).setDepth(d);
    halo.setScale(K * 0.36).setAlpha(0);
    const warm = this.scene.add.image(from.x, from.y, 'glowSmall').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setDepth(d);
    warm.setScale(K * 1.1).setAlpha(0);
    const core = this.scene.add.image(from.x, from.y, 'kuhiro_freckle').setDepth(d).setScale(K * 1.25);
    const trail = sparkleTrail(this.scene, core, d - 0.1);
    this.tw(halo, { alpha: 0.75 }, 500, 'Sine.easeOut');
    this.tw(warm, { alpha: 0.9 }, 500, 'Sine.easeOut');
    this.tw(src, { lit: 0.35 }, 600, 'Sine.easeOut');
    const c = { x: (from.x + targetX) / 2, y: Math.min(from.y, targetY) - 150 };
    const s = { t: 0 };
    return new Promise((res) => {
      this.scene.tweens.add({
        targets: s,
        t: 1,
        duration: 4000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const t = s.t;
          const u = 1 - t;
          const bob = Math.sin(t * Math.PI * 3) * 6 * u;
          const x = u * u * from.x + 2 * u * t * c.x + t * t * targetX;
          const y = u * u * from.y + 2 * u * t * c.y + t * t * targetY + bob;
          core.setPosition(x, y);
          halo.setPosition(x, y);
          warm.setPosition(x, y);
        },
        onComplete: () => {
          trail.stop();
          sparkleBurst(this.scene, targetX, targetY, { count: 10, color: A['fish-glow'], depth: d });
          this.tw(halo, { alpha: 0, scale: K * 0.6 }, 1200, 'Sine.easeOut');
          this.tw(warm, { alpha: 0, scale: K * 2 }, 900, 'Sine.easeOut');
          this.tw(core, { alpha: 0 }, 900, 'Sine.easeIn').then(() => {
            halo.destroy();
            warm.destroy();
            core.destroy();
            this.scene.time.delayedCall(600, () => trail.destroy());
          });
          this.tw(src, { lit: 1 }, 2400, 'Sine.easeInOut');
          res();
        },
      });
    });
  }

  setHappy(on: boolean): void {
    this.happy = on;
    this.scene.tweens.add({ targets: this, blushA: on ? 0.8 : 0.6, duration: 900, ease: 'Sine.easeInOut' });
  }

  // -------------------------------------------------------------------------
  // Per-frame
  // -------------------------------------------------------------------------

  private bodyOffset(): number {
    return (1 - this.lift) * DEEP;
  }

  /** Mist curls puff from the gills and drift out across the lake. */
  private gillBreath(n?: number): void {
    const count = reduceMotion() ? 2 : (n ?? Phaser.Math.Between(3, 5));
    const oy = this.bodyOffset();
    this.tw(this, { gillFlare: 1 }, 600, 'Sine.easeOut').then(() => this.tw(this, { gillFlare: 0 }, 1300, 'Sine.easeInOut'));
    for (let i = 0; i < count; i++) {
      this.mist.emitParticleAt(KH.gills.x + Phaser.Math.Between(-6, 10), KH.gills.y + oy + Phaser.Math.Between(-40, 40), 1);
    }
  }

  private surfaceRings(size: number): void {
    const cs = crossSection(-this.bodyOffset());
    const x0 = cs ? cs[0] : -160;
    const x1 = cs ? cs[1] : 380;
    for (const lx of [x0 + 10, x1 - 10]) {
      const p = this.localToWorld(lx, 2);
      ripple(this.scene, p.x, p.y, { rings: 2, size, depth: this.depth + 0.4, tint: A['fish-glow'] });
    }
  }

  private localToWorld(lx: number, ly: number): { x: number; y: number } {
    return { x: this.x + lx * this.scaleX, y: this.y + ly * this.scaleY };
  }

  private applyLift(force = false): void {
    const oy = this.bodyOffset();
    if (!force && Math.abs(oy - this.lastBodyY) < 0.01) return;
    this.lastBodyY = oy;
    this.liftC.y = oy;
    this.halo.y = KH.halo.y + oy;
    // Waterline sheen across the body's cross-section at the surface.
    const cs = crossSection(-oy);
    if (cs) {
      const w = cs[1] - cs[0];
      this.waterline.x = (cs[0] + cs[1]) / 2;
      this.waterline.setScale(((w + 40) / 240) * K, K);
    }
  }

  tick(time: number, delta: number): void {
    void time;
    if (!this.visible) return;
    const dt = Math.min(delta, 50) / 1000;
    this.clock += dt;
    const t = this.clock;
    const rm = reduceMotion();

    this.setAlpha(this.presence);
    this.applyLift();
    const oy = this.bodyOffset();
    const up = smooth((DEEP - oy) / DEEP); // 0 deep .. 1 risen
    const above = smooth((-oy + 300) / 300); // how much is above water

    // Breathing: scale 1.00-1.02 on a 5 s sine (+ the big breath).
    const br = Math.sin((t * TAU) / 5);
    const sY = 1.01 + 0.01 * br + 0.025 * this.breathBoost;
    const sX = 1 + 0.004 * br + 0.012 * this.breathBoost;
    const rum = this.rumble * Math.sin(t * 58) * 1.3;
    this.bodyC.setScale(sX, sY);
    this.pivotC.setAngle(this.tilt);
    this.pivotC.x = KH.pivot.x + this.bumpX + rum;

    // Fins paddle slowly, the crest sways.
    const pad = Math.sin((t * TAU) / 3.4);
    this.finNear.setAngle(KH.finNear.angle + (rm ? 2 : 8) * pad);
    this.finFar.setAngle(KH.finFar.angle - (rm ? 2 : 7) * Math.sin((t * TAU) / 3.4 + 0.9));
    this.crest.setAngle(24 + 1.4 * Math.sin((t * TAU) / 5 + 1));
    this.gills.setScale(K * (1 + 0.3 * this.gillFlare), K * (1 + 0.06 * this.gillFlare));

    // Tail: rests low, lifts and flips during rise/sink.
    const tl = this.tailLift;
    this.tail.y = 150 - 150 * tl + oy * 0.4 + Math.sin(t * 0.9) * 3;
    this.tail.setAngle(this.tailAngle + Math.sin((t * TAU) / 4.2) * 2.5);

    // Glow.
    const g = this.glowLevel;
    this.halo.setAlpha(0.35 * g * (0.9 + 0.1 * br));
    this.heartGlow.setAlpha(0.42 + 0.08 * br + (this.happy ? 0.1 : 0));
    this.heartCore.setAlpha((0.1 + 0.05 * br) * g);
    this.waterGlow.setAlpha(g * (0.1 + 0.2 * up));
    this.waterGlow.y = 24 + oy * 0.22;
    this.waterGlow.setScale((K * (620 + 160 * (1 - up))) / 256, (K * (110 + 30 * (1 - up))) / 256);
    this.gleam.setAlpha(this.gleamA * above);
    this.blushes[0].setAlpha(this.blushA * 0.85);
    this.blushes[1].setAlpha(this.blushA);
    this.waterline.setAlpha(above * (0.22 + 0.07 * Math.sin(t * 2.3)) * (0.4 + 0.6 * g));

    // Freckles pulse on their own phases.
    const fd = Math.exp(-dt * 2.2);
    const pulseF = (f: Freckle) => {
      f.flash *= fd;
      const pulse = 0.5 + 0.5 * Math.sin((t * TAU) / f.period + f.phase);
      const level = Math.min(1, f.base + (1 - f.base) * f.lit + f.flash * 0.6);
      f.core.setAlpha(Math.min(1, (0.35 + 0.65 * level) * (0.8 + 0.2 * pulse)));
      f.halo.setAlpha(Math.min(1, level * (0.5 + 0.35 * pulse) * (0.4 + 0.6 * g)));
    };
    this.flowerF.forEach(pulseF);
    this.scatterF.forEach(pulseF);

    // Shimmer sweep head -> tail every 4 s.
    if (this.risen && t >= this.nextSweep) {
      this.sweepT = 0;
      this.nextSweep = t + 4;
    }
    if (this.sweepT >= 0) {
      this.sweepT += dt;
      const s = (this.sweepT / 1.7) * 1.5 - 0.25;
      for (const gl of this.glints) {
        const d = (s - gl.p) / 0.16;
        gl.img.setAlpha(0.42 * Math.exp(-d * d) * above);
      }
      if (this.sweepT > 1.8) {
        this.sweepT = -1;
        for (const gl of this.glints) gl.img.setAlpha(0);
      }
    }

    // Mouth.
    this.mouthSmile.setAlpha(1 - this.mouthOpen);
    this.mouthO.setAlpha(this.mouthOpen);
    this.mouthO.setScale(K * (0.55 + 0.45 * this.mouthOpen + 0.08 * Math.max(0, this.breathBoost)));

    this.applyEyes();

    // Gill-mist breath every 6-8 s; auto slow-blink every 6-9 s while risen.
    if (this.risen && !this.busy) {
      if (t >= this.nextBreath) {
        this.gillBreath();
        this.nextBreath = t + Phaser.Math.FloatBetween(6, 8);
      }
      if (t >= this.nextBlink && !this.blinking) void this.slowBlink();
    }

    // Water sheeting off in strings of cream drops.
    if (this.sheeting > 0.01 && !rm) {
      this.dropAcc += dt * 26 * this.sheeting;
      while (this.dropAcc >= 1) {
        this.dropAcc -= 1;
        const pt = this.topPts[(Math.random() * this.topPts.length) | 0];
        const y = pt[1] + oy + Math.random() * 26;
        if (y < -6) this.drops.emitParticleAt(pt[0] + this.bumpX + Phaser.Math.Between(-4, 4), y, Phaser.Math.Between(3, 5));
      }
    }

    // Small lapping rings where the body meets the water.
    if (this.risen && t >= this.nextLap) {
      this.nextLap = t + Phaser.Math.FloatBetween(1.4, 2.6);
      const cs = crossSection(-oy);
      if (cs) {
        const lx = Math.random() < 0.5 ? cs[0] + 16 : cs[1] - 16;
        const p = this.localToWorld(lx, 3);
        ripple(this.scene, p.x, p.y, { rings: 1, size: 0.7, depth: this.depth + 0.4, tint: A['fish-glow'] });
      }
    }
  }

  private applyEyes(): void {
    const f = clamp01(Math.max(this.blinkF, this.closeF, this.happyF));
    const pos = f * LID_FRAMES;
    const i = Math.min(LID_FRAMES, Math.floor(pos + 1e-4));
    const u = pos - i;
    const closedA = clamp01((f - 0.94) / 0.06) * (1 - this.happyF);
    for (const e of this.eyes) {
      if (i !== e.lastI) {
        e.lastI = i;
        if (i <= 0) e.lidA.setVisible(false);
        else e.lidA.setTexture(`kuhiro_lid${e.prefix}${i}`).setVisible(true);
        if (i >= LID_FRAMES) e.lidB.setVisible(false);
        else e.lidB.setTexture(`kuhiro_lid${e.prefix}${i + 1}`).setVisible(true);
      }
      e.lidB.setAlpha(u);
      e.closed.setAlpha(closedA);
      e.happy.setAlpha(this.happyF);
    }
  }
}

/** Additive lake-glow radial on the water plane (up to 0.5): lights the lake from below. */
export class UnderGlow {
  private readonly broad: Img;
  private readonly core: Img;
  private level = 0;
  private readonly breathTween: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    waterY: number,
    depth: number = DEPTH.water + 1.5,
  ) {
    this.broad = scene.add.image(x, waterY + 18, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['lake-glow'])).setDepth(depth);
    this.broad.setScale((K * 1100) / 256, (K * 210) / 256).setAlpha(0);
    this.core = scene.add.image(x + 20, waterY + 12, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['lake-glow'])).setDepth(depth);
    this.core.setScale((K * 560) / 256, (K * 90) / 256).setAlpha(0);
    const pulse = { k: 0 };
    this.breathTween = scene.tweens.add({
      targets: pulse,
      k: 1,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.apply(0.88 + 0.12 * pulse.k),
    });
  }

  private apply(k: number): void {
    this.broad.setAlpha(this.level * k);
    this.core.setAlpha(this.level * 0.4 * k);
  }

  /** Fade to alpha (0..0.5) over ms. */
  set(alpha: number, ms = 1500): void {
    this.scene.tweens.add({ targets: this, level: Math.max(0, Math.min(0.5, alpha)), duration: ms, ease: 'Sine.easeInOut' });
  }

  destroy(): void {
    this.breathTween.remove();
    this.scene.tweens.killTweensOf(this);
    this.broad.destroy();
    this.core.destroy();
  }
}

/**
 * Clue 1 (first night, ~6 s): a soft oval glow under the far surface, three
 * Gurans freckles blink, it breathes with tiny mist puffs, then fades into
 * ripple rings.
 */
export class GlowSighting {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: { depth?: number; scrollFactor?: number } = {},
  ) {}

  play(x: number, y: number): Promise<void> {
    const s = this.scene;
    const depth = this.opts.depth ?? DEPTH.water + 0.5;
    const sf = this.opts.scrollFactor ?? 1;
    const parts: Img[] = [];
    const add = (key: string, tint: string, add = true): Img => {
      const im = s.add.image(x, y, key).setDepth(depth).setScrollFactor(sf).setTint(hexToInt(tint)).setAlpha(0);
      if (add) im.setBlendMode(Phaser.BlendModes.ADD);
      parts.push(im);
      return im;
    };
    const under = add('glow', A['lake-glow']).setScale((K * 190) / 256, (K * 40) / 256);
    const oval = add('glow', A['fish-glow']).setScale((K * 64) / 256, (K * 22) / 256);
    const ovalCore = add('soft', A['lake-glow']).setScale((K * 36) / 128, (K * 11) / 128);
    // Three of the Gurans freckles, tiny at this distance.
    const fl = gurans(0, 0, 4.2);
    const pick = [fl[0], fl[2], fl[5]];
    const freckles = pick.map(() => add('dot', P.glow).setScale(0.36 * K));
    const fHalo = pick.map(() => add('glowSmall', A['fish-glow']).setScale(K * 0.32));
    const st = { a: 0, drift: 0, breath: 0 };
    const cycle = 6000;
    const total = 6400;
    return new Promise((res) => {
      const start = s.time.now;
      const puffAt = new Set<number>();
      const upd = () => {
        const el = s.time.now - start;
        const fadeIn = smooth(el / 1300);
        const fadeOut = 1 - smooth((el - (total - 1500)) / 1500);
        st.a = fadeIn * fadeOut;
        const br = 0.5 - 0.5 * Math.cos((el / cycle) * TAU * 1.0);
        const cx = x + (el / total) * 34;
        const cy = y + Math.sin(el / 900) * 1.2;
        under.setPosition(cx, cy + 3).setAlpha(st.a * (0.22 + 0.12 * br));
        oval.setPosition(cx, cy).setAlpha(st.a * (0.5 + 0.35 * br)).setScale((K * (60 + 10 * br)) / 256, (K * (20 + 3 * br)) / 256);
        ovalCore.setPosition(cx, cy).setAlpha(st.a * (0.35 + 0.3 * br));
        pick.forEach((p, i) => {
          const blink = Math.max(0, Math.sin(el / 420 + i * 2.1));
          const a = st.a * (0.25 + 0.75 * blink * blink);
          freckles[i].setPosition(cx + p.x * 1.6, cy + p.y * 0.6).setAlpha(a);
          fHalo[i].setPosition(cx + p.x * 1.6, cy + p.y * 0.6).setAlpha(a * 0.5);
        });
        // A tiny mist puff on each breath peak.
        const peak = Math.floor((el + cycle / 2) / cycle);
        if (br > 0.96 && !puffAt.has(peak) && st.a > 0.3) {
          puffAt.add(peak);
          const em = s.add.particles(cx, cy - 2, 'puff', {
            speedY: { min: -14, max: -6 },
            speedX: { min: -6, max: 10 },
            lifespan: 2400,
            scale: { start: 0.12 * K * 1.5, end: 0.55 * K * 1.5 },
            alpha: { start: 0.3, end: 0 },
            tint: hexToInt(mixColor()),
            emitting: false,
          });
          em.setDepth(depth + 0.1).setScrollFactor(sf);
          em.explode(3);
          s.time.delayedCall(2600, () => em.destroy());
        }
      };
      s.events.on(Phaser.Scenes.Events.UPDATE, upd);
      s.time.delayedCall(total, () => {
        s.events.off(Phaser.Scenes.Events.UPDATE, upd);
        const cx = x + 34;
        for (let i = 0; i < 3; i++) {
          s.time.delayedCall(i * 380, () => {
            ripple(s, cx, y + 2, { rings: 1, size: 0.45 + i * 0.18, depth, tint: A['fish-glow'] });
          });
        }
        parts.forEach((p) => p.destroy());
        s.time.delayedCall(1500, () => res());
      });
    });
  }
}

function mixColor(): string {
  return A['cloud-spill'];
}
