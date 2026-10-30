/**
 * TentProp (WORLD 7.1): one per tent spot. States: hidden -> spot (glowing
 * dotted outline) -> flat (unfolded + 4 glowing pegs) -> pitched (standing,
 * springs up with squash & stretch). Fern Tent, Monsoon Dome, Tin-Roof Cabin.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { CAMP } from '@/data/camp';
import type { TentId } from '@/data/ids';
import type { ResolvedLight } from '@/fx/lighting';
import { EASE } from '@/fx/juice';
import { ART_SCALE } from '@/core/layout';
import { P, hexToInt, mix } from '@/palette';
import { FLAT, TENT_GEO, pimg } from '@/art/props-geo';
import { GLOW_INT, Highlight, type Lightable, glowSprite, warmTint } from './props-common';

type Img = Phaser.GameObjects.Image;
export type TentState = 'hidden' | 'spot' | 'flat' | 'pitched';

const SPOT_TINT = hexToInt(mix(P.cream, P.glow, 0.35));
const PEG_GLOW = hexToInt(mix(P.glow, P.butter, 0.4));
/** Doorway/window lamp light: warm, never white. */
const LAMP_INT = hexToInt(mix(P.glow, P.ember, 0.3));
/** How far a peg sinks when tapped in. */
const PEG_SINK = 11;

export class TentProp implements Lightable {
  readonly x: number;
  private readonly gy: number;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly spot: Img;
  private readonly flat: Img;
  private readonly tent: Img;
  private readonly door: Img;
  private readonly win: Img;
  private readonly pegs: Img[] = [];
  private readonly pegGlows: Img[] = [];
  private readonly pool: Img;
  private readonly winPool: Img;
  private readonly hlTent: Highlight;
  private readonly hlFlat: Highlight;

  private state: TentState = 'hidden';
  private type: TentId = 'leaf_tent';
  private pegIn = [false, false, false, false];
  private highlighted = false;
  private doorGlow = 0;
  private night = 0;
  private light: ResolvedLight | null = null;
  private springing = false;
  private destroyed = false;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    this.scene = scene;
    this.x = x;
    this.gy = groundY;
    this.root = scene.add.container(x, groundY).setDepth(DEPTH.props - 2);

    this.spot = pimg(scene, 'prop_tent_spot').setTint(SPOT_TINT);
    this.flat = pimg(scene, `prop_tent_${this.type}_flat`);
    this.tent = pimg(scene, `prop_tent_${this.type}`);
    this.door = pimg(scene, `prop_tent_${this.type}_door`).setBlendMode(Phaser.BlendModes.ADD).setTint(LAMP_INT).setAlpha(0);
    this.win = pimg(scene, 'prop_tent_cabin_kit_win').setBlendMode(Phaser.BlendModes.ADD).setTint(LAMP_INT).setAlpha(0);
    this.root.add([this.spot, this.flat, this.tent, this.door, this.win]);

    CAMP.pegs.forEach((p) => {
      const g = glowSprite(scene, p.dx, -20, 30, 30, PEG_GLOW, undefined, 'glowSmall');
      const peg = pimg(scene, 'prop_peg', p.dx, 0);
      this.pegGlows.push(g);
      this.pegs.push(peg);
      this.root.add([g, peg]);
    });

    this.hlTent = new Highlight(scene, this.tent, 180, 150);
    this.hlFlat = new Highlight(scene, this.flat, FLAT.w, FLAT.h);

    // Warm doorway spill on the ground + cabin window halo (additive, above props).
    this.pool = glowSprite(scene, x, groundY - 4, 150, 46, GLOW_INT, DEPTH.light);
    this.winPool = glowSprite(scene, x, groundY - 85, 120, 110, GLOW_INT, DEPTH.light);

    this.applyState();
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  setState(s: TentState, type?: TentId): void {
    const typeChanged = !!type && type !== this.type;
    if (s === this.state && !typeChanged) return;
    if (typeChanged) this.setTexturesFor(type!);
    if (s === 'flat' && (this.state !== 'flat' || typeChanged)) this.pegIn = [false, false, false, false];
    if (s === 'pitched') this.pegIn = [true, true, true, true];
    this.state = s;
    this.applyState();
  }

  private setTexturesFor(type: TentId): void {
    this.type = type;
    this.tent.setTexture(`prop_tent_${type}`);
    this.flat.setTexture(`prop_tent_${type}_flat`);
    this.door.setTexture(`prop_tent_${type}_door`);
    const g = TENT_GEO[type];
    // Spot outline width follows the tent size (the dots ring sits at r 98).
    this.spot.setScale(g.spot / 98 / ART_SCALE, 1 / ART_SCALE);
    this.hlTent.sync();
    this.hlFlat.sync();
  }

  private applyState(): void {
    const s = this.state;
    this.root.setVisible(s !== 'hidden');
    this.spot.setVisible(s === 'spot');
    this.flat.setVisible(s === 'flat');
    const standing = s === 'pitched' || this.springing;
    this.tent.setVisible(standing);
    this.door.setVisible(standing);
    this.win.setVisible(standing && this.type === 'cabin_kit');
    this.pegs.forEach((p, i) => {
      p.setVisible(s === 'flat');
      p.y = this.pegIn[i] ? PEG_SINK : 0;
      this.pegGlows[i].setVisible(s === 'flat' && !this.pegIn[i]);
    });
    if (!standing) {
      this.tent.setScale(1 / ART_SCALE);
      this.pool.setAlpha(0);
      this.winPool.setAlpha(0);
    }
    this.applyHighlight();
    this.applyGlow();
  }

  private applyHighlight(): void {
    const on = this.highlighted && !this.springing;
    this.hlTent.set(on && this.state === 'pitched');
    this.hlFlat.set(on && this.state === 'flat');
  }

  setType(type: TentId): void {
    if (type === this.type) return;
    this.setTexturesFor(type);
    this.applyState();
    if (this.state === 'pitched' && !this.springing) {
      const base = 1 / ART_SCALE;
      this.tent.setScale(base * 0.86, base * 1.12);
      this.scene.tweens.add({ targets: this.tent, scaleX: base, scaleY: base, duration: 520, ease: EASE.pop });
    }
  }

  // ---------------------------------------------------------------------------
  // Pegs + spring
  // ---------------------------------------------------------------------------

  pegPositions(): { x: number; y: number }[] {
    return CAMP.pegs.map((p) => ({ x: this.x + p.dx, y: this.gy }));
  }

  tapPeg(i: number): void {
    if (i < 0 || i > 3 || this.pegIn[i]) return;
    this.pegIn[i] = true;
    const peg = this.pegs[i];
    const glow = this.pegGlows[i];
    const base = 1 / ART_SCALE;
    if (this.state !== 'flat' || !this.root.visible) {
      peg.y = PEG_SINK;
      glow.setVisible(false);
      return;
    }
    // "tok": the peg squashes and sinks in; the glow pops away.
    this.scene.tweens.add({ targets: peg, y: PEG_SINK, duration: 150, ease: 'Quad.easeIn' });
    peg.setScale(base * 1.25, base * 0.78);
    this.scene.tweens.add({ targets: peg, scaleX: base, scaleY: base, duration: 320, delay: 120, ease: EASE.pop });
    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      scale: glow.scale * 1.8,
      duration: 260,
      onComplete: () => glow.setVisible(false).setScale(glow.scale / 1.8),
    });
    // Tiny nudge of the cloth.
    this.flat.setScale(base * 1.01, base * 0.97);
    this.scene.tweens.add({ targets: this.flat, scaleX: base, scaleY: base, duration: 260, ease: EASE.pop });
  }

  springUp(): Promise<void> {
    return new Promise((resolve) => {
      if (this.destroyed) return resolve();
      const base = 1 / ART_SCALE;
      this.springing = true;
      this.pegIn = [true, true, true, true];
      this.state = 'pitched';
      this.applyState();
      this.tent.setScale(base * 1.25, base * 0.1);
      this.door.setAlpha(0);
      this.flat.setVisible(true).setAlpha(1);
      this.scene.tweens.add({ targets: this.flat, alpha: 0, duration: 220, onComplete: () => this.flat.setVisible(false).setAlpha(1) });
      this.scene.tweens.chain({
        targets: this.tent,
        tweens: [
          { scaleX: base * 0.86, scaleY: base * 1.16, duration: 260, ease: 'Back.easeOut' },
          { scaleX: base * 1.07, scaleY: base * 0.93, duration: 150, ease: 'Sine.easeInOut' },
          { scaleX: base, scaleY: base, duration: 260, ease: EASE.pop },
        ],
        onComplete: () => {
          this.springing = false;
          if (this.destroyed) return resolve();
          this.applyState();
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  hangPoint(i: number): { x: number; y: number } {
    const pts = CAMP.tentHang[this.type];
    const p = pts[Math.max(0, Math.min(pts.length - 1, i))];
    return { x: this.x + p.dx, y: this.gy + p.dy };
  }

  dripEdge(): { x0: number; x1: number; y: number } {
    const d = TENT_GEO[this.type].drip;
    return { x0: this.x + d.x0, x1: this.x + d.x1, y: this.gy + d.dy };
  }

  doorPoint(): { x: number; y: number } {
    return { x: this.x + TENT_GEO[this.type].door.dx, y: this.gy };
  }

  hitArea(): Phaser.Geom.Rectangle {
    const g = TENT_GEO[this.type];
    if (this.state === 'pitched') return new Phaser.Geom.Rectangle(this.x - g.half, this.gy - g.top, g.half * 2, g.top + 12);
    const half = Math.max(g.spot, 100);
    return new Phaser.Geom.Rectangle(this.x - half, this.gy - 56, half * 2, 72);
  }

  // ---------------------------------------------------------------------------
  // Light
  // ---------------------------------------------------------------------------

  setDoorGlow(a: number): void {
    this.doorGlow = Phaser.Math.Clamp(a, 0, 1);
    this.applyGlow();
  }

  private applyGlow(): void {
    const standing = this.state === 'pitched' && this.root.visible;
    const d = standing ? this.doorGlow : 0;
    this.door.setAlpha(d * 0.62);
    const g = TENT_GEO[this.type];
    this.pool.setPosition(this.x + g.door.dx, this.gy - 2).setDisplaySize(g.door.w * 3.2, 44).setAlpha(d * 0.32);
    const cabin = standing && this.type === 'cabin_kit';
    const w = cabin ? Math.max(this.night, this.doorGlow) : 0;
    this.win.setAlpha(w * 0.66);
    this.winPool.setPosition(this.x + 44, this.gy - 85).setAlpha(w * 0.3);
  }

  setLight(l: ResolvedLight): void {
    this.light = l;
    this.night = l.night;
    const t = warmTint(l, this.x, 0.8);
    this.tent.setTint(t);
    this.flat.setTint(t);
    for (const p of this.pegs) p.setTint(t);
    for (const g of this.pegGlows) g.setBlendMode(l.night > 0.5 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    this.applyGlow();
  }

  setHighlight(on: boolean): void {
    if (on === this.highlighted) return;
    this.highlighted = on;
    this.applyHighlight();
    if (this.state === 'spot') this.spot.setAlpha(on ? 1 : 0.85);
  }

  update(time: number, _delta: number): void {
    if (this.state === 'hidden') return;
    const t = time / 1000;
    if (this.state === 'spot') {
      // Soft breathing outline (brighter when Tuki is near).
      const b = 0.5 + 0.5 * Math.sin(t * 2.2);
      this.spot.setAlpha(((this.highlighted ? 0.8 : 0.55) + b * 0.25) * (1 - this.night * 0.3));
    } else if (this.state === 'flat') {
      for (let i = 0; i < 4; i++) {
        const g = this.pegGlows[i];
        if (!g.visible || this.pegIn[i]) continue;
        g.setAlpha(0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3 + i * 0.9)));
      }
    } else if (this.state === 'pitched' && (this.doorGlow > 0.01 || this.night > 0.01)) {
      // A gentle lamp flicker inside.
      const f = 0.94 + 0.04 * Math.sin(t * 7.1) + 0.02 * Math.sin(t * 13.3);
      const d = this.doorGlow;
      this.door.setAlpha(d * 0.62 * f);
      if (this.win.visible) this.win.setAlpha(Math.max(this.night, d) * 0.66 * f);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.hlTent.destroy();
    this.hlFlat.destroy();
    this.scene.tweens.killTweensOf([this.tent, this.flat, ...this.pegs, ...this.pegGlows]);
    this.pool.destroy();
    this.winPool.destroy();
    this.root.destroy();
    void this.light;
  }
}
