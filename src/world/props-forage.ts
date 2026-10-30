/**
 * ForageSpotProp (WORLD 7.4) and ScaleSparkle (WORLD 7.8). Each spot is a base
 * plant + a separate items layer (berries, caps, burrs, leaf tops), so picked
 * simply hides the items. The moon spot is a bud by day and an open white
 * truss with a fish-glow halo at night.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import type { ForageSpotId } from '@/data/ids';
import type { ResolvedLight } from '@/fx/lighting';
import { EASE } from '@/fx/juice';
import { ART_SCALE } from '@/core/layout';
import { A, P, hexToInt, mix } from '@/palette';
import { AINSELU_BERRIES, CHYAU_CAPS3, CHYAU_CAPS6, KATUS_BURRS, MOON_TRUSS, SISNU_TOPS, pimg } from '@/art/props-geo';
import { Highlight, type Lightable, glowSprite, liftTint, warmTint, wind } from './props-common';

type Img = Phaser.GameObjects.Image;
type Kind = 'katus' | 'sisnu' | 'ainselu' | 'log' | 'moon';
export type ForageState = 'ready' | 'picked' | 'hidden' | 'bud' | 'open';

const KIND: Record<ForageSpotId, Kind> = {
  nut_tree: 'katus',
  herb_patch: 'sisnu',
  berry_a: 'ainselu',
  berry_b: 'ainselu',
  log_a: 'log',
  log_b: 'log',
  moon_spot: 'moon',
};

/** Katus crown base (prop-local y); crown + burrs textures anchor here. */
const CROWN_Y = -50;
const FISH_GLOW = hexToInt(A['fish-glow']);
const SCALE_GLOW = hexToInt(A['scale-glow']);

/** Hit sizes per kind: half-width, height. */
const HIT: Record<Kind, [number, number]> = {
  katus: [60, 160],
  sisnu: [36, 64],
  ainselu: [54, 72],
  log: [56, 64],
  moon: [50, 96],
};

export class ForageSpotProp implements Lightable {
  readonly x: number;
  readonly spot: ForageSpotId;
  private readonly kind: Kind;
  private readonly gy: number;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  /** Base plant parts (tinted, swaying). */
  private readonly parts: Img[] = [];
  /** Parts that sway with the wind (crowns, leaf tops). */
  private readonly sway: Img[] = [];
  private items: Img;
  private items6: Img | null = null;
  private bud: Img | null = null;
  private halo: Img | null = null;
  private haloAir: Img | null = null;
  private readonly hl: Highlight;
  private state: ForageState = 'ready';
  private rain = false;
  private picking = false;
  private night = 0;
  private phase: number;

  constructor(scene: Phaser.Scene, spot: ForageSpotId, x: number, groundY: number) {
    this.scene = scene;
    this.spot = spot;
    this.kind = KIND[spot];
    this.x = x;
    this.gy = groundY;
    this.phase = (x % 97) / 15;
    this.root = scene.add.container(x, groundY).setDepth(DEPTH.props);
    let hlTarget: Img;
    let hw = 100;
    let hh = 80;

    switch (this.kind) {
      case 'katus': {
        const trunk = pimg(scene, 'prop_katus_trunk');
        const crown = pimg(scene, 'prop_katus_crown', 0, CROWN_Y);
        this.items = pimg(scene, 'prop_katus_burrs', 0, CROWN_Y);
        this.root.add([trunk, crown, this.items]);
        this.parts.push(trunk, crown);
        this.sway.push(crown, this.items);
        hlTarget = crown;
        hw = 130;
        hh = 110;
        break;
      }
      case 'sisnu': {
        const base = pimg(scene, 'prop_sisnu_base');
        this.items = pimg(scene, 'prop_sisnu_tops');
        this.root.add([base, this.items]);
        this.parts.push(base);
        this.sway.push(this.items);
        hlTarget = base;
        hw = 80;
        hh = 40;
        break;
      }
      case 'ainselu': {
        const bush = pimg(scene, 'prop_ainselu_bush');
        this.items = pimg(scene, 'prop_ainselu_berries');
        this.root.add([bush, this.items]);
        this.parts.push(bush);
        this.sway.push(bush, this.items);
        hlTarget = bush;
        hw = 124;
        hh = 76;
        break;
      }
      case 'log': {
        const log = pimg(scene, 'prop_log');
        this.items = pimg(scene, 'prop_log_caps3');
        this.items6 = pimg(scene, 'prop_log_caps6').setVisible(false);
        this.root.add([log, this.items, this.items6]);
        this.parts.push(log);
        hlTarget = log;
        hw = 120;
        hh = 48;
        break;
      }
      case 'moon': {
        this.haloAir = glowSprite(scene, MOON_TRUSS[0], MOON_TRUSS[1], 130, 120, FISH_GLOW);
        const bush = pimg(scene, 'prop_moon_bush');
        this.bud = pimg(scene, 'prop_moon_bud');
        this.items = pimg(scene, 'prop_moon_truss');
        this.halo = glowSprite(scene, MOON_TRUSS[0], MOON_TRUSS[1] + 4, 70, 64, SCALE_GLOW);
        this.root.add([this.haloAir, bush, this.bud, this.items, this.halo]);
        this.parts.push(bush);
        this.sway.push(this.bud, this.items);
        hlTarget = bush;
        hw = 116;
        hh = 92;
        break;
      }
    }
    this.hl = new Highlight(scene, hlTarget, hw, hh);
    this.setState(this.kind === 'moon' ? 'bud' : 'ready');
  }

  setState(s: ForageState, rainBonus?: boolean): void {
    this.state = s;
    if (rainBonus !== undefined) this.rain = rainBonus;
    this.root.setVisible(s !== 'hidden');
    if (this.kind === 'moon') {
      const open = s === 'open' || s === 'ready';
      this.bud!.setVisible(s === 'bud');
      if (!this.picking) this.items.setVisible(open);
      this.halo!.setVisible(open);
      this.haloAir!.setVisible(open);
      return;
    }
    if (this.picking) return;
    const ready = s === 'ready' || s === 'open';
    if (this.items6) {
      this.items6.setVisible(ready && this.rain);
      this.items.setVisible(ready && !this.rain);
    } else this.items.setVisible(ready);
  }

  private itemPoints(): [number, number][] {
    switch (this.kind) {
      case 'katus':
        return KATUS_BURRS;
      case 'sisnu':
        return SISNU_TOPS;
      case 'ainselu':
        return AINSELU_BERRIES;
      case 'log':
        return (this.rain ? CHYAU_CAPS6 : CHYAU_CAPS3).map(([x, y]) => [x, y] as [number, number]);
      case 'moon':
        return [MOON_TRUSS];
    }
  }

  pickAnim(): { x: number; y: number }[] {
    const pts = this.itemPoints().map(([px, py]) => ({ x: this.x + px, y: this.gy + py }));
    const base = 1 / ART_SCALE;
    // Pluck wobble: the plant squashes and springs back.
    for (const p of this.parts) {
      this.scene.tweens.killTweensOf(p);
      p.setScale(base * 1.08, base * 0.9);
      this.scene.tweens.add({ targets: p, scaleX: base, scaleY: base, duration: 480, ease: EASE.settle });
    }
    // The items pop off.
    const shown = this.items6?.visible ? this.items6 : this.items;
    if (shown.visible) {
      this.picking = true;
      this.scene.tweens.killTweensOf(shown);
      this.scene.tweens.add({
        targets: shown,
        alpha: 0,
        scaleX: base * 1.12,
        scaleY: base * 1.12,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => {
          shown.setAlpha(1).setScale(base);
          this.picking = false;
          this.setState(this.state);
        },
      });
    }
    return pts;
  }

  setHighlight(on: boolean): void {
    this.hl.set(on);
  }

  hitArea(): Phaser.Geom.Rectangle {
    const [hw, h] = HIT[this.kind];
    const w = Math.max(56, hw * 2);
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.gy - h, w, h + 10);
  }

  setLight(l: ResolvedLight): void {
    this.night = l.night;
    const t = warmTint(l, this.x);
    for (const p of this.parts) p.setTint(t);
    if (this.bud) this.bud.setTint(t);
    if (this.kind === 'moon') {
      // The white truss glows: it keeps most of its own colour at night.
      this.items.setTint(liftTint(l, 0.55 + l.night * 0.3));
      this.halo!.setBlendMode(Phaser.BlendModes.ADD);
    } else {
      this.items.setTint(t);
      this.items6?.setTint(t);
    }
  }

  update(time: number, _delta: number): void {
    if (this.state === 'hidden') return;
    const t = time / 1000;
    const w = wind(time);
    const k = this.kind === 'katus' ? 1.3 : this.kind === 'log' ? 0 : 2.2;
    if (k > 0) {
      const a = (w.base * 1.2 + w.gust * 1.6 + Math.sin(t * 1.3 + this.phase) * 0.35) * k;
      for (const s of this.sway) s.angle = a;
    }
    if (this.halo && this.halo.visible) {
      const p = 0.5 + 0.5 * Math.sin(t * ((Math.PI * 2) / 2.5) + this.phase);
      const n = 0.25 + this.night * 0.75;
      this.halo.setAlpha((0.45 + 0.4 * p) * n);
      this.haloAir!.setAlpha((0.18 + 0.2 * p) * n);
    }
  }

  destroy(): void {
    this.hl.destroy();
    this.scene.tweens.killTweensOf([...this.parts, this.items]);
    if (this.items6) this.scene.tweens.killTweensOf(this.items6);
    this.root.destroy();
  }
}

// ---------------------------------------------------------------------------
// Moon Scale on the shore pebbles (WORLD 7.8): soft pulse (alpha 0.6-1.0,
// 2.5 s) and a 4-point twinkle every 3 s.
// ---------------------------------------------------------------------------

export class ScaleSparkle implements Lightable {
  readonly x: number;
  private readonly gy: number;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly scale: Img;
  private readonly halo: Img;
  private readonly twinkle: Img;
  private shown = true;
  private busy = false;
  private night = 0;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    this.scene = scene;
    this.x = x;
    this.gy = groundY;
    this.root = scene.add.container(x, groundY).setDepth(DEPTH.props + 2);
    this.halo = glowSprite(scene, 0, -8, 70, 46, SCALE_GLOW);
    this.scale = pimg(scene, 'prop_scale');
    this.twinkle = pimg(scene, 'sparkle', 6, -16).setOrigin(0.5).setTint(hexToInt(mix(P.cream, A['fish-glow'], 0.4))).setAlpha(0);
    this.root.add([this.halo, this.scale, this.twinkle]);
  }

  setVisible(v: boolean): void {
    if (this.busy) return;
    this.shown = v;
    this.root.setVisible(v);
  }

  pickUp(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.shown || this.busy) return resolve();
      this.busy = true;
      const base = 1 / ART_SCALE;
      this.scale.setScale(base * 1.2, base * 0.82);
      this.scene.tweens.chain({
        targets: this.scale,
        tweens: [
          { scaleX: base * 0.9, scaleY: base * 1.18, y: -26, duration: 260, ease: 'Quad.easeOut' },
          { scaleX: base * 0.2, scaleY: base * 0.2, y: -44, alpha: 0, duration: 300, ease: 'Quad.easeIn' },
        ],
        onComplete: () => {
          this.busy = false;
          this.scale.setPosition(0, 0).setScale(base).setAlpha(1);
          this.setVisible(false);
          resolve();
        },
      });
      this.scene.tweens.add({ targets: this.halo, alpha: 0, duration: 500 });
    });
  }

  hitArea(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 32, this.gy - 52, 64, 66);
  }

  setLight(l: ResolvedLight): void {
    this.night = l.night;
    this.scale.setTint(liftTint(l, 0.45 + l.night * 0.4));
    this.halo.setBlendMode(l.night > 0.4 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
  }

  update(time: number, _delta: number): void {
    if (!this.shown || this.busy) return;
    const t = time / 1000;
    const p = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 2.5);
    this.scale.setAlpha(0.6 + 0.4 * p);
    this.halo.setAlpha((0.35 + 0.35 * p) * (0.6 + this.night * 0.6));
    // Twinkle: a quick 4-point star pop every 3 s.
    const c = (t % 3) / 3;
    const k = c < 0.16 ? Math.sin((c / 0.16) * Math.PI) : 0;
    this.twinkle.setAlpha(k).setScale((0.25 + 0.35 * k) / ART_SCALE * 2).setAngle(c * 90);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.scale, this.halo]);
    this.root.destroy();
  }
}
