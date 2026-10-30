/**
 * Boju, the grandmother yak (docs/WORLD.md 5.2): a bust behind the shop
 * counter, ~250 px visible. Origin at the counter-top centre (y negative up).
 * The counter itself belongs to the shop scene; Boju brings her body, head,
 * horn cosies, muffler, bell, hooves and knitting.
 *
 * Parts are baked once by src/art/boju.ts. tick() only moves, swaps, tints
 * and crops images (allocation-free).
 */
import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE, popIn } from '@/fx/juice';
import { steam } from '@/fx/particles';
import { BG, BW, bKey, bOrigin } from '@/art/boju';

const K = 1 / ART_SCALE;
const TAU = Math.PI * 2;

export type BojuExpr = 'smile' | 'happy' | 'talking' | 'surprised';

type Img = Phaser.GameObjects.Image;
type Ctr = Phaser.GameObjects.Container;

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, () => r()));

export class Boju extends Phaser.GameObjects.Container {
  onBell?: () => void;
  onClick?: () => void;
  expression: BojuExpr = 'smile';

  private bodyC: Ctr;
  private headC: Ctr;
  private imgs: Img[] = [];
  private eyes!: Img;
  private mouthImg!: Img;
  private fringe!: Img;
  private earL!: Img;
  private earR!: Img;
  private bell!: Img;
  private tails!: Img;
  private needleL!: Img;
  private needleR!: Img;
  private swatch!: Img;
  private yarn!: Img;
  private ball!: Img;
  private hoofR!: Img;
  private kettle!: Img;
  private glass!: Img;
  private tea!: Img;
  private stream!: Img;

  private t = 0;
  private nextBlink = 2.5;
  private blinking = false;
  private nextEar = 6;
  private nextNod = 11;
  private nextStitch = 2;
  private stitchT = -1;
  private talkUntil = -1;
  private bellAmp = 0;
  private bellPhase = 0;
  private frozen = false;
  private busy = false;
  private headBob = 0;
  private tint = 0xffffff;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    // Breathing group (scales from the counter line).
    this.bodyC = new Phaser.GameObjects.Container(scene, 0, 0);
    this.add(this.bodyC);
    this.img('body', 0, 0, this.bodyC);

    this.headC = new Phaser.GameObjects.Container(scene, BG.neck.x, BG.neck.y);
    this.bodyC.add(this.headC);
    const n = BG.neck;
    this.img('horns', BG.horns.x, BG.horns.y, this.headC, n.x, n.y);
    this.earL = this.img('earL', BG.ears[0].px, BG.ears[0].py, this.headC, n.x, n.y);
    this.earR = this.img('earR', BG.ears[1].px, BG.ears[1].py, this.headC, n.x, n.y);
    this.img('head', n.x, n.y, this.headC, n.x, n.y);
    this.img('blush', 0, -155, this.headC, n.x, n.y);
    this.eyes = this.img('eyesSmile', 0, -180, this.headC, n.x, n.y);
    this.mouthImg = this.img('mouthSmile', BG.mouth.x, BG.mouth.y, this.headC, n.x, n.y);
    this.fringe = this.img('fringe', BG.fringe.x, BG.fringe.y, this.headC, n.x, n.y);

    this.img('muffler', 0, BG.muffler.y, this.bodyC);
    this.tails = this.img('mufflerTails', BG.knot.x, BG.knot.y + 2, this.bodyC);
    this.bell = this.img('bell', BG.bell.x, BG.bell.cordY, this.bodyC);

    // Counter-level props (no breathing).
    this.yarn = this.img('yarn', 12, -29);
    this.needleR = this.needle(1);
    this.swatch = this.img('swatch', 0, -46);
    this.needleL = this.needle(0);
    this.glass = this.local('glass', BG.glass.x, BG.glass.y);
    this.tea = this.local('tea', BG.glass.x, BG.glass.y);
    this.stream = this.img('stream', BW.stream.x0, BW.stream.y0);
    this.kettle = this.local('kettle', BG.kettle.x, BG.kettle.y);
    this.img('hoofL', BG.hooves[0].x, BG.hooves[0].y);
    this.hoofR = this.img('hoofR', BG.hooves[1].x, BG.hooves[1].y);
    this.ball = this.img('ball', BG.ball.x, BG.ball.y);

    this.glass.setVisible(false);
    this.tea.setVisible(false);
    this.stream.setVisible(false);
    this.kettle.setVisible(false);
    this.nextNod = 10 + Math.random() * 4;
    this.nextEar = 6 + Math.random() * 3;
  }

  /** Image anchored at Boju point (px, py), placed relative to its parent. */
  private img(tex: string, px: number, py: number, parent: Ctr = this, offX = 0, offY = 0): Img {
    const [ox, oy] = bOrigin(tex, px, py);
    const im = new Phaser.GameObjects.Image(this.scene, px - offX, py - offY, bKey(tex)).setOrigin(ox, oy).setScale(K);
    im.setData('bx', px - offX);
    im.setData('by', py - offY);
    parent.add(im);
    this.imgs.push(im);
    return im;
  }

  /** Prop drawn in local coords (pivot at its own 0,0). */
  private local(tex: string, x: number, y: number): Img {
    const w = BW[tex];
    const im = new Phaser.GameObjects.Image(this.scene, x, y, bKey(tex)).setOrigin(-w.x0 / w.w, -w.y0 / w.h).setScale(K);
    im.setData('bx', x);
    im.setData('by', y);
    this.add(im);
    this.imgs.push(im);
    return im;
  }

  private needle(i: 0 | 1): Img {
    const nd = BG.needles[i];
    const im = this.local('needle', nd.x, nd.y);
    im.angle = nd.angle;
    return im;
  }

  // -------------------------------------------------------------------------
  // Expressions
  // -------------------------------------------------------------------------

  setExpression(e: BojuExpr): this {
    const prev = this.expression;
    this.expression = e;
    const eyes = e === 'happy' ? 'eyesHappy' : e === 'surprised' ? 'eyesRound' : 'eyesSmile';
    this.eyes.setTexture(bKey(eyes));
    this.mouthImg.setTexture(bKey(e === 'surprised' ? 'mouthO' : 'mouthSmile'));
    if (e === 'surprised' && prev !== 'surprised') this.puffFringe(true);
    if (e !== 'surprised' && prev === 'surprised') this.puffFringe(false);
    return this;
  }

  private puffFringe(on: boolean): void {
    this.scene.tweens.killTweensOf(this.fringe);
    const rm = reduceMotion();
    this.scene.tweens.add({
      targets: this.fringe,
      scaleX: on ? K * 1.12 : K,
      scaleY: on ? K * 1.22 : K,
      duration: rm ? 120 : on ? 380 : 500,
      ease: on ? 'Back.easeOut' : EASE.soft,
      easeParams: on ? [3] : undefined,
    });
    this.scene.tweens.add({ targets: this.earL, angle: on ? 16 : 0, duration: 260, ease: EASE.out });
    this.scene.tweens.add({ targets: this.earR, angle: on ? -16 : 0, duration: 260, ease: EASE.out });
  }

  /** Head bob + bell sway while a line shows. */
  talk(ms = 1800): void {
    this.talkUntil = this.t + ms / 1000;
    this.bellAmp = Math.max(this.bellAmp, 6);
  }

  /** Slow nod + bell "tonk". */
  nod(): void {
    if (this.scene.tweens.isTweening(this.headC)) return;
    const rm = reduceMotion();
    this.scene.tweens.add({
      targets: this.headC,
      angle: rm ? 0 : 3,
      y: BG.neck.y + (rm ? 2 : 7),
      duration: 560,
      yoyo: true,
      hold: 120,
      ease: EASE.loop,
      onYoyo: () => {
        this.bellAmp = 16;
        this.bellPhase = 0;
        this.onBell?.();
      },
    });
  }

  // -------------------------------------------------------------------------
  // Greeting: a glass of chiya
  // -------------------------------------------------------------------------

  async pourChiya(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const sc = this.scene;
    const rm = reduceMotion();
    const kp = BG.kettle;
    const hoof = this.hoofR;
    const hx = hoof.getData('bx') as number;
    const hy = hoof.getData('by') as number;
    this.frozen = true;

    // Set the right needle down; lift the kettle; the glass appears.
    sc.tweens.add({ targets: this.needleR, angle: BG.needles[1].angle - 14, duration: 300, ease: EASE.out });
    sc.tweens.add({ targets: hoof, x: kp.x + 1, y: kp.y - 7, duration: rm ? 200 : 520, ease: EASE.loop });
    this.kettle.setVisible(true).setAngle(0).setAlpha(1).setScale(K * 0.3);
    sc.tweens.add({ targets: this.kettle, scaleX: K, scaleY: K, duration: 420, delay: 140, ease: 'Back.easeOut', easeParams: [2] });
    this.glass.setVisible(true).setScale(K);
    this.glass.setData('baseScaleX', K).setData('baseScaleY', K);
    popIn(sc, this.glass, 200, 380);
    this.tea.setVisible(true);
    this.setTea(0);
    this.setExpression('smile');
    await wait(sc, rm ? 260 : 680);

    // Tilt and pour: one animated peach arc.
    await this.tween({ targets: this.kettle, angle: kp.tilt, duration: rm ? 150 : 420, ease: EASE.loop });
    const fh = this.stream.frame.height;
    const fw = this.stream.frame.width;
    this.stream.setVisible(true).setCrop(0, 0, fw, 0);
    const pour = { p: 0 };
    await this.tween({ targets: pour, p: 1, duration: 220, ease: EASE.in, onUpdate: () => this.stream.setCrop(0, 0, fw, fh * pour.p) });
    const steamEm = this.steamAt(BG.glass.x, BG.glass.y - 20);
    const fill = { p: 0 };
    await this.tween({ targets: fill, p: 1, duration: rm ? 300 : 1150, ease: EASE.loop, onUpdate: () => this.setTea(fill.p) });
    const stop = { p: 0 };
    await this.tween({ targets: stop, p: 1, duration: 200, ease: EASE.out, onUpdate: () => this.stream.setCrop(0, fh * stop.p, fw, fh * (1 - stop.p)) });
    this.stream.setVisible(false);
    await this.tween({ targets: this.kettle, angle: 0, duration: 340, ease: EASE.loop });

    // Kettle away, hoof back to the counter, a happy little squint.
    sc.tweens.add({ targets: this.kettle, scaleX: K * 0.3, scaleY: K * 0.3, alpha: 0, duration: 300, delay: 120, ease: EASE.in });
    sc.tweens.add({ targets: hoof, x: hx, y: hy, duration: rm ? 200 : 480, ease: EASE.loop });
    sc.tweens.add({ targets: this.needleR, angle: BG.needles[1].angle, duration: 360, delay: 300, ease: EASE.out });
    this.setExpression('happy');
    this.bellAmp = 8;
    await wait(sc, 900);
    this.kettle.setVisible(false);
    this.setExpression('smile');
    this.frozen = false;
    this.busy = false;
    sc.time.delayedCall(1600, () => steamEm.stop());
    sc.time.delayedCall(4000, () => steamEm.destroy());
  }

  /** The glass of chiya left on the counter (the scene may hide it later). */
  hideChiya(): void {
    this.glass.setVisible(false);
    this.tea.setVisible(false);
  }

  private setTea(p: number): void {
    const w = BW.tea;
    const fh = this.tea.frame.height;
    const fw = this.tea.frame.width;
    const top = -1.5 - 15.5 * p;
    const y = ((top - w.y0) / w.h) * fh;
    this.tea.setCrop(0, y, fw, fh - y);
  }

  private steamAt(lx: number, ly: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const m = this.getWorldTransformMatrix();
    const wx = m.tx + lx * m.a;
    const wy = m.ty + ly * m.d;
    return steam(this.scene, wx, wy, this.depth + 1, 0.6);
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((r) => {
      this.scene.tweens.add({ ...cfg, onComplete: () => r() });
    });
  }

  // -------------------------------------------------------------------------
  // The Moon Scale reaction
  // -------------------------------------------------------------------------

  async surprisedScale(): Promise<void> {
    const sc = this.scene;
    const rm = reduceMotion();
    this.frozen = true;
    this.talkUntil = -1;
    this.setExpression('surprised');
    // A little hop of surprise.
    sc.tweens.add({ targets: this.bodyC, scaleY: { from: 1.05, to: 1 }, scaleX: { from: 0.97, to: 1 }, duration: 520, ease: 'Back.easeOut', easeParams: [3] });
    this.bellAmp = 14;
    this.onBell?.();
    await wait(sc, 320);

    // The wool ball rolls off the counter.
    sc.tweens.add({ targets: this.yarn, alpha: 0, duration: 300 });
    const b = this.ball;
    const bx = b.getData('bx') as number;
    const by = b.getData('by') as number;
    await this.tween({ targets: b, x: bx + (rm ? 30 : 64), angle: rm ? 0 : 300, duration: rm ? 300 : 820, ease: 'Quad.easeIn' });
    await this.tween({ targets: b, x: b.x + 14, y: by + 90, angle: b.angle + 140, alpha: 0, duration: 460, ease: 'Quad.easeIn' });

    // Recover slowly; the ball turns up again later.
    sc.time.delayedCall(1300, () => {
      if (this.expression === 'surprised') this.setExpression('smile');
      this.frozen = false;
    });
    sc.time.delayedCall(2600, () => {
      b.setPosition(bx, by).setAngle(0).setAlpha(1).setScale(K);
      b.setData('baseScaleX', K).setData('baseScaleY', K);
      popIn(sc, b, 0, 420);
      sc.tweens.add({ targets: this.yarn, alpha: 1, duration: 400 });
    });
  }

  // -------------------------------------------------------------------------
  // Light + frame
  // -------------------------------------------------------------------------

  setLightTint(color: number): this {
    if (color === this.tint) return this;
    this.tint = color;
    for (const im of this.imgs) im.setTint(color);
    return this;
  }

  tick(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const t = this.t;
    const rm = reduceMotion();

    // Slow, big breathing: 3 s sine, 1.00 -> 1.02.
    if (!this.scene.tweens.isTweening(this.bodyC)) {
      const br = rm ? 0 : 0.02 * (0.5 - 0.5 * Math.cos((t * TAU) / 3));
      this.bodyC.scaleY = 1 + br;
      this.bodyC.scaleX = 1 - br * 0.2;
    }

    // Blink every 2-5 s (not when surprised or happy).
    if (!this.blinking && t > this.nextBlink && (this.expression === 'smile' || this.expression === 'talking')) {
      this.blinking = true;
      this.eyes.setTexture(bKey('eyesClosed'));
      this.scene.time.delayedCall(140, () => {
        this.blinking = false;
        if (this.expression === 'smile' || this.expression === 'talking') this.eyes.setTexture(bKey('eyesSmile'));
      });
      this.nextBlink = t + 2 + Math.random() * 3;
    }

    // Talking: mouth flaps, head bobs, bell sways.
    const talking = t < this.talkUntil || this.expression === 'talking';
    if (talking) {
      const open = Math.sin(t * 15) + Math.sin(t * 6.3) * 0.6 > 0.1;
      this.mouthImg.setTexture(bKey(open ? 'mouthTalk' : 'mouthSmile'));
      this.headBob = rm ? 0 : Math.abs(Math.sin(t * 7)) * 2.2;
      if (this.bellAmp < 4) this.bellAmp = 4;
    } else {
      if (this.mouthImg.texture.key === bKey('mouthTalk')) this.mouthImg.setTexture(bKey(this.expression === 'surprised' ? 'mouthO' : 'mouthSmile'));
      this.headBob *= 0.85;
    }
    if (!this.scene.tweens.isTweening(this.headC)) this.headC.y = BG.neck.y + this.headBob;

    // Knitting: needles cross with a click every ~4 s; the wool ball wobbles.
    if (!this.frozen && !rm) {
      if (t > this.nextStitch) {
        this.nextStitch = t + 4;
        this.stitchT = 0;
      }
      let k = 0;
      if (this.stitchT >= 0) {
        const prev = this.stitchT;
        this.stitchT += dt;
        if (prev < 0.2 && this.stitchT >= 0.2) this.onClick?.();
        if (this.stitchT < 0.4) k = Math.sin((Math.PI * this.stitchT) / 0.4);
        else this.stitchT = -1;
      }
      const wig = Math.sin(t * 2.3) * 1.4;
      this.needleL.angle = BG.needles[0].angle + wig + k * 7;
      this.needleR.angle = BG.needles[1].angle - wig * 0.8 - k * 7;
      this.swatch.y = (this.swatch.getData('by') as number) + k * 1.2 + Math.sin(t * 2.3) * 0.4;
      this.swatch.angle = wig * 0.6;
      if (!this.scene.tweens.isTweening(this.ball)) this.ball.angle = Math.sin(t * 1.6) * 3 + k * 5;
    }

    // Ear flick every 6-9 s.
    if (t > this.nextEar && !rm) {
      this.nextEar = t + 6 + Math.random() * 3;
      const ear = Math.random() < 0.5 ? this.earL : this.earR;
      const dir = ear === this.earL ? -1 : 1;
      if (!this.scene.tweens.isTweening(ear)) this.scene.tweens.add({ targets: ear, angle: dir * -20, duration: 110, yoyo: true, repeat: 1, ease: EASE.out });
    }

    // Slow nod every 10-14 s.
    if (t > this.nextNod) {
      this.nextNod = t + 10 + Math.random() * 4;
      if (!this.busy && this.expression !== 'surprised') this.nod();
    }

    // Bell: damped swing.
    this.bellPhase += dt;
    this.bellAmp *= Math.exp(-dt * 1.4);
    const idle = rm ? 0 : Math.sin(t * 1.1) * 1.2;
    this.bell.angle = idle + this.bellAmp * Math.sin(this.bellPhase * 7.5);
    this.tails.angle = (rm ? 0 : Math.sin(t * 0.9 + 1) * 1.2) + this.bellAmp * 0.15 * Math.sin(this.bellPhase * 5);
  }
}
