/**
 * Tuki, the large-eared pika hero (docs/WORLD.md section 5.1).
 *
 * Built on Rig: origin at the feet, ~104 px tall. Every part is a separate
 * baked texture (src/art/hero.ts) so ears, paws, feet, doko, face and props
 * animate on their own. All motion is procedural and computed in tick() from
 * small preallocated buffers (no per-frame allocation, no texture redraws).
 *
 * Containers: Rig.inner (flip + squash + walk hop) > Rig.breath (breathing)
 * > pc (pose: lean, offsets, loaf scale) > parts. The doko sits in its own
 * container so it can lag behind the hop and bounce.
 */
import Phaser from 'phaser';
import { Rig, type Expression } from './rig';
import { DOKO_POS, DOKO_SLOTS, EAR_POS, HERO_BOX, HERO_ITEMS, ROD_LEN, SCALE_SLOT, drawHeroPortrait } from '@/art/hero';
import { texSize } from '@/art/kit';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { dustPuff, heartBurst, sparkleBurst } from '@/fx/particles';
import { A, P, hexToInt, mix } from '@/palette';

export { drawHeroPortrait };

export type HeroPose = 'stand' | 'sit' | 'sleep' | 'fish' | 'cast' | 'reel' | 'eat' | 'pick' | 'read' | 'nap' | 'rest' | 'hold';
export type Tier = 'cozy' | 'content' | 'glowing' | 'blissful';

type BasePose = Exclude<HeroPose, 'cast' | 'reel' | 'pick'>;
type Img = Phaser.GameObjects.Image;
type Box = Phaser.GameObjects.Container;

const K = 1 / ART_SCALE;

/** Item cap per Contentment tier (WORLD 5.1 table). */
export const TIER_CAP: Record<Tier, number> = { cozy: 1, content: 3, glowing: 5, blissful: 5 };

// ---------------------------------------------------------------------------
// Pose channels: x, y, angle per animated part (pcs = pose scale x, y).
// ---------------------------------------------------------------------------

const CH = ['earL', 'earR', 'pawL', 'pawR', 'footL', 'footR', 'doko', 'pc', 'pcs', 'rod', 'book', 'held'] as const;
type ChName = (typeof CH)[number];
const N = CH.length;
const I = Object.fromEntries(CH.map((c, i) => [c, i * 3])) as Record<ChName, number>;
type Trip = [number, number, number];

const STAND: Record<ChName, Trip> = {
  earL: [EAR_POS.far.x, EAR_POS.far.y, EAR_POS.far.a],
  earR: [EAR_POS.near.x, EAR_POS.near.y, EAR_POS.near.a],
  pawL: [-10, -10, 0],
  pawR: [14, -10, 0],
  footL: [-13, -2, 0],
  footR: [15, -2, 0],
  doko: [DOKO_POS.x, DOKO_POS.y, DOKO_POS.a],
  pc: [0, 0, 0],
  pcs: [1, 1, 0],
  rod: [22, -24, 40],
  book: [21, -25, -8],
  held: [31, -37, 0],
};

function mkPose(over: Partial<Record<ChName, Trip>>): Float32Array {
  const a = new Float32Array(N * 3);
  for (const c of CH) {
    const v = over[c] ?? STAND[c];
    a[I[c]] = v[0];
    a[I[c] + 1] = v[1];
    a[I[c] + 2] = v[2];
  }
  return a;
}

const SIT: Partial<Record<ChName, Trip>> = {
  pc: [0, 0, -5],
  pcs: [1.03, 0.96, 0],
  footL: [17, -5, -78],
  footR: [27, -6, -70],
  pawL: [5, -22, 0],
  pawR: [19, -21, 0],
};

const POSES: Record<BasePose, Float32Array> = {
  stand: mkPose({}),
  sit: mkPose(SIT),
  rest: mkPose({ ...SIT, pc: [0, 0, -7], doko: [DOKO_POS.x + 2, DOKO_POS.y + 1, DOKO_POS.a - 6] }),
  read: mkPose({ ...SIT, book: [17, -31, -6], pawL: [6, -28, 0], pawR: [29, -28, 0] }),
  eat: mkPose({ ...SIT, pawL: [11, -40, 0], pawR: [22, -39, 0], held: [16, -42, 0] }),
  fish: mkPose({ pc: [0, 0, -3], footL: [14, 6, 52], footR: [25, 7, 44], pawL: [16, -28, 0], pawR: [26, -21, 0] }),
  hold: mkPose({ pawL: [23, -31, 0], pawR: [39, -31, 0] }),
  sleep: mkPose({
    pcs: [1.07, 0.86, 0],
    earL: [EAR_POS.far.x - 1, EAR_POS.far.y + 5, -74],
    earR: [EAR_POS.near.x - 5, EAR_POS.near.y + 5, -58],
    pawL: [-4, -5, 0],
    pawR: [10, -5, 0],
    footL: [-12, -1, 0],
    footR: [12, -1, 0],
  }),
  nap: mkPose({
    pc: [31, -17, -62],
    doko: [38, -22, 80],
    earL: [EAR_POS.far.x, EAR_POS.far.y + 2, -40],
    earR: [EAR_POS.near.x, EAR_POS.near.y + 2, -16],
    pawL: [23, -25, 0],
    pawR: [30, -7, 0],
    footL: [-10, -2, -20],
    footR: [16, -2, -30],
  }),
};

const ROD_POSES = new Set<HeroPose>(['fish', 'cast', 'reel']);
const SITTING = new Set<BasePose>(['sit', 'rest', 'read', 'eat', 'fish']);

/** Ear offsets per expression: [far angle, near angle, y]. */
const EAR_EXPR: Record<Expression, Trip> = {
  neutral: [0, 0, 0],
  happy: [4, -4, -1],
  blissful: [-7, 7, 1],
  surprised: [-EAR_POS.far.a, -EAR_POS.near.a, -4],
  sleepy: [-35 - EAR_POS.far.a, 35 - EAR_POS.near.a, 2],
  munching: [-3, 3, 0],
};

const EYES_FOR: Record<Expression, string> = {
  neutral: 'open',
  happy: 'happy',
  blissful: 'closed',
  surprised: 'round',
  sleepy: 'half',
  munching: 'open',
};
const MOUTH_FOR: Record<Expression, string> = {
  neutral: 'w',
  happy: 'smile',
  blissful: 'smile',
  surprised: 'o',
  sleepy: 'small',
  munching: 'munch',
};

// ---------------------------------------------------------------------------
// Easing + timeline helpers (allocation-free)
// ---------------------------------------------------------------------------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const inOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
function outBack(t: number, s = 1.70158): number {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type Act = 'none' | 'hay' | 'pick' | 'cast' | 'reel';
const ACT_LEN: Record<Act, number> = { none: 0, hay: 2.9, pick: 0.9, cast: 0.5, reel: 1.2 };

export class Hero extends Rig {
  /** Fired when the quirk's "eep" plays, so the scene can play the SFX. */
  onEep?: () => void;

  pose: HeroPose = 'stand';
  tier: Tier = 'cozy';

  private basePose: BasePose = 'stand';
  private readonly pc: Box;
  private readonly dokoC: Box;
  private readonly faceC: Box;
  private readonly rodC: Box;
  private readonly img: Record<string, Img> = {};
  private readonly slots: Img[] = [];
  private readonly fx: { bang: Img; q: Img; z1: Img; z2: Img };

  // Pose buffers.
  private readonly from = new Float32Array(N * 3);
  private to: Float32Array = POSES.stand;
  private readonly cur = new Float32Array(N * 3);
  private readonly ov = new Float32Array(N * 3);
  private poseK = 1;

  // Face state.
  private blinkClosed = false;
  private eyeX = 0;
  private eyeY = 0;
  private eyeTX = 0;
  private eyeTY = 0;
  private eyeOverride: string | null = null;
  private mouthOverride: string | null = null;
  private lookX: number | null = null;
  private glanceT = 3;
  private glanceHold = 0;
  private glanceTo = 0;
  private blushK = 1;
  private earExL = 0;
  private earExR = 0;
  private earExY = 0;
  private flickT = -1;
  private flickEar = 0;
  private nextFlick = 4;
  private munchT = 0;

  // Actions.
  private act: Act = 'none';
  private actT = 0;
  private prevActT = 0;
  private hopY = 0;
  private nextHay = rnd(12, 20);
  private hayTarget = 0;
  private hayScale = false;
  private surT = -1;
  private perkT = -1;
  private perkPending = false;
  private blinkSeqT = -1;
  private blinkResolve: (() => void) | null = null;
  private puffT = -1;
  private puffKind: 'bang' | 'q' = 'bang';
  private heartT = 0;
  private zT = 0;
  private pageT = 0;

  // Doko state.
  private nItems = 0;
  private tierInit = false;
  private cap = 1;
  private readonly popT = new Float32Array(6).fill(1);
  private scaleOn = false;
  private dokoOff = 0;
  private dokoVel = 0;
  private readonly lagBuf = new Float32Array(3);
  private lagIdx = 0;
  private prevInnerY = 0;
  private prevDy = 0;
  private stepFoot = 1;

  // Rain / ghum.
  private rainOn = false;
  private rainT = 0;
  private dripT = 0;
  private earsFront = false;
  private napLayer = false;
  private layerEars = false;
  private layered = false;
  private layerFeet = false;

  /** Auto-play the haymaker while idle (style boards turn this off). */
  autoQuirk = true;
  /** Preview only: freeze a walk-hop phase 0..1 (null = off). */
  previewHop: number | null = null;

  // Held item.
  private heldKey: string | null = null;

  // Scratch for world transforms.
  private readonly tm = new Phaser.GameObjects.Components.TransformMatrix();
  private readonly tp = new Phaser.GameObjects.Components.TransformMatrix();
  private readonly pt = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.heightPx = 104;
    this.hopHeight = 5;

    // Contact shadow stays on the ground (outer container, behind everything).
    const sh = this.mk('shadow', 'hero_shadow', 'hero_shadow', this, 0, 0);
    sh.setData('noTint', true);
    this.sendToBack(sh);

    this.pc = new Phaser.GameObjects.Container(scene, 0, 0);
    this.breath.add(this.pc);
    const pc = this.pc;

    // Doko: glow, back rim, items, Moon Scale, front body.
    this.dokoC = new Phaser.GameObjects.Container(scene, DOKO_POS.x, DOKO_POS.y);
    this.dokoC.angle = DOKO_POS.a;
    pc.add(this.dokoC);
    const glow = this.part('dokoGlow', 'glow', 0, -24, 0.5, 0.5, this.dokoC);
    glow.setScale((92 / 256) * K).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow'])).setAlpha(0).setVisible(false);
    glow.setData('noTint', true);
    this.img.dokoGlow = glow;
    this.mk('dokoBack', 'hero_doko_back', 'hero_doko_back', this.dokoC, 0, 0);
    DOKO_SLOTS.forEach((s, i) => {
      const it = this.mk(`slot${i}`, HERO_ITEMS[i], 'hero_item', this.dokoC, s.u, s.v);
      it.setAngle(s.a).setVisible(false);
      this.slots.push(it);
    });
    const sc = this.mk('scale', 'hero_item_scale', 'hero_item', this.dokoC, SCALE_SLOT.u, SCALE_SLOT.v);
    sc.setAngle(SCALE_SLOT.a).setVisible(false);
    this.mk('dokoFront', 'hero_doko_front', 'hero_doko_front', this.dokoC, 0, 0);

    // Ears (behind the head when dry), blissful gurans behind the near ear.
    this.mk('earFlower', 'hero_earflower', 'hero_earflower', pc, 27, -86).setAngle(18).setVisible(false);
    this.mk('earL', 'hero_ear_far', 'hero_ear', pc, EAR_POS.far.x, EAR_POS.far.y);
    this.mk('earR', 'hero_ear', 'hero_ear', pc, EAR_POS.near.x, EAR_POS.near.y);

    this.mk('body', 'hero_body', 'hero_body', pc, 0, 0);
    this.mk('footL', 'hero_foot', 'hero_foot', pc, -13, -2);
    this.mk('footR', 'hero_foot', 'hero_foot', pc, 15, -2);
    this.mk('namlo', 'hero_namlo', 'hero_namlo', pc, 0, 0);

    // Face.
    this.faceC = new Phaser.GameObjects.Container(scene, 0, 0);
    pc.add(this.faceC);
    this.mk('blushL', 'hero_blush', 'hero_blush', this.faceC, -20, -49);
    this.mk('blushR', 'hero_blush', 'hero_blush', this.faceC, 25, -49);
    this.mk('muzzle', 'hero_muzzle', 'hero_muzzle', this.faceC);
    this.mk('mouth', 'hero_mouth_w', 'hero_mouth', this.faceC);
    this.mk('eyes', 'hero_eyes_open', 'hero_eyes', this.faceC);

    // Props.
    this.mk('held', 'hero_item_gurans', 'hero_book', pc, 0, 0).setOrigin(0.5).setVisible(false);
    this.mk('book', 'hero_book', 'hero_book', pc, 0, 0).setVisible(false).setScale(1.2 * K);
    this.rodC = new Phaser.GameObjects.Container(scene, 22, -24);
    this.rodC.setVisible(false);
    pc.add(this.rodC);
    this.mk('rod', 'hero_rod', 'hero_rod', this.rodC, 0, 0);
    this.mk('pluck', HERO_ITEMS[0], 'hero_item', pc, 0, 0).setVisible(false);
    this.mk('pawL', 'hero_paw', 'hero_paw', pc, -10, -10);
    this.mk('pawR', 'hero_paw', 'hero_paw', pc, 14, -10);

    // Ghum (rain hood) + its drip.
    this.mk('ghum', 'hero_ghum', 'hero_ghum', pc).setVisible(false);
    const drip = this.part('drip', 'drop', -57, -48, 0.5, 0.2, pc);
    drip.setScale(0.62 * K).setTint(hexToInt(mix(P.powder, P.cream, 0.45))).setVisible(false);
    drip.setData('noTint', true);
    this.img.drip = drip;

    // Untinted fx puffs (outer container so glyphs never mirror).
    const fxImg = (key: string) => {
      const im = new Phaser.GameObjects.Image(scene, 0, 0, key).setScale(K).setVisible(false);
      this.add(im);
      return im;
    };
    this.fx = { bang: fxImg('hero_bang'), q: fxImg('hero_q'), z1: fxImg('hero_z'), z2: fxImg('hero_z') };

    this.cur.set(POSES.stand);
    this.from.set(POSES.stand);

    this.onStep = (sx, sy) => dustPuff(this.scene, sx - this.facing * 8, sy - 1);
    this.setTier('cozy');
    this.writeParts();
  }

  /** Add a part by its HERO_BOX pivot. */
  private mk(name: string, key: string, boxKey: string, parent: Box, x?: number, y?: number): Img {
    const b = HERO_BOX[boxKey];
    const im = this.part(name, key, x ?? b.px, y ?? b.py, (b.px - b.x0) / b.w, (b.py - b.y0) / b.h, parent);
    this.img[name] = im;
    return im;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  setPose(p: HeroPose): this {
    const oneShot = p === 'cast' || p === 'reel' || p === 'pick';
    if (p === this.pose && !oneShot) return this;
    const base: BasePose = p === 'cast' || p === 'reel' ? 'fish' : p === 'pick' ? 'stand' : p;
    if (base !== this.basePose) {
      this.from.set(this.cur);
      this.to = POSES[base];
      this.poseK = 0;
      this.basePose = base;
    }
    this.pose = p;
    // Actions.
    if (this.act !== 'none') this.endAct(false);
    if (oneShot) this.startAct(p as Act);
    const sleepy = base === 'sleep' || base === 'nap';
    this.breathAmount = sleepy ? 0.045 : 0.03;
    this.breathPeriod = sleepy ? 3600 : 2400;
    if (!sleepy) {
      this.fx.z1.setVisible(false);
      this.fx.z2.setVisible(false);
    }
    this.relayer();
    this.updateHeldVisibility();
    return this;
  }

  /** World coords of the rod tip (for the fishing line / bobber). */
  rodTip(): { x: number; y: number } {
    this.rodC.getWorldTransformMatrix(this.tm, this.tp);
    this.tm.transformPoint(0, -ROD_LEN, this.pt);
    return { x: this.pt.x, y: this.pt.y };
  }

  /** A dish/item icon held in the paws (pose 'hold' or 'eat'). */
  setHeldItem(textureKey: string | null): this {
    this.heldKey = textureKey && this.scene.textures.exists(textureKey) ? textureKey : null;
    const h = this.img.held;
    if (this.heldKey) {
      h.setTexture(this.heldKey);
      const sz = texSize(this.heldKey);
      const lw = sz.w > 0 ? Math.max(sz.w, sz.h) : Math.max(h.frame.width, h.frame.height) / ART_SCALE;
      h.setData('fitScale', (30 / Math.max(1, lw)) * K);
    }
    this.updateHeldVisibility();
    return this;
  }

  /**
   * Unfold/fold the ghum with a bounce (0.6 s). Snaps instantly when called
   * during the first moments after spawn (a scene that starts in rain).
   */
  setRain(on: boolean, instant = this.t < 0.25): this {
    if (on === this.rainOn) return this;
    this.rainOn = on;
    if (on) {
      this.img.ghum.setVisible(true);
      this.earsFront = true;
      this.relayer();
    }
    if (instant) {
      this.rainT = on ? 1 : 0;
      if (!on) {
        this.img.ghum.setVisible(false);
        this.earsFront = false;
        this.relayer();
      }
    }
    return this;
  }

  /** Doko fill cap + quirk flourish (WORLD 5.1 table). Idempotent. */
  setTier(t: Tier): this {
    const changed = t !== this.tier || !this.tierInit;
    this.tierInit = true;
    this.tier = t;
    this.cap = TIER_CAP[t];
    if (changed) {
      const prev = this.nItems;
      this.nItems = this.cap;
      const quiet = prev === 0 || this.t < 0.25;
      for (let i = prev; i < this.nItems; i++) this.popT[i] = quiet ? 1 : 0;
      if (this.nItems > prev && !quiet) this.dokoKick(30);
    }
    this.refreshSlots();
    this.img.earFlower.setVisible(t === 'blissful' || this.expression === 'blissful');
    return this;
  }

  /** Items currently riding in the doko, and the tier's cap. */
  get itemCount(): number {
    return this.nItems;
  }
  get itemCap(): number {
    return this.cap;
  }

  /** Empty the doko (dawn: Tuki dried the flowers overnight). */
  emptyDoko(): this {
    this.nItems = 0;
    this.refreshSlots();
    return this;
  }

  /** Set how many items ride in the doko (clamped to the tier cap). */
  setDokoCount(n: number): this {
    this.nItems = Math.max(0, Math.min(this.cap, Math.round(n)));
    this.refreshSlots();
    return this;
  }

  /** Moon Scale riding in the doko: fish-glow rim halo, alpha 0.3, 3 s pulse. */
  setScaleGlow(on: boolean): this {
    if (on === this.scaleOn) return this;
    this.scaleOn = on;
    this.img.scale.setVisible(on);
    this.img.dokoGlow.setVisible(on);
    if (on && this.t >= 0.25) {
      this.popT[5] = 0;
      this.dokoKick(30);
    }
    return this;
  }

  /** Eyes glance toward a world x (null = forward / idle glances). */
  lookAt(worldX: number | null): this {
    this.lookX = worldX;
    return this;
  }

  /** Play the "haymaker" quirk now. Pass { scale: true } to hay the Moon Scale (clue 2). */
  haymaker(opts?: { scale?: boolean }): void {
    if (this.walking) return;
    if (this.basePose !== 'stand') this.setPose('stand');
    this.hayScale = !!opts?.scale;
    this.hayTarget = this.nItems < this.cap ? this.nItems : Math.max(0, this.nItems - 1);
    this.startAct('hay');
    const pl = this.img.pluck;
    pl.setTexture(this.hayScale ? 'hero_item_scale' : HERO_ITEMS[this.hayTarget]);
  }

  /** Guardian-night tell: ears swivel +20 deg toward +x, "?" puff, hold 1.5 s. */
  perkTowardLake(): void {
    if (this.act === 'hay' && this.actT < 1.95) {
      this.perkPending = true;
      return;
    }
    this.perkT = 0;
    this.perkPending = false;
  }

  /** The finale's answering slow-blink. */
  slowBlink(): Promise<void> {
    this.blinkResolve?.();
    this.blinkSeqT = 0;
    return new Promise((res) => {
      this.blinkResolve = res;
    });
  }

  /** On a bite: ears shoot up, round eyes, "o" mouth, ~0.8 s, then back. */
  surprised(): void {
    this.surT = 0;
    this.squash(0.9, 1.12, 80);
  }

  // =========================================================================
  // Rig hooks
  // =========================================================================

  protected override applyExpression(e: Expression): void {
    this.img.earFlower?.setVisible(this.tier === 'blissful' || e === 'blissful');
  }

  protected override applyBlink(closed: boolean): void {
    this.blinkClosed = closed;
  }

  // =========================================================================
  // Frame update
  // =========================================================================

  override tick(time: number, delta: number): void {
    super.tick(time, delta);
    const dt = Math.min(delta, 50) / 1000;
    const rm = reduceMotion();

    if (this.walking) {
      if (this.basePose !== 'stand' && this.basePose !== 'hold') this.setPose('stand');
      if (this.act === 'hay' || this.act === 'pick') this.endAct(false);
    }

    // Pose blend.
    if (this.poseK < 1) {
      this.poseK = Math.min(1, this.poseK + dt / 0.24);
      const e = rm ? 1 : outBack(this.poseK, 1.3);
      for (let i = 0; i < N * 3; i++) this.cur[i] = this.from[i] + (this.to[i] - this.from[i]) * e;
    }

    this.ov.fill(0);
    this.hopY = 0;
    this.eyeOverride = null;
    this.mouthOverride = null;
    this.eyeTX = 0;
    this.eyeTY = 0;

    this.updateActions(dt, rm);
    this.updateIdle(dt, rm);
    this.updateRain(dt);
    this.updateDoko(dt, rm);
    this.updateFx(dt);

    if (this.previewHop !== null) {
      const f = this.previewHop;
      this.hopY = -Math.sin(f * Math.PI) * this.hopHeight;
      const land = clamp01(1 - Math.min(f, 1 - f) / 0.12);
      this.addOv('pcs', 0.06 * land, -0.08 * land, 0);
      const lagF = -Math.sin(Math.max(0, f - 0.09) * Math.PI) * this.hopHeight - this.hopY;
      this.addOv('doko', 0, lagF, lagF * 0.8);
      this.addOv('earL', 0, 0, -lagF * 1.6);
      this.addOv('earR', 0, 0, lagF * 1.6);
      const lift = -this.hopY / this.hopHeight;
      this.addOv('footL', -2.5 * lift, -1.5 * lift, -10 * lift);
      this.addOv('footR', 2.5 * lift, -0.5 * lift, 10 * lift);
    }
    if (!this.walking) this.inner.y = rm ? 0 : this.hopY;
    this.writeParts();
  }

  // -------------------------------------------------------------------------

  private startAct(a: Act): void {
    this.act = a;
    this.actT = 0;
    this.prevActT = -0.001;
  }

  private endAct(natural: boolean): void {
    const a = this.act;
    this.act = 'none';
    this.actT = 0;
    this.img.pluck.setVisible(false);
    this.inner.y = this.walking ? this.inner.y : 0;
    if (natural) {
      if (a === 'cast' || a === 'reel') this.pose = 'fish';
      else if (a === 'pick') this.pose = 'stand';
      else if (a === 'hay') this.nextHay = rnd(12, 20);
    }
  }

  /** True once when the action timeline crosses t. */
  private at(t: number): boolean {
    return this.prevActT < t && this.actT >= t;
  }

  private addOv(ch: ChName, x: number, y: number, a = 0): void {
    const i = I[ch];
    this.ov[i] += x;
    this.ov[i + 1] += y;
    this.ov[i + 2] += a;
  }

  private updateActions(dt: number, rm: boolean): void {
    // Perk freezes the haymaker's clock mid-pat.
    const frozen = this.perkT >= 0;
    if (this.act !== 'none' && !frozen) {
      this.prevActT = this.actT;
      this.actT += dt;
      if (this.act === 'hay' && this.perkPending && this.actT >= 1.95) {
        this.actT = 1.95;
        this.perkPending = false;
        this.perkT = 0;
      }
    }
    switch (this.act) {
      case 'hay':
        this.hayFrame(rm);
        break;
      case 'pick':
        this.pickFrame();
        break;
      case 'cast':
        this.castFrame();
        break;
      case 'reel':
        this.reelFrame();
        break;
      default:
        break;
    }
    if (this.act !== 'none' && this.actT >= ACT_LEN[this.act]) this.endAct(true);

    // Surprised (0.8 s).
    if (this.surT >= 0) {
      this.surT += dt;
      const t = this.surT;
      this.eyeOverride = 'round';
      this.mouthOverride = 'o';
      this.hopY += -Math.sin(seg(t, 0, 0.22) * Math.PI) * 4;
      if (t > 0.8) this.surT = -1;
    }

    // Perk toward the lake (0.3 in, 1.5 hold, 0.3 out).
    if (this.perkT >= 0) {
      this.perkT += dt;
      const t = this.perkT;
      const env = outCubic(seg(t, 0, 0.3)) * (1 - inOut(seg(t, 1.8, 2.1)));
      const f = this.facing;
      this.addOv('earL', 0, -2 * env, 20 * f * env);
      this.addOv('earR', 0, -2 * env, 20 * f * env);
      this.eyeTX = 2 * f * env;
      this.eyeTY = -0.6 * env;
      if (t >= 0.22 && this.puffT < 0) this.showPuff('q');
      if (t > 2.1) this.perkT = -1;
    }

    // Slow blink (finale): half, closed, hold, half, open.
    if (this.blinkSeqT >= 0) {
      this.blinkSeqT += dt;
      const t = this.blinkSeqT;
      this.eyeOverride = t < 0.28 ? 'half' : t < 1.1 ? 'closed' : t < 1.38 ? 'half' : null;
      this.addOv('pc', 0, 1.2 * Math.sin(seg(t, 0, 1.4) * Math.PI), 0);
      if (t > 1.5) {
        this.blinkSeqT = -1;
        const r = this.blinkResolve;
        this.blinkResolve = null;
        r?.();
      }
    }
  }

  /** The haymaker, ~2.9 s (WORLD 5.1). */
  private hayFrame(rm: boolean): void {
    const t = this.actT;
    const tierN = this.tier === 'cozy' ? 0 : this.tier === 'content' ? 1 : this.tier === 'glowing' ? 2 : 3;
    const base = STAND.pawR;
    // 1. Glance down (0-0.3).
    if (t < 0.95) {
      this.eyeTY = 1.8;
      this.eyeTX = 1;
    }
    const lean = 3 * inOut(seg(t, 0, 0.3)) + 4 * inOut(seg(t, 0.65, 0.78)) - 7 * inOut(seg(t, 0.8, 1.0));
    this.addOv('pc', 0, 0, lean);
    // 2. Hop (0.3-0.65).
    if (this.at(0.3)) this.squash(1.08, 0.92, 70);
    this.hopY += -Math.sin(seg(t, 0.3, 0.65) * Math.PI) * 7;
    if (this.at(0.65)) this.squash(1.06, 0.92);
    // Paw path (absolute targets, converted to overlay).
    let px = base[0];
    let py = base[1];
    if (t >= 0.65 && t < 0.8) {
      const s = inOut(seg(t, 0.65, 0.8));
      px = lerp(base[0], 24, s);
      py = lerp(base[1], -2, s);
    } else if (t >= 0.8 && t < 0.95) {
      const s = outCubic(seg(t, 0.8, 0.95));
      px = lerp(24, 20, s);
      py = lerp(-2, -26, s);
    } else if (t >= 0.95 && t < 1.45) {
      const s = outBack(seg(t, 0.95, 1.12));
      px = lerp(20, 22, s);
      py = lerp(-26, -40, s);
    } else if (t >= 1.45 && t < 1.8) {
      // 5. Tuck: over the shoulder in an arc.
      const s = inOut(seg(t, 1.45, 1.8));
      const u = 1 - s;
      px = u * u * 22 + 2 * u * s * 12 + s * s * -22;
      py = u * u * -40 + 2 * u * s * -100 + s * s * -84;
    } else if (t >= 1.8 && t < 1.95) {
      const s = inOut(seg(t, 1.8, 1.95));
      px = lerp(-22, -27, s);
      py = lerp(-84, -62, s);
    } else if (t >= 1.95 && t < 2.35) {
      // 6. Pat twice.
      px = -27;
      py = -62 - 4 * Math.abs(Math.sin(((t - 1.95) / 0.2) * Math.PI));
    } else if (t >= 2.35) {
      const s = outCubic(seg(t, 2.35, 2.6));
      px = lerp(-27, base[0], s);
      py = lerp(-62, base[1], s);
    }
    this.addOv('pawR', px - base[0], py - base[1], 0);
    // The plucked stem rides in the paw from pluck until the tuck.
    const pl = this.img.pluck;
    const holding = t >= 0.8 && t < 1.8;
    pl.setVisible(holding);
    if (holding) {
      const grow = outBack(seg(t, 0.8, 0.92));
      pl.setPosition(this.cur[I.pawR] + this.ov[I.pawR] + 1, this.cur[I.pawR + 1] + this.ov[I.pawR + 1] + 2);
      pl.setScale(0.85 * grow * K);
      pl.setAngle(t < 1.45 ? -8 : -8 - 40 * seg(t, 1.45, 1.8));
    }
    // 4. Admire: sparkle eyes.
    if (t >= 0.95 && t < 1.45) {
      this.eyeOverride = 'sparkle';
      this.mouthOverride = 'smile';
      this.eyeTY = -0.8;
      this.eyeTX = 1.4;
    }
    if (this.at(1.0)) this.burstAt(this.img.pawR, 0, -10, 5, P.glow);
    if (t >= 1.45 && t < 1.95) {
      this.eyeTX = -1.6;
      this.eyeTY = -0.8;
    }
    // Glowing+: sparkle trail along the tuck.
    if (tierN >= 2 && (this.at(1.55) || this.at(1.68))) this.burstAt(this.img.pawR, 0, -6, 3, P.butter);
    if (this.at(1.8)) {
      if (this.hayScale) {
        this.hayScale = false;
        this.setScaleGlow(true);
      } else {
        if (this.nItems < this.cap) this.nItems++;
        this.popT[this.hayTarget] = 0;
        this.refreshSlots();
      }
      this.dokoKick(42);
      if (tierN >= 2) this.burstAt(this.dokoC, 0, -34, 6, P.butter);
    }
    // Pat: blissful closes its eyes.
    if (t >= 1.95 && t < 2.35) {
      this.eyeOverride = tierN === 3 ? 'closed' : 'happy';
      this.mouthOverride = 'smile';
    }
    if (this.at(2.05) || this.at(2.25)) this.dokoKick(24);
    // 7. Eep!
    if (t >= 2.35) {
      this.eyeOverride = 'happy';
      this.mouthOverride = 'smile';
      this.hopY += -Math.sin(seg(t, 2.38, 2.55) * Math.PI) * 3;
    }
    if (this.at(2.38)) {
      this.squash(0.94, 1.07, 70);
      this.showPuff('bang');
      this.onEep?.();
      if (tierN === 3 && !rm) {
        const w = this.worldOf(10, -96);
        heartBurst(this.scene, w.x, w.y, 3, this.depth + 2);
      }
    }
    if (tierN >= 1 && (this.at(2.55) || this.at(2.75))) this.floatNote(this.at(2.55) ? 0 : 1);
  }

  private pickFrame(): void {
    const t = this.actT;
    if (this.at(0.001)) this.squash(1.08, 0.9, 80);
    const lean = 5 * inOut(seg(t, 0, 0.15)) + 5 * inOut(seg(t, 0.45, 0.6)) - 10 * inOut(seg(t, 0.72, 0.9));
    this.addOv('pc', 0, 0, lean);
    this.hopY += -Math.sin(seg(t, 0.15, 0.45) * Math.PI) * 8;
    if (this.at(0.45)) this.squash(1.06, 0.92);
    const down = inOut(seg(t, 0.45, 0.62));
    const up = outCubic(seg(t, 0.62, 0.75));
    const back = inOut(seg(t, 0.75, 0.9));
    this.addOv('pawR', (10 * down - 5 * up) * (1 - back), (8 * down - 24 * up) * (1 - back), 0);
    this.addOv('pawL', 6 * down * (1 - up), 6 * down * (1 - up), 0);
    if (t >= 0.4 && t < 0.62) this.eyeTY = 1.8;
    if (this.at(0.62)) {
      this.squash(0.85, 1.15, 90);
      this.burstAt(this.img.pawR, 0, -4, 6, P.glow);
    }
    if (t >= 0.62) {
      this.eyeOverride = 'sparkle';
      this.mouthOverride = 'smile';
    }
  }

  private castFrame(): void {
    const t = this.actT;
    let ra = 0;
    if (t < 0.2) ra = -85 * inOut(seg(t, 0, 0.2));
    else if (t < 0.33) ra = lerp(-85, 24, seg(t, 0.2, 0.33) ** 2);
    else ra = 24 * (1 - outBack(seg(t, 0.33, 0.5), 2));
    const lift = t < 0.2 ? inOut(seg(t, 0, 0.2)) : 1 - inOut(seg(t, 0.2, 0.4));
    this.addOv('rod', -3 * lift, -8 * lift, ra);
    this.addOv('pawL', -3 * lift, -9 * lift, 0);
    this.addOv('pawR', -3 * lift, -9 * lift, 0);
    this.addOv('pc', 0, 0, -4 * lift + (t > 0.2 && t < 0.4 ? 3 : 0));
    this.eyeTX = 1.4;
    this.eyeTY = -0.6;
  }

  private reelFrame(): void {
    const t = this.actT;
    const env = outCubic(seg(t, 0, 0.12)) * (1 - inOut(seg(t, 1.0, 1.2)));
    const tau = Math.PI * 2;
    this.addOv('rod', 0, (-4 + 2 * Math.sin(t * tau * 6)) * env, (-30 + 7 * Math.sin(t * tau * 5)) * env);
    this.addOv('pawR', 2.4 * Math.cos(t * tau * 4) * env, (-5 + 2.4 * Math.sin(t * tau * 4)) * env, 0);
    this.addOv('pawL', -2 * env, -7 * env, 0);
    this.addOv('pc', 0, 0, -5 * env);
    this.addOv('footL', 0, 0, 18 * Math.sin(t * tau * 3) * env);
    this.addOv('footR', 0, 0, -18 * Math.sin(t * tau * 3 + 0.8) * env);
    this.hopY += -Math.abs(Math.sin(t * tau * 2)) * 2.5 * env;
    this.addOv('earL', 0, -2 * env, 8 * env);
    this.addOv('earR', 0, -2 * env, -6 * env);
    this.eyeOverride = 'sparkle';
    this.mouthOverride = 'smile';
    this.eyeTX = 1.6;
  }

  // -------------------------------------------------------------------------

  private updateIdle(dt: number, rm: boolean): void {
    const busy = this.act !== 'none' || this.perkT >= 0;
    const tt = this.t;
    const bp = this.basePose;

    // Auto haymaker every 12-20 s while standing idle.
    if (this.autoQuirk && this.pose === 'stand' && !this.walking && !busy && this.blinkSeqT < 0) {
      this.nextHay -= dt;
      if (this.nextHay <= 0 && !rm) this.haymaker();
    }

    // Eyes: target, else little idle glances.
    if (this.eyeTX === 0 && this.eyeTY === 0 && !busy) {
      if (this.lookX !== null) {
        const d = (this.lookX - this.x) * this.facing;
        this.eyeTX = Math.max(-1, Math.min(1, d / 140)) * 1.9;
      } else {
        this.glanceT -= dt;
        if (this.glanceT <= 0) {
          if (this.glanceHold > 0) {
            this.glanceTo = 0;
            this.glanceHold = 0;
            this.glanceT = rnd(2.5, 6);
          } else {
            this.glanceTo = Math.random() < 0.5 ? -1.5 : 1.4;
            this.glanceHold = 1;
            this.glanceT = rnd(0.8, 1.8);
          }
        }
        this.eyeTX = this.glanceTo;
      }
    }
    if (bp === 'read') {
      this.eyeTY = 1.6;
      this.eyeTX = 1.4;
    }
    const ek = Math.min(1, dt * 16);
    this.eyeX += (this.eyeTX - this.eyeX) * ek;
    this.eyeY += (this.eyeTY - this.eyeY) * ek;

    // Ear expression offsets (smoothed); surprised overrides.
    const flat = bp === 'sleep' || bp === 'nap';
    const ex = this.surT >= 0 ? EAR_EXPR.surprised : flat ? EAR_EXPR.neutral : EAR_EXPR[this.expression];
    const ak = Math.min(1, dt * (this.surT >= 0 ? 30 : 10));
    this.earExL += (ex[0] - this.earExL) * ak;
    this.earExR += (ex[1] - this.earExR) * ak;
    this.earExY += (ex[2] - this.earExY) * ak;
    this.addOv('earL', 0, this.earExY, this.earExL);
    this.addOv('earR', 0, this.earExY, this.earExR);

    // Ear flick every 3-7 s.
    if (!rm && !flat) {
      this.nextFlick -= dt;
      if (this.nextFlick <= 0 && this.flickT < 0) {
        this.flickT = 0;
        this.flickEar = Math.random() < 0.5 ? 0 : 1;
        this.nextFlick = rnd(3, 7);
      }
      if (this.flickT >= 0) {
        this.flickT += dt;
        const f = this.flickT < 0.32 ? Math.sin((this.flickT / 0.32) * Math.PI * 2) * (1 - this.flickT / 0.32) * 13 : 0;
        if (this.flickEar === 0) this.addOv('earL', 0, 0, -f);
        else this.addOv('earR', 0, 0, f);
        if (this.flickT >= 0.32) this.flickT = -1;
      }
    }

    // Blush: x1.4 when blissful (and during the slow blink).
    const bt = this.expression === 'blissful' || this.blinkSeqT >= 0 ? 1.4 : 1;
    this.blushK += (bt - this.blushK) * Math.min(1, dt * 6);

    // Sleepy leans back against the doko when sitting.
    if (this.expression === 'sleepy' && SITTING.has(bp)) this.addOv('pc', 0, 0, -4);

    // Munching: paws to mouth, cheeks puff.
    const munching = bp === 'eat' || this.expression === 'munching';
    if (munching) {
      this.munchT += dt;
      if (bp !== 'eat' && (bp === 'stand' || SITTING.has(bp)) && !ROD_POSES.has(this.pose)) {
        this.addOv('pawL', 11 - this.cur[I.pawL], -40 - this.cur[I.pawL + 1], 0);
        this.addOv('pawR', 22 - this.cur[I.pawR], -39 - this.cur[I.pawR + 1], 0);
      }
      const bob = Math.sin(this.munchT * Math.PI * 2 * 2.8);
      this.addOv('pawL', 0, bob * 1.2, 0);
      this.addOv('pawR', 0, -bob * 1.2, 0);
      this.addOv('held', 0, bob * 0.8, 0);
    }

    // Pose idles.
    if (!rm) {
      if (bp === 'fish' && this.act === 'none') {
        this.addOv('footL', 0, 0, 9 * Math.sin(tt * 2.1));
        this.addOv('footR', 0, 0, 9 * Math.sin(tt * 2.1 + 1.9));
        this.addOv('rod', 0, 0.6 * Math.sin(tt * 1.3), 1.4 * Math.sin(tt * 0.9));
      }
      if ((bp === 'sit' || bp === 'rest') && this.act === 'none') {
        this.addOv('footR', 0, 0, 6 * Math.max(0, Math.sin(tt * 0.7)) ** 6);
      }
      if (bp === 'read') {
        this.pageT += dt;
        const pf = this.pageT % 7;
        const sq = pf > 6.6 ? Math.sin(((pf - 6.6) / 0.4) * Math.PI) : 0;
        this.img.book.setScale(1.2 * K * (1 - 0.35 * sq), 1.2 * K);
      }
    }

    // Walking: feet alternate, paws swing, ears bounce.
    if (this.walking) {
      const lift = Math.min(1, -this.inner.y / Math.max(1, this.hopHeight));
      const s = this.stepFoot;
      this.addOv('footL', -2.5 * s * lift, -1.5 * lift * (s > 0 ? 1 : 0.3), -10 * s * lift);
      this.addOv('footR', 2.5 * s * lift, -1.5 * lift * (s < 0 ? 1 : 0.3), 10 * s * lift);
      this.addOv('pawL', 1.5 * s * lift, -2 * lift, 0);
      this.addOv('pawR', -1.5 * s * lift, -2 * lift, 0);
    }
  }

  private updateRain(dt: number): void {
    const target = this.rainOn ? 1 : 0;
    if (this.rainT !== target) {
      const step = dt / (this.rainOn ? 0.6 : 0.45);
      this.rainT = this.rainOn ? Math.min(1, this.rainT + step) : Math.max(0, this.rainT - step);
      // Reach back for the hood while it moves.
      if (!ROD_POSES.has(this.pose) && this.basePose !== 'nap' && this.basePose !== 'sleep') {
        const env = Math.sin(Math.PI * this.rainT);
        this.addOv('pawR', -34 * env, -70 * env, 0);
      }
      if (!this.rainOn && this.rainT <= 0) {
        this.img.ghum.setVisible(false);
        this.earsFront = false;
        this.relayer();
      }
    }
    const g = this.img.ghum;
    if (g.visible) {
      const e = this.rainOn ? outBack(this.rainT, 2.2) : inOut(this.rainT);
      g.setAngle(105 * (1 - e));
      g.setScale(K * (0.3 + 0.7 * e));
      g.setAlpha(Math.min(1, this.rainT * 3));
    }
    // A drip from the tail tip every 0.7 s.
    const drip = this.img.drip;
    if (this.rainOn && this.rainT >= 1 && !reduceMotion()) {
      this.dripT = (this.dripT + dt) % 0.7;
      const f = this.dripT / 0.7;
      drip.setVisible(true);
      drip.y = -48 + (f < 0.25 ? 0 : (f - 0.25) * (f - 0.25) * 90);
      drip.setAlpha(f < 0.25 ? f * 3.2 : Math.max(0, 1 - (f - 0.25) * 2.2));
      drip.setScale(K * (f < 0.25 ? 0.3 + f * 1.3 : 0.62));
    } else drip.setVisible(false);
  }

  private updateDoko(dt: number, rm: boolean): void {
    // Landing detection (walk hops) for the doko bounce + alternating feet.
    const iy = this.inner.y;
    if (this.walking) {
      const dy = iy - this.prevInnerY;
      if (this.prevDy > 0 && dy <= 0) {
        this.dokoKick(34);
        this.stepFoot = -this.stepFoot;
      }
      this.prevDy = dy;
    } else this.prevDy = 0;
    this.prevInnerY = iy;
    // 2-frame lag behind the hop.
    this.lagBuf[this.lagIdx] = iy;
    this.lagIdx = (this.lagIdx + 1) % 3;
    const lag = rm ? 0 : this.lagBuf[this.lagIdx] - iy;
    // Spring bounce.
    const acc = -420 * this.dokoOff - 15 * this.dokoVel;
    this.dokoVel += acc * dt;
    this.dokoOff += this.dokoVel * dt;
    if (rm) this.dokoOff = 0;
    this.addOv('doko', 0, lag + this.dokoOff, lag * 0.8 + this.dokoOff * 0.6);
    // Ears flop a touch with the hop.
    this.addOv('earL', 0, 0, -lag * 1.6);
    this.addOv('earR', 0, 0, lag * 1.6);
    // Item pops (easeOutBack).
    for (let i = 0; i < 6; i++) {
      if (this.popT[i] < 1) {
        this.popT[i] = Math.min(1, this.popT[i] + dt / 0.38);
        const im = i < 5 ? this.slots[i] : this.img.scale;
        const s = outBack(this.popT[i], 2.4);
        im.setScale(K * Math.max(0.01, s), K * Math.max(0.01, 0.4 + 0.6 * s));
      }
    }
    // Moon Scale glow: alpha 0.3, 3 s pulse.
    if (this.scaleOn) {
      const g = this.img.dokoGlow;
      g.setAlpha(0.3 * (0.65 + 0.35 * Math.sin((this.t * Math.PI * 2) / 3)));
    }
  }

  private updateFx(dt: number): void {
    const f = this.facing;
    // "!" / "?" puff.
    if (this.puffT >= 0) {
      this.puffT += dt;
      const t = this.puffT;
      const im = this.puffKind === 'bang' ? this.fx.bang : this.fx.q;
      const life = this.puffKind === 'bang' ? 0.75 : 1.7;
      const s = outBack(seg(t, 0, 0.22), 2.6);
      im.setVisible(true);
      im.setPosition(f * 26, -124 - 6 * seg(t, 0, life) + this.inner.y);
      im.setScale(K * s);
      im.setAlpha(1 - seg(t, life - 0.25, life));
      if (t >= life) {
        im.setVisible(false);
        this.puffT = -1;
      }
    }
    // Sleep z's.
    if (this.basePose === 'sleep' && !reduceMotion()) {
      this.zT += dt;
      for (let i = 0; i < 2; i++) {
        const z = i === 0 ? this.fx.z1 : this.fx.z2;
        const p = ((this.zT + i * 1.3) % 2.6) / 2.6;
        z.setVisible(true);
        z.setPosition(f * (14 + p * 18 + Math.sin(p * 6) * 3), -72 - p * 36);
        z.setScale(K * (0.55 + 0.6 * p));
        z.setAlpha(Math.sin(p * Math.PI) * 0.9);
      }
    }
    // Blissful: floating hearts.
    if (this.expression === 'blissful' && !reduceMotion() && this.basePose !== 'sleep') {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = rnd(1.4, 2.2);
        const w = this.worldOf(16, -100);
        heartBurst(this.scene, w.x, w.y, 1, this.depth + 2);
      }
    }
  }

  // -------------------------------------------------------------------------

  /** Write pose + overlays to the display objects. */
  private writeParts(): void {
    const c = this.cur;
    const o = this.ov;
    const im = this.img;
    this.setP(im.earL, 'earL');
    this.setP(im.earR, 'earR');
    this.setP(im.pawL, 'pawL');
    this.setP(im.pawR, 'pawR');
    this.setP(im.footL, 'footL');
    this.setP(im.footR, 'footR');
    this.setP(this.dokoC, 'doko');
    this.setP(this.pc, 'pc');
    this.pc.setScale(c[I.pcs] + o[I.pcs], c[I.pcs + 1] + o[I.pcs + 1]);
    this.setP(this.rodC, 'rod');
    this.setP(im.book, 'book');
    this.setP(im.held, 'held');
    this.rodC.setVisible(ROD_POSES.has(this.pose));
    im.book.setVisible(this.basePose === 'read');
    const napK = this.basePose === 'nap' ? 0.8 : 1;
    if (this.dokoC.scaleX !== napK) this.dokoC.setScale(napK);
    im.namlo.setVisible(this.basePose !== 'nap');

    // Face.
    const bp = this.basePose;
    const closedPose = bp === 'sleep' || bp === 'nap';
    let eyes = this.eyeOverride ?? (closedPose ? 'closed' : EYES_FOR[this.expression]);
    if (this.blinkClosed && (eyes === 'open' || eyes === 'round' || eyes === 'sparkle' || eyes === 'half')) eyes = 'blink';
    this.swapPart('eyes', EYE_KEYS[eyes] ?? 'hero_eyes_open');
    const mouth = this.mouthOverride ?? (closedPose ? 'small' : bp === 'eat' ? 'munch' : MOUTH_FOR[this.expression]);
    this.swapPart('mouth', MOUTH_KEYS[mouth] ?? 'hero_mouth_w');
    const munching = bp === 'eat' || this.expression === 'munching';
    this.swapPart('muzzle', munching && Math.sin(this.munchT * Math.PI * 2 * 2.8) > -0.2 ? 'hero_muzzle_puff' : 'hero_muzzle');
    const eyesIm = im.eyes;
    eyesIm.setPosition(3 + this.eyeX, -60 + this.eyeY);
    this.faceC.setPosition(this.eyeX * 0.45, this.eyeY * 0.3);
    im.blushL.setScale(K * this.blushK);
    im.blushR.setScale(K * this.blushK);
  }

  private setP(obj: Img | Box, ch: ChName): void {
    const i = I[ch];
    obj.setPosition(this.cur[i] + this.ov[i], this.cur[i + 1] + this.ov[i + 1]);
    obj.angle = this.cur[i + 2] + this.ov[i + 2];
  }

  private refreshSlots(): void {
    for (let i = 0; i < 5; i++) {
      const vis = i < this.nItems;
      const s = this.slots[i];
      if (vis && !s.visible && this.popT[i] >= 1) s.setScale(K);
      s.setVisible(vis);
      if (vis && this.popT[i] >= 1) s.setScale(K);
    }
  }

  private dokoKick(v: number): void {
    this.dokoVel += v;
  }

  private updateHeldVisibility(): void {
    const show = !!this.heldKey && (this.basePose === 'hold' || this.basePose === 'eat');
    const h = this.img.held;
    h.setVisible(show);
    if (show) {
      const fit = (h.getData('fitScale') as number | undefined) ?? K;
      h.setScale(fit * (this.basePose === 'eat' ? 22 / 30 : 1));
    }
  }

  /** Re-stack parts for rain (ears in front of the ghum brim) and nap (doko hugged on the tummy). */
  private relayer(): void {
    const im = this.img;
    const nap = this.basePose === 'nap';
    const feetFront = SITTING.has(this.basePose);
    if (this.layered && this.earsFront === this.layerEars && nap === this.napLayer && feetFront === this.layerFeet) return;
    this.layered = true;
    this.layerEars = this.earsFront;
    this.napLayer = nap;
    this.layerFeet = feetFront;
    const order: (Img | Box)[] = [];
    if (!nap) order.push(this.dokoC);
    if (!this.earsFront) order.push(im.earFlower, im.earL, im.earR);
    if (!feetFront) order.push(im.footL, im.footR);
    order.push(im.body);
    if (feetFront) order.push(im.footL, im.footR);
    order.push(im.namlo, this.faceC);
    if (nap) order.push(this.dokoC);
    order.push(im.held, im.book, this.rodC, im.pluck, im.pawL, im.pawR, im.ghum);
    if (this.earsFront) order.push(im.earFlower, im.earL, im.earR);
    order.push(im.drip);
    for (const o of order) this.pc.bringToTop(o);
  }

  private showPuff(kind: 'bang' | 'q'): void {
    this.fx.bang.setVisible(false);
    this.fx.q.setVisible(false);
    this.puffKind = kind;
    this.puffT = 0;
  }

  /** World position of a local offset from the feet (facing applied). */
  private worldOf(lx: number, ly: number): { x: number; y: number } {
    this.getWorldTransformMatrix(this.tm, this.tp);
    this.tm.transformPoint(lx * this.facing, ly, this.pt);
    return { x: this.pt.x, y: this.pt.y };
  }

  /** Sparkles at a part (its origin + a local offset), in world space. */
  private burstAt(obj: Img | Box, lx: number, ly: number, count: number, color: string): void {
    if (reduceMotion()) return;
    obj.getWorldTransformMatrix(this.tm, this.tp);
    const sx = obj instanceof Phaser.GameObjects.Image ? ART_SCALE : 1;
    this.tm.transformPoint(lx * sx, ly * sx, this.pt);
    sparkleBurst(this.scene, this.pt.x, this.pt.y, { count, color, depth: this.depth + 2, spread: 0.45 });
  }

  /** Content tier+: little hum notes after the eep. */
  private floatNote(i: number): void {
    if (reduceMotion()) return;
    const w = this.worldOf(24 + i * 8, -104 - i * 6);
    const n = this.scene.add.image(w.x, w.y, 'note').setScale(0.6 * K).setDepth(this.depth + 2);
    n.setTint(hexToInt(i === 0 ? A['gurans-deep'] : mix(P.lavender, P.ink, 0.25)));
    n.setAlpha(0);
    this.scene.tweens.add({
      targets: n,
      y: w.y - 34,
      x: w.x + this.facing * 14,
      alpha: { from: 1, to: 0 },
      scale: 0.75 * K,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => n.destroy(),
    });
  }
}

const EYE_KEYS: Record<string, string> = {
  open: 'hero_eyes_open',
  blink: 'hero_eyes_blink',
  happy: 'hero_eyes_happy',
  closed: 'hero_eyes_closed',
  half: 'hero_eyes_half',
  round: 'hero_eyes_round',
  sparkle: 'hero_eyes_sparkle',
};
const MOUTH_KEYS: Record<string, string> = {
  w: 'hero_mouth_w',
  smile: 'hero_mouth_smile',
  o: 'hero_mouth_o',
  munch: 'hero_mouth_munch',
  small: 'hero_mouth_small',
};
