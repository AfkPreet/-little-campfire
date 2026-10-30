/**
 * CampfireProp (WORLD 3.2): ring of 7 round stones + 3 crossed logs, lively
 * layered flames (always bright, never relit), embers, fire-lit stone rims
 * and a big additive warm light pool on the ground + air scaled by
 * l.warmLight. lightPoolAt(x) gives other props/actors their warmth.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import type { ResolvedLight } from '@/fx/lighting';
import { embers } from '@/fx/particles';
import { ART_SCALE } from '@/core/layout';
import { P, hexToInt, mix } from '@/palette';
import { FIRE, pimg } from '@/art/props-geo';
import { EMBER_INT, GLOW_INT, Highlight, type Lightable, glowSprite, registerFire, unregisterFire, wind } from './props-common';

type Img = Phaser.GameObjects.Image;

interface Flame {
  img: Img;
  sx: number;
  sy: number;
  speed: number;
  phase: number;
  lean: number;
}

/** Reach of the warm pool (logical px either side). */
const REACH = 330;
const POOL_INT = hexToInt(mix(P.ember, P.glow, 0.45));

export class CampfireProp implements Lightable {
  readonly x: number;
  private readonly gy: number;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly stones: Img[];
  private readonly rim: Img;
  private readonly flames: Flame[] = [];
  private readonly halo: Img;
  private readonly poolGround: Img;
  private readonly poolAir: Img;
  private readonly poolCore: Img;
  private readonly em: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly hl: Highlight;
  private warm = 0;
  private flicker = 1;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    this.scene = scene;
    this.x = x;
    this.gy = groundY;
    this.root = scene.add.container(x, groundY).setDepth(DEPTH.props + 1);

    const sil = pimg(scene, 'prop_fire_sil').setVisible(false);
    const back = pimg(scene, 'prop_fire_back');
    const logs = pimg(scene, 'prop_fire_logs');
    this.halo = glowSprite(scene, 0, FIRE.flameY - 24, 120, 110, GLOW_INT);
    this.root.add([sil, back, logs, this.halo]);

    // Flames, back to front: two outer tongues, the outer body, mid, core.
    const base = 1 / ART_SCALE;
    const fy = FIRE.flameY;
    const spec: [string, number, number, number, number, number, number][] = [
      // key, dx, sx, sy, speed, phase, lean
      ['prop_flame_tongue', -15, 0.85, 0.8, 5.3, 0.4, -6],
      ['prop_flame_tongue', 15, -0.8, 0.9, 4.7, 2.1, 6],
      ['prop_flame_outer', 0, 1, 1, 3.9, 0, 0],
      ['prop_flame_mid', 1, 1, 1, 5.1, 1.3, 2],
      ['prop_flame_core', 0, 1, 1, 6.3, 2.6, 0],
    ];
    for (const [key, dx, sx, sy, speed, phase, lean] of spec) {
      const img = pimg(scene, key, dx, fy);
      img.setScale(base * sx, base * sy);
      this.root.add(img);
      this.flames.push({ img, sx: base * sx, sy: base * sy, speed, phase, lean });
    }

    const front = pimg(scene, 'prop_fire_front');
    this.rim = pimg(scene, 'prop_fire_rim').setBlendMode(Phaser.BlendModes.ADD).setTint(EMBER_INT).setAlpha(0.3);
    this.root.add([front, this.rim]);
    this.stones = [back, logs, front];

    this.hl = new Highlight(scene, sil, 112, 64, this.root);

    // Warm light pool: ground ellipse + soft air glow + a hot core.
    this.poolGround = glowSprite(scene, x, groundY - 6, REACH * 2, 120, POOL_INT, DEPTH.light);
    this.poolAir = glowSprite(scene, x, groundY - 70, 380, 300, EMBER_INT, DEPTH.light);
    this.poolCore = glowSprite(scene, x, groundY + FIRE.flameY - 18, 150, 130, GLOW_INT, DEPTH.light);

    this.em = embers(scene, x, groundY + FIRE.flameY - 26, DEPTH.fx);
    registerFire(this);
  }

  setLight(l: ResolvedLight): void {
    this.warm = l.warmLight;
    // Stones and logs take the scene light, warmed strongly by their own fire.
    const t = hexToInt(mix(l.hex.actor, mix(P.glow, P.cream, 0.35), Math.min(0.32, 0.08 + l.warmLight * 0.3)));
    for (const s of this.stones) s.setTint(t);
    this.applyPool();
  }

  private applyPool(): void {
    const w = this.warm;
    const f = this.flicker;
    this.poolGround.setAlpha(w * 0.75 * f);
    this.poolAir.setAlpha(w * 0.32 * f);
    this.poolCore.setAlpha((0.08 + w * 0.26) * f);
    this.halo.setAlpha((0.12 + w * 0.16) * f);
    this.rim.setAlpha((0.2 + w * 0.42) * f);
  }

  setHighlight(on: boolean): void {
    this.hl.set(on);
  }

  hitArea(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 62, this.gy - 96, 124, 110);
  }

  lightPoolAt(x: number): number {
    const d = Math.abs(x - this.x) / REACH;
    if (d >= 1) return 0;
    return (1 - d * d) * (0.88 + 0.12 * this.flicker);
  }

  update(time: number, _delta: number): void {
    const t = time / 1000;
    const wd = wind(time);
    const lean = wd.base * 5 + wd.gust * 9;
    for (const f of this.flames) {
      const a = Math.sin(t * f.speed + f.phase);
      const b = Math.sin(t * f.speed * 1.7 + f.phase * 2.3);
      f.img.setScale(f.sx * (1 + 0.06 * b), f.sy * (1 + 0.1 * a + 0.04 * b));
      f.img.angle = f.lean + lean + a * 3;
    }
    this.flicker = 0.9 + 0.06 * Math.sin(t * 9.3) + 0.04 * Math.sin(t * 15.7 + 1.1);
    this.applyPool();
  }

  destroy(): void {
    unregisterFire(this);
    this.hl.destroy();
    this.em.destroy();
    this.poolGround.destroy();
    this.poolAir.destroy();
    this.poolCore.destroy();
    this.root.destroy();
    void this.scene;
  }
}
