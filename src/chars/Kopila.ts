/**
 * Kopila, the Chinese pangolin pup (docs/WORLD.md 5.3), and the Bud Bush it
 * peeks from. 48 px standing, 34 px curled. Never held, carried or distressed:
 * Kopila always chooses to come closer.
 *
 * Parts are baked once by src/art/kopila.ts; everything here only moves,
 * swaps, tints and fades images. update paths are allocation-free.
 */
import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';
import { dustPuff, heartBurst } from '@/fx/particles';
import { P } from '@/palette';
import { windAt } from '@/world/wind';
import { BUD4, BUDS, KG, PEEK, kKey, kOrigin } from '@/art/kopila';
import { Rig, type Expression } from './rig';

const K = 1 / ART_SCALE;
const TAU = Math.PI * 2;

export type KopilaMode = 'hidden' | 'peek' | 'curled' | 'stand' | 'follow' | 'sitDock' | 'sleepFire' | 'nibble' | 'wiggle' | 'roll';

type Img = Phaser.GameObjects.Image;

/** Head pivot (neck) in char coords. */
const NX = KG.neck.x;
const NY = KG.neck.y;
/** Ball centre in char coords. */
const BX = KG.ball.x;
const BY = KG.ball.y;

export class Kopila extends Rig {
  mode: KopilaMode = 'stand';

  private headC: Phaser.GameObjects.Container;
  private ballC: Phaser.GameObjects.Container;
  private standGroup: Img[] = [];
  private tailOut!: Img;
  private tailWrap!: Img;
  private tailDangle!: Img;
  private legB!: Img;
  private legF!: Img;
  private arm!: Img;
  private rowHip!: Img;
  private rowBack!: Img;
  private crown!: Img;
  private eyes!: Img;
  private blushImg!: Img;
  private mouthImg!: Img;
  private ballEye!: Img;

  private modeT = 0;
  private waveT0 = -99;
  private waveUntil = -99;
  private waveLoop = false;
  private lookX: number | null = null;
  private glance = 0;
  private nextFlick = 4;
  private nextBallPeek = 3;
  private heartT = 0;
  private rolling = false;
  private flickTween?: Phaser.Tweens.Tween;
  private blinkClosed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.heightPx = 48;
    this.walkSpeed = 140;
    this.hopHeight = 4;
    this.hopPeriod = 0.26;
    this.blinkMin = 2200;
    this.blinkMax = 4800;

    // Back to front.
    this.tailOut = this.pk('tailOut', 'tailOut', KG.tailRoot.x, KG.tailRoot.y);
    this.tailDangle = this.pk('tailDangle', 'tailDangle', KG.tailDangleRoot.x, KG.tailDangleRoot.y);
    this.pk('body', 'body', 0, 0);
    this.rowBack = this.pk('rowBack', 'rowBack', -5.5, -18.5);
    this.rowHip = this.pk('rowHip', 'rowHip', -5, -5.5);
    this.legB = this.leg('legB', KG.legs[0].x, KG.legs[0].y);
    this.legF = this.leg('legF', KG.legs[1].x, KG.legs[1].y);
    this.tailWrap = this.pk('tailWrap', 'tailWrap', KG.tailRoot.x, KG.tailRoot.y);
    this.arm = this.pk('arm', 'arm', KG.arm.x - 2, KG.arm.y - 1);

    this.headC = new Phaser.GameObjects.Container(scene, NX, NY);
    this.breath.add(this.headC);
    this.pk('head', 'head', NX, NY, this.headC);
    this.crown = this.pk('crown', 'crown', -3, -42, this.headC);
    this.eyes = this.pk('eyes', 'eyes', 6, -34.5, this.headC);
    this.blushImg = this.pk('blush', 'blush', 6, -27, this.headC);
    this.mouthImg = this.pk('mouth', 'mouth', KG.mouth.x, KG.mouth.y, this.headC);

    this.standGroup = [...this.parts.values()];

    this.ballC = new Phaser.GameObjects.Container(scene, BX, BY);
    this.breath.add(this.ballC);
    this.pk('ball', 'ball', BX, BY, this.ballC);
    this.ballEye = this.pk('ballEye', 'ballEye', KG.ballEye.x, KG.ballEye.y, this.ballC);
    this.ballEye.scaleY = 0;

    this.onStep = (sx, sy) => dustPuff(scene, sx - 4 * this.facing, sy, P.cream, this.depth - 1);
    this.setMode('stand');
    this.pop();
  }

  /** Add a part anchored at char point (px, py); placed relative to parent. */
  private pk(name: string, tex: string, px: number, py: number, parent?: Phaser.GameObjects.Container): Img {
    const [ox, oy] = kOrigin(tex, px, py);
    const p = parent ?? this.breath;
    const inHead = parent !== undefined && parent === this.headC;
    const inBall = parent !== undefined && parent === this.ballC;
    const offX = inHead ? NX : inBall ? BX : 0;
    const offY = inHead ? NY : inBall ? BY : 0;
    return this.part(name, kKey(tex), px - offX, py - offY, ox, oy, p);
  }

  private leg(name: string, x: number, y: number): Img {
    const [ox, oy] = kOrigin('leg', 0, -1);
    return this.part(name, kKey('leg'), x, y, ox, oy);
  }

  // -------------------------------------------------------------------------
  // Modes
  // -------------------------------------------------------------------------

  setMode(m: KopilaMode): this {
    if (m === 'roll') {
      this.doRoll();
      return this;
    }
    this.rolling = false;
    this.mode = m;
    this.modeT = 0;
    this.setVisible(m !== 'hidden');
    const ballMode = m === 'curled' || m === 'sleepFire';
    this.showStanding(!ballMode);
    this.ballC.setVisible(ballMode);
    this.ballC.setAngle(0).setPosition(BX, BY).setScale(1);
    this.ballEye.scaleY = 0;
    this.nextBallPeek = this.t + 2 + Math.random() * 1.5;

    // Tail.
    const tail = m === 'stand' || m === 'follow' ? 'out' : m === 'sitDock' ? 'dangle' : 'wrap';
    this.tailOut.setVisible(!ballMode && tail === 'out');
    this.tailWrap.setVisible(!ballMode && tail === 'wrap');
    this.tailDangle.setVisible(!ballMode && tail === 'dangle');
    this.tailOut.angle = 0;
    this.tailWrap.angle = 0;
    this.tailDangle.angle = 0;

    // Legs: dangling over an edge when sitting.
    const sit = m === 'sitDock';
    this.legB.setPosition(sit ? -2 : KG.legs[0].x, sit ? 1.2 : KG.legs[0].y).setAngle(sit ? 12 : 0);
    this.legF.setPosition(sit ? 9 : KG.legs[1].x, sit ? 1.6 : KG.legs[1].y).setAngle(sit ? -8 : 0);
    this.arm.setPosition(this.arm.getData('baseX') as number, this.arm.getData('baseY') as number);
    this.headC.setAngle(0).setPosition(NX, NY);
    this.inner.rotation = 0;

    this.waveLoop = m === 'nibble' || m === 'wiggle';
    if (this.waveLoop) this.waveT0 = this.t;
    this.mouthImg.setTexture(kKey('mouth'));
    const expr: Expression = m === 'wiggle' ? 'happy' : m === 'nibble' ? 'neutral' : 'neutral';
    this.expression = 'neutral';
    this.applyExpression(expr);
    this.expression = expr;
    return this;
  }

  private showStanding(on: boolean): void {
    for (const p of this.standGroup) p.setVisible(on);
    this.headC.setVisible(on);
  }

  /** Each scale row's sine phase-offset by 0.15 s (hip -> back -> crown). */
  scaleWave(): void {
    this.waveT0 = this.t;
    this.waveUntil = this.t + 1.5;
  }

  /** On a bite: crown scales flick up. */
  flickCrown(): void {
    if (reduceMotion()) return;
    this.flickTween?.stop();
    this.crown.setAngle(0).setScale(K);
    this.flickTween = this.scene.tweens.add({
      targets: this.crown,
      angle: -16,
      scaleY: K * 1.22,
      scaleX: K * 1.06,
      duration: 90,
      yoyo: true,
      hold: 160,
      ease: EASE.out,
      onComplete: () => this.crown.setAngle(0).setScale(K),
    });
    this.squash(0.94, 1.06, 80);
  }

  /** Eyes glance toward a world x (or null to look ahead). */
  lookAt(worldX: number | null): this {
    this.lookX = worldX;
    return this;
  }

  /** Tiny happy roll: curl, roll forward, uncurl with hearts. */
  private doRoll(): void {
    if (this.rolling) return;
    const back: KopilaMode = this.mode === 'follow' ? 'follow' : 'stand';
    this.setMode('curled');
    this.mode = 'roll';
    this.rolling = true;
    this.squash(1.12, 0.86, 80);
    const rm = reduceMotion();
    this.scene.tweens.add({
      targets: this.ballC,
      x: BX + (rm ? 0 : 18),
      angle: rm ? 0 : 360,
      duration: 720,
      delay: 120,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        this.ballC.y = BY - Math.sin(tw.progress * Math.PI) * (rm ? 0 : 5);
      },
      onComplete: () => {
        if (!this.rolling) return;
        const dx = this.ballC.x - BX;
        this.x += dx * this.facing;
        this.setMode(back);
        this.squash(0.86, 1.14, 90);
        heartBurst(this.scene, this.x, this.y - 44, 3, this.depth + 1);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Rig overrides
  // -------------------------------------------------------------------------

  protected override applyExpression(e: Expression): void {
    const happy = e === 'happy' || e === 'blissful';
    const tex = happy ? 'eyesHappy' : e === 'surprised' ? 'eyesRound' : e === 'sleepy' ? 'eyesClosed' : 'eyes';
    this.eyes.setTexture(kKey(tex));
    this.blushImg.setScale(happy ? K * 1.2 : K);
    this.mouthImg.setTexture(kKey(e === 'munching' || e === 'surprised' ? 'mouthO' : 'mouth'));
  }

  protected override applyBlink(closed: boolean): void {
    this.blinkClosed = closed;
    if (this.expression !== 'neutral' && this.expression !== 'surprised') return;
    this.eyes.setTexture(kKey(closed ? 'eyesClosed' : this.expression === 'surprised' ? 'eyesRound' : 'eyes'));
  }

  protected override idleTick(_time: number, dt: number): void {
    const t = this.t;
    this.modeT += dt;
    const m = this.mode;
    const rm = reduceMotion();

    // Scale-row wave (hip, back, crown), 0.15 s apart.
    const waving = this.waveLoop || t < this.waveUntil;
    const rows = this.rowsArr;
    for (let i = 0; i < 3; i++) {
      const r = rows[i];
      const ph = t - this.waveT0 - i * 0.15;
      let s = 0;
      if (waving && ph > 0 && !rm) {
        const env = this.waveLoop ? 1 : Math.max(0, 1 - ph / 1.3);
        s = Math.sin((ph * TAU) / 0.5) * env;
      }
      r.y = (r.getData('baseY') as number) - Math.max(0, s) * 1.4;
      if (r !== this.crown || !this.flickTween?.isPlaying()) r.angle = s * 4;
    }

    // Eyes glance toward the target.
    let g = 0;
    if (this.lookX !== null) g = Phaser.Math.Clamp(((this.lookX - this.x) * this.facing) / 160, -1, 1);
    this.glance += (g - this.glance) * Math.min(1, dt * 6);
    this.eyes.x = (this.eyes.getData('baseX') as number) + this.glance * 1.3;

    const ballMode = m === 'curled' || m === 'sleepFire' || m === 'roll';
    if (ballMode) {
      if (m === 'sleepFire') {
        const b = rm ? 0 : Math.sin((t * TAU) / 3.2);
        this.ballC.scaleY = 1 + b * 0.045;
        this.ballC.scaleX = 1 - b * 0.02;
        this.ballC.y = BY - b * 0.045 * 17;
      } else if (m === 'curled' && t > this.nextBallPeek) {
        this.nextBallPeek = t + 3 + Math.random();
        this.ballPeek();
      }
      return;
    }

    // Walking waddle: side-to-side tilt, alternate feet, tail swings.
    if (this.walking && !rm) {
      const w = Math.sin((t * Math.PI) / this.hopPeriod);
      this.inner.rotation = w * 0.085;
      this.legB.y = KG.legs[0].y - Math.max(0, w) * 1.8;
      this.legF.y = KG.legs[1].y - Math.max(0, -w) * 1.8;
      this.tailOut.angle = -w * 7;
    } else if (m !== 'wiggle') {
      this.inner.rotation *= 0.8;
      if (m !== 'sitDock') {
        this.legB.y = KG.legs[0].y;
        this.legF.y = KG.legs[1].y;
      }
    }

    switch (m) {
      case 'sitDock': {
        const s = rm ? 0 : Math.sin((t * TAU) / 2.2);
        this.tailDangle.angle = s * 14;
        this.legB.angle = 12 + s * 10;
        this.legF.angle = -8 - s * 10;
        break;
      }
      case 'nibble': {
        if (this.modeT < 0.9) {
          // Sniff: snout twitches forward.
          this.headC.angle = 6 + Math.sin(t * 40) * 1.5;
          this.headC.x = NX + Math.max(0, Math.sin(t * 22)) * 0.8;
        } else {
          const n = Math.sin(t * TAU * 3);
          this.headC.angle = 9 + n * 3;
          this.headC.x = NX + 0.6;
          this.mouthImg.setTexture(kKey(n > 0 ? 'mouthO' : 'mouth'));
          if (this.expression !== 'happy') this.setExpression('happy');
          this.arm.y = (this.arm.getData('baseY') as number) - 2.5;
          this.heartT -= dt;
          if (this.heartT <= 0) {
            this.heartT = 1.4;
            heartBurst(this.scene, this.x + 10 * this.facing, this.y - 46, 2, this.depth + 1);
          }
        }
        break;
      }
      case 'wiggle': {
        this.inner.rotation = rm ? 0 : Math.sin(t * TAU * 2.4) * 0.08;
        break;
      }
      case 'peek': {
        // Shy: paws to mouth, head tilted, a little crouch.
        this.headC.angle = -6 + Math.sin(t * 1.3) * 1.5;
        this.arm.y = (this.arm.getData('baseY') as number) - 3;
        this.inner.scaleY *= 0.95;
        break;
      }
      default: {
        // Idle tail flick every 3-6 s.
        if (t > this.nextFlick && !this.walking) {
          this.nextFlick = t + 3 + Math.random() * 3;
          const tail = this.tailOut.visible ? this.tailOut : this.tailWrap;
          if (!rm) this.scene.tweens.add({ targets: tail, angle: tail === this.tailOut ? -12 : 8, duration: 140, yoyo: true, ease: EASE.out });
        }
      }
    }
  }

  private get rowsArr(): Img[] {
    return this._rows ?? (this._rows = [this.rowHip, this.rowBack, this.crown]);
  }
  private _rows?: Img[];

  /** One-eye peek through the ball's gap, with a blink, then re-curl. */
  private ballPeek(): void {
    if (reduceMotion()) return;
    const e = this.ballEye;
    this.scene.tweens.add({
      targets: e,
      scaleY: K,
      duration: 160,
      ease: EASE.out,
      onComplete: () => {
        this.scene.tweens.add({
          targets: e,
          scaleY: K * 0.1,
          duration: 70,
          yoyo: true,
          delay: 520,
          onComplete: () => {
            this.scene.tweens.add({ targets: e, scaleY: 0, duration: 180, delay: 420, ease: EASE.in, onComplete: () => this.squash(1.05, 0.95, 70) });
          },
        });
      },
    });
  }

  override setLightTint(color: number): this {
    return super.setLightTint(color);
  }

  get isBlinking(): boolean {
    return this.blinkClosed;
  }
}

// ===========================================================================
// The Bud Bush
// ===========================================================================

/** Where an emerged Kopila stands, in bush coords (in front, to the right). */
const EMERGE = { x: 54, y: 4 };

export class BudBush extends Phaser.GameObjects.Container {
  onTuck?: () => void;

  private buds: Img[] = [];
  private peekC: Phaser.GameObjects.Container;
  private peekEyes: Img;
  private peekEyesX = 0;
  private peekParts: Img[] = [];
  private hideC: Phaser.GameObjects.Container;
  private hideEye: Img;
  private friend: Kopila;
  private all: Img[] = [];

  private st: 'idle' | 'peek' | 'busy' | 'hidden' | 'gone' = 'idle';
  private t = 0;
  private nextBlink = 3;
  private nextEye = 3;
  private lookX: number | null = null;
  private glance = 0;
  private flip = 1;
  private tint = 0xffffff;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    super(scene, x, groundY);
    scene.add.existing(this);

    this.img('bushBack', 0, 0, 0, 0);

    // The three real buds (Kopila's ball sprite: identical colours).
    for (const b of BUDS) {
      const bud = this.img('ball', b.x, b.y, 0, 0);
      bud.setScale(K * b.s);
      bud.setData('s', b.s);
      this.buds.push(bud);
    }

    // Peeking head (eyes, snout tip, two crown scales over the leaves).
    this.peekC = new Phaser.GameObjects.Container(scene, PEEK.x, PEEK.y + PEEK.drop);
    this.add(this.peekC);
    const hx = KG.head.x;
    const hy = KG.head.y;
    this.peekParts.push(this.img('head', hx, hy, hx, hy, this.peekC, -hx, -hy));
    this.peekParts.push(this.img('blush', 6, -27, 6, -27, this.peekC, -hx, -hy));
    this.peekParts.push(this.img('crown', -3, -42, -3, -42, this.peekC, -hx, -hy));
    this.peekEyes = this.img('eyes', 6, -34.5, 6, -34.5, this.peekC, -hx, -hy);
    this.peekEyesX = this.peekEyes.x;
    this.peekParts.push(this.peekEyes);
    this.peekC.setAlpha(0).setVisible(false);

    // Kopila's spot as a 4th bud (hidden until hide()).
    this.hideC = new Phaser.GameObjects.Container(scene, BUD4.x, BUD4.y - KG.ball.r * BUD4.s);
    this.add(this.hideC);
    this.img('ball', 0, 0, BX, BY, this.hideC);
    this.hideEye = this.img('ballEye', KG.ballEye.x - BX, KG.ballEye.y - BY, KG.ballEye.x, KG.ballEye.y, this.hideC, 0, 0);
    this.hideEye.scaleY = 0;
    this.hideC.setScale(BUD4.s).setVisible(false);

    this.img('bushFront', 0, 0, 0, 0);

    // A full Kopila for emerge() (stays hidden until then).
    this.friend = new Kopila(scene, EMERGE.x, EMERGE.y);
    this.add(this.friend);
    this.friend.setMode('hidden');
  }

  /**
   * Add a bush-layer image. tex anchor = char/bush point (ax, ay); placed at
   * (x + offX, y + offY) in the parent.
   */
  private img(tex: string, x: number, y: number, ax: number, ay: number, parent: Phaser.GameObjects.Container = this, offX = 0, offY = 0): Img {
    const [ox, oy] = kOrigin(tex, ax, ay);
    const im = new Phaser.GameObjects.Image(this.scene, x + offX, y + offY, kKey(tex)).setOrigin(ox, oy).setScale(K);
    parent.add(im);
    this.all.push(im);
    return im;
  }

  isPeeking(): boolean {
    return this.st === 'peek';
  }

  /** World point where an emerged Kopila stands (spawn the free rig here). */
  get emergePoint(): { x: number; y: number } {
    return { x: this.x + EMERGE.x * this.scaleX, y: this.y + EMERGE.y * this.scaleY };
  }

  peek(on: boolean): void {
    if (on && this.st === 'idle') {
      this.st = 'peek';
      this.peekC.setVisible(true);
      this.scene.tweens.killTweensOf(this.peekC);
      this.peekC.y = PEEK.y + PEEK.drop;
      this.scene.tweens.add({ targets: this.peekC, alpha: 1, duration: 160 });
      this.scene.tweens.add({ targets: this.peekC, y: PEEK.y, duration: reduceMotion() ? 200 : 900, ease: 'Back.easeOut', easeParams: [1.4] });
      this.nextBlink = this.t + 1.5;
    } else if (!on && this.st === 'peek') {
      this.st = 'idle';
      this.duck(320);
    }
  }

  private duck(ms: number): Phaser.Tweens.Tween {
    this.scene.tweens.killTweensOf(this.peekC);
    return this.scene.tweens.add({
      targets: this.peekC,
      y: PEEK.y + PEEK.drop,
      duration: ms,
      ease: EASE.in,
      onComplete: () => this.peekC.setAlpha(0).setVisible(false),
    });
  }

  lookAt(worldX: number | null): void {
    this.lookX = worldX;
  }

  /** Tapped before befriended: tuck, roll into the bush, become a 4th bud. */
  hide(): Promise<void> {
    return new Promise((resolve) => {
      if (this.st === 'hidden') {
        // Curl a little tighter.
        this.onTuck?.();
        this.scene.tweens.killTweensOf(this.hideEye);
        this.hideEye.scaleY = 0;
        this.scene.tweens.add({ targets: this.hideC, scaleX: BUD4.s * 0.9, scaleY: BUD4.s * 0.9, duration: 90, yoyo: true, ease: EASE.out, onComplete: () => resolve() });
        this.nextEye = this.t + 3.5;
        return;
      }
      if (this.st === 'busy' || this.st === 'gone') return resolve();
      const wasPeeking = this.st === 'peek';
      this.st = 'busy';
      this.onTuck?.();
      const rm = reduceMotion();
      const startX = wasPeeking ? PEEK.x + 2 : BUD4.x + 20;
      const startY = PEEK.y - 2;
      const endY = BUD4.y - KG.ball.r * BUD4.s;
      if (wasPeeking) this.duck(150);
      this.hideC.setVisible(true).setPosition(startX, startY).setAngle(0).setScale(BUD4.s * 0.4);
      this.hideEye.scaleY = 0;
      this.scene.tweens.add({
        targets: this.hideC,
        scaleX: BUD4.s,
        scaleY: BUD4.s,
        duration: 220,
        delay: 130,
        ease: EASE.pop,
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.hideC,
            x: BUD4.x,
            angle: rm ? 0 : -360,
            duration: rm ? 200 : 620,
            ease: 'Sine.easeInOut',
            onUpdate: (tw) => {
              const p = tw.progress;
              this.hideC.y = startY + (endY - startY) * p - Math.sin(p * Math.PI) * 9;
            },
            onComplete: () => {
              this.hideC.setAngle(0).setPosition(BUD4.x, endY);
              this.scene.tweens.add({
                targets: this.hideC,
                scaleX: { from: BUD4.s * 1.12, to: BUD4.s },
                scaleY: { from: BUD4.s * 0.86, to: BUD4.s },
                duration: 380,
                ease: 'Back.easeOut',
                easeParams: [2.5],
              });
              this.st = 'hidden';
              this.nextEye = this.t + 3 + Math.random();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Befriended: uncurl and step out. Resolves with Kopila standing at emergePoint. */
  emerge(): Promise<void> {
    return new Promise((resolve) => {
      if (this.st === 'busy' || this.st === 'gone') return resolve();
      const was = this.st;
      this.st = 'busy';
      if (was === 'peek') this.duck(150);
      const rm = reduceMotion();
      const fromX = was === 'hidden' ? this.hideC.x : PEEK.x;
      const fromY = was === 'hidden' ? this.hideC.y : PEEK.y - 4;
      this.scene.tweens.killTweensOf(this.hideEye);
      this.hideEye.scaleY = 0;
      this.hideC.setVisible(true).setPosition(fromX, fromY).setAngle(0).setScale(BUD4.s);
      const toX = EMERGE.x;
      const toY = EMERGE.y - KG.ball.r;
      this.scene.tweens.add({
        targets: this.hideC,
        x: toX,
        angle: rm ? 0 : 360,
        scaleX: 1,
        scaleY: 1,
        duration: rm ? 250 : 760,
        delay: was === 'hidden' ? 0 : 160,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const p = tw.progress;
          this.hideC.y = fromY + (toY - fromY) * p - Math.sin(p * Math.PI) * 16;
        },
        onComplete: () => {
          this.hideC.setVisible(false).setAngle(0);
          this.friend.setPosition(EMERGE.x, EMERGE.y);
          this.friend.setMode('stand');
          this.friend.setLightTint(this.tint);
          this.friend.pop();
          this.friend.scaleWave();
          this.st = 'gone';
          this.scene.time.delayedCall(420, () => {
            resolve();
            this.scene.tweens.add({ targets: this.friend, alpha: 0, duration: 260, delay: 200, onComplete: () => this.friend.setMode('hidden').setAlpha(1) });
          });
        },
      });
    });
  }

  /** Back to an empty bush (e.g. after the scene spawned the free Kopila). */
  reset(): void {
    this.st = 'idle';
    this.scene.tweens.killTweensOf(this.peekC);
    this.peekC.setAlpha(0).setVisible(false);
    this.hideC.setVisible(false);
    this.friend.setMode('hidden');
  }

  setLightTint(color: number): void {
    if (color === this.tint) return;
    this.tint = color;
    for (const im of this.all) im.setTint(color);
    this.friend.setLightTint(color);
  }

  tick(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const rm = reduceMotion();

    // Buds sway softly with the shared wind.
    const w = windAt(time / 1000);
    for (let i = 0; i < this.buds.length; i++) {
      const b = this.buds[i];
      b.angle = rm ? 0 : (w.base * 1.4 + w.gust * 3) * (1 + i * 0.15) + Math.sin(this.t * 1.1 + i) * 0.6;
    }

    if (this.st === 'peek') {
      // Slow blink every 3 s.
      if (this.t > this.nextBlink) {
        this.nextBlink = this.t + 3;
        this.peekEyes.setTexture(kKey('eyesClosed'));
        this.scene.time.delayedCall(170, () => this.peekEyes.setTexture(kKey('eyes')));
      }
      // Glance at the target; turn to face it.
      let g = 0;
      if (this.lookX !== null) {
        const dx = this.lookX - (this.x + PEEK.x);
        const want = dx < -30 ? -1 : dx > 30 ? 1 : this.flip;
        if (want !== this.flip) {
          this.flip = want;
          this.scene.tweens.add({ targets: this.peekC, scaleX: want, duration: 180, ease: EASE.out });
        }
        g = Phaser.Math.Clamp(Math.abs(dx) / 160, 0, 1);
      }
      this.glance += (g - this.glance) * Math.min(1, dt * 5);
      this.peekEyes.x = this.peekEyesX + this.glance * 1.3;
      // Gentle bob.
      if (!this.scene.tweens.isTweening(this.peekC)) this.peekC.y = PEEK.y + Math.sin(this.t * 1.6) * 0.8;
    } else if (this.st === 'hidden') {
      // The 4th bud breathes (the tell) and opens one eye every 3-4 s.
      const b = rm ? 0 : Math.sin(this.t * 2.2) * 0.018;
      if (!this.scene.tweens.isTweening(this.hideC)) {
        this.hideC.scaleY = BUD4.s * (1 + b);
        this.hideC.scaleX = BUD4.s * (1 - b * 0.5);
      }
      if (this.t > this.nextEye) {
        this.nextEye = this.t + 3 + Math.random();
        this.eyePeek();
      }
    }

    if (this.friend.visible) this.friend.tick(time, delta);
  }

  private eyePeek(): void {
    const e = this.hideEye;
    this.scene.tweens.killTweensOf(e);
    e.scaleY = 0;
    this.scene.tweens.add({
      targets: e,
      scaleY: K,
      duration: 170,
      ease: EASE.out,
      onComplete: () => {
        this.scene.tweens.add({
          targets: e,
          scaleY: K * 0.1,
          duration: 80,
          delay: 650,
          yoyo: true,
          onComplete: () => {
            this.scene.tweens.add({
              targets: e,
              scaleY: 0,
              duration: 200,
              delay: 500,
              ease: EASE.in,
              onComplete: () => {
                if (this.st !== 'hidden') return;
                this.scene.tweens.add({ targets: this.hideC, scaleX: BUD4.s * 1.04, scaleY: BUD4.s * 0.95, duration: 90, yoyo: true, ease: EASE.out });
              },
            });
          },
        });
      },
    });
  }
}
