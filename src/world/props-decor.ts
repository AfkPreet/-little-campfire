/**
 * DecorProp (WORLD 7.6): the 11 placed decor items and their behaviours.
 * Ground items stand ON (x, y); hang items hang FROM (x, y); Junkiri Lights
 * span (x, y) -> opts.to; the Shawl Hammock is centred between the two
 * rhododendron trunks (CAMP.twoTree) with (x, y) at the trunk-wrap height.
 * All motion comes from the shared wind (windAt) + gentle sines; no redraws.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { CAMP } from '@/data/camp';
import type { DecorId } from '@/data/ids';
import type { ResolvedLight } from '@/fx/lighting';
import { ART_SCALE } from '@/core/layout';
import { A, P, hexToInt, mix } from '@/palette';
import { BUNTING, CHIME, KLANTERN, LALTIN, SCOPE_TIP, pimg } from '@/art/props-geo';
import { GLOW_INT, type Lightable, glowSprite, liftTint, warmTint, wind } from './props-common';

type Img = Phaser.GameObjects.Image;
type Box = Phaser.GameObjects.Container;

const BULB_INTS = [GLOW_INT, hexToInt(mix(P.butter, P.cream, 0.3)), hexToInt(mix(P.glow, P.peach, 0.35))];
const FISH_GLOW = hexToInt(A['fish-glow']);
const WARM_RUG = mix(P.glow, P.peach, 0.35);
const JUTE = hexToInt(A.jute);
const JUTE_DARK = hexToInt(mix(A.jute, P.bark, 0.45));

/** Default span when Junkiri Lights have no second end yet (ghost preview). */
const SPAN_DEFAULT = 150;

interface Twinkle {
  img: Img;
  glow: Img;
  speed: number;
  phase: number;
}

export class DecorProp implements Lightable {
  readonly id: DecorId;
  readonly x: number;
  readonly y: number;
  onChime?: () => void;

  private readonly scene: Phaser.Scene;
  private readonly root: Box;
  /** Images that take the scene light tint. */
  private readonly lit: Img[] = [];
  /** World-space additive glows (destroyed with the prop). */
  private readonly glows: Img[] = [];
  private readonly hit: Phaser.Geom.Rectangle;
  private readonly phase: number;
  private light: ResolvedLight | null = null;
  private ghost = false;
  private night = 0;
  private warm = 0;

  // Per-item moving parts.
  private swing: Box | null = null;
  private plant: Img | null = null;
  private pennants: Img[] = [];
  private tubes: Img[] = [];
  private clapper: Img | null = null;
  private flame: Img | null = null;
  private glass: Img | null = null;
  private airGlow: Img | null = null;
  private groundGlow: Img | null = null;
  private bulbs: Twinkle[] = [];
  private shawl: Img | null = null;
  private star: Img | null = null;
  private starGlow: Img | null = null;
  private glint: Img | null = null;
  private rug: Img | null = null;
  private chimeCool = 0;
  private chimeAmp = 0;

  constructor(scene: Phaser.Scene, id: DecorId, x: number, y: number, opts?: { to?: { x: number; y: number } }) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.y = y;
    this.phase = ((x * 7 + y * 3) % 113) / 18;
    this.root = scene.add.container(x, y).setDepth(DEPTH.props + 3 + Math.max(0, (y - CAMP.groundY) / 100));
    switch (id) {
      case 'potted_flower':
        this.buildGeranium();
        break;
      case 'paper_lantern':
        this.buildLaltin();
        break;
      case 'floor_cushion':
        this.add(pimg(scene, 'prop_dec_pirka'));
        break;
      case 'bunting':
        this.buildBunting();
        break;
      case 'wind_chime':
        this.buildChime();
        break;
      case 'woven_rug':
        this.rug = this.add(pimg(scene, 'prop_dec_rug'));
        this.root.setDepth(DEPTH.props + 0.5);
        break;
      case 'string_lights':
        this.buildLights(opts?.to ?? { x: x + SPAN_DEFAULT, y });
        break;
      case 'bookshelf':
        this.add(pimg(scene, 'prop_dec_shelf'));
        break;
      case 'hammock':
        this.buildHammock();
        break;
      case 'telescope':
        this.buildScope();
        break;
      case 'guardian_lantern':
        this.buildKLantern();
        break;
    }
    this.hit = this.computeHit(opts?.to);
  }

  private add(img: Img, parent: Box = this.root): Img {
    parent.add(img);
    this.lit.push(img);
    return img;
  }

  private worldGlow(w: number, h: number, colour: number, key = 'glow'): Img {
    const g = glowSprite(this.scene, this.x, this.y, w, h, colour, DEPTH.light, key);
    this.glows.push(g);
    return g;
  }

  // ---------------------------------------------------------------------------
  // Builders
  // ---------------------------------------------------------------------------

  private buildGeranium(): void {
    this.add(pimg(this.scene, 'prop_dec_gtin'));
    // The plant nods from the soil line (its texture is anchored at its base).
    this.plant = this.add(pimg(this.scene, 'prop_dec_gplant', 0, -21));
  }

  private buildLaltin(): void {
    const s = this.scene;
    this.swing = s.add.container(0, 0);
    this.root.add(this.swing);
    this.add(pimg(s, 'prop_dec_laltin'), this.swing);
    this.glass = pimg(s, 'prop_dec_laltin_glass').setBlendMode(Phaser.BlendModes.ADD).setTint(GLOW_INT).setAlpha(0);
    this.flame = pimg(s, 'prop_dec_laltin_flame', 0, LALTIN.flameY);
    this.swing.add([this.glass, this.flame]);
    this.airGlow = this.worldGlow(150, 150, GLOW_INT);
    this.groundGlow = this.worldGlow(190, 40, hexToInt(mix(P.glow, P.ember, 0.3)));
  }

  private buildBunting(): void {
    const s = this.scene;
    this.add(pimg(s, 'prop_dec_bunting_line'));
    const { half, sag, n } = BUNTING;
    for (let i = 0; i < n; i++) {
      const px = -half + ((i + 0.5) / n) * half * 2;
      const py = sag * (1 - (px / half) * (px / half));
      const p = this.add(pimg(s, `prop_dec_pennant_${i % 3}`, px, py));
      this.pennants.push(p);
    }
  }

  private buildChime(): void {
    const s = this.scene;
    this.swing = s.add.container(0, 0);
    this.root.add(this.swing);
    this.add(pimg(s, 'prop_dec_chime_top'), this.swing);
    // Clapper first (behind the tubes, in the middle).
    this.clapper = this.add(pimg(s, 'prop_dec_chime_clap', 0, CHIME.discY + 3), this.swing);
    CHIME.lengths.forEach((_, i) => {
      const t = this.add(pimg(s, `prop_dec_chime_tube_${i}`, CHIME.xs[i], CHIME.discY + 2), this.swing!);
      this.tubes.push(t);
    });
    // Tubes in front of the clapper except the middle one.
    this.swing.bringToTop(this.tubes[0]);
    this.swing.bringToTop(this.tubes[4]);
  }

  private buildLights(to: { x: number; y: number }): void {
    const s = this.scene;
    const dx = to.x - this.x;
    const dy = to.y - this.y;
    const len = Math.hypot(dx, dy);
    const sag = Math.min(46, 14 + len * 0.12);
    const pt = (t: number): [number, number] => [dx * t, dy * t + sag * 4 * t * (1 - t)];
    // The wire: drawn once.
    const g = s.add.graphics();
    for (const [w, c] of [
      [2.6, JUTE_DARK],
      [1.2, JUTE],
    ] as const) {
      g.lineStyle(w, c, 1);
      g.beginPath();
      g.moveTo(0, 0);
      for (let i = 1; i <= 24; i++) {
        const [px, py] = pt(i / 24);
        g.lineTo(px, py);
      }
      g.strokePath();
    }
    this.root.add(g);
    const n = Math.max(4, Math.round(len / 22));
    for (let i = 0; i < n; i++) {
      const [bx, by] = pt((i + 0.5) / n);
      const img = this.add(pimg(s, 'prop_dec_bulb', bx, by - 1));
      img.angle = ((i * 37) % 11) - 5;
      const glow = glowSprite(s, this.x + bx, this.y + by + 9, 34, 34, BULB_INTS[i % 3], DEPTH.light, 'glowSmall');
      this.glows.push(glow);
      this.bulbs.push({ img, glow, speed: 1.1 + ((i * 53) % 17) / 10, phase: (i * 2.399) % (Math.PI * 2) });
    }
  }

  private buildHammock(): void {
    const s = this.scene;
    this.add(pimg(s, 'prop_dec_hammock_ropes'));
    this.shawl = this.add(pimg(s, 'prop_dec_hammock_shawl'));
  }

  private buildScope(): void {
    this.add(pimg(this.scene, 'prop_dec_scope'));
    this.glint = pimg(this.scene, 'sparkle', SCOPE_TIP[0], SCOPE_TIP[1]).setOrigin(0.5).setTint(hexToInt(P.cream)).setAlpha(0);
    this.root.add(this.glint);
  }

  private buildKLantern(): void {
    const s = this.scene;
    this.swing = s.add.container(0, 0);
    this.root.add(this.swing);
    this.add(pimg(s, 'prop_dec_klantern'), this.swing);
    this.star = pimg(s, 'prop_dec_klantern_star', 0, KLANTERN.starY);
    this.swing.add(this.star);
    this.starGlow = this.worldGlow(92, 92, FISH_GLOW);
    this.groundGlow = this.worldGlow(150, 34, FISH_GLOW);
  }

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  private computeHit(to?: { x: number; y: number }): Phaser.Geom.Rectangle {
    const M = 56;
    const box = (cx: number, top: number, w: number, h: number) => {
      const ww = Math.max(M, w);
      const hh = Math.max(M, h);
      return new Phaser.Geom.Rectangle(cx - ww / 2, top - (hh - h) / 2, ww, hh);
    };
    const { x, y } = this;
    switch (this.id) {
      case 'potted_flower':
        return box(x, y - 52, 44, 54);
      case 'floor_cushion':
        return box(x, y - 30, 56, 32);
      case 'woven_rug':
        return box(x, y - 18, 130, 34);
      case 'bookshelf':
        return box(x, y - 74, 66, 76);
      case 'telescope':
        return box(x, y - 74, 72, 76);
      case 'paper_lantern':
        return box(x, y, 30, LALTIN.h + 4);
      case 'guardian_lantern':
        return box(x, y, 40, KLANTERN.h + 6);
      case 'wind_chime':
        return box(x, y, 36, 70);
      case 'bunting':
        return box(x, y - 4, BUNTING.half * 2 + 8, 34);
      case 'hammock':
        return box(x, y - 8, 150, 72);
      case 'string_lights': {
        const ex = to?.x ?? x + SPAN_DEFAULT;
        const ey = to?.y ?? y;
        const x0 = Math.min(x, ex);
        const x1 = Math.max(x, ex);
        const y0 = Math.min(y, ey);
        const y1 = Math.max(y, ey) + 44;
        return box((x0 + x1) / 2, y0 - 6, x1 - x0 + 16, y1 - y0 + 6);
      }
    }
  }

  hitArea(): Phaser.Geom.Rectangle {
    return this.hit;
  }

  // ---------------------------------------------------------------------------
  // Light + ghost
  // ---------------------------------------------------------------------------

  setLight(l: ResolvedLight): void {
    this.light = l;
    this.night = l.night;
    this.warm = l.warmLight;
    const t = warmTint(l, this.x);
    for (const img of this.lit) img.setTint(t);
    if (this.rug) {
      // Radi colours warm up at night.
      const n = Math.max(l.night, l.warmLight * 0.6);
      this.rug.setTint(n > 0.02 ? hexToInt(mix(l.hex.actor, mix(WARM_RUG, P.cream, 0.4), Math.min(0.55, n * 0.5))) : t);
    }
    if (this.flame) this.flame.setTint(liftTint(l, 1));
    if (this.star) this.star.setTint(liftTint(l, 1));
    for (const b of this.bulbs) b.img.setTint(liftTint(l, l.night * 0.8));
  }

  setGhost(on: boolean): void {
    this.ghost = on;
    this.root.setAlpha(on ? 0.55 : 1);
    if (on) this.root.setDepth(DEPTH.fx - 1);
  }

  // ---------------------------------------------------------------------------
  // Behaviours
  // ---------------------------------------------------------------------------

  update(time: number, delta: number): void {
    const t = time / 1000;
    const w = wind(time);
    const gk = this.ghost ? 0.55 : 1;
    switch (this.id) {
      case 'potted_flower': {
        // Geranium nods.
        this.plant!.angle = Math.sin(t * 1.6 + this.phase) * 2.2 + w.base * 4 + w.gust * 7 * Math.sin(t * 5 + this.phase);
        break;
      }
      case 'paper_lantern': {
        const a = Math.sin(t * 1.25 + this.phase) * 2.5 + w.base * 3 + w.gust * 6 * Math.sin(t * 2.6);
        this.swing!.angle = a;
        const f = 0.9 + 0.06 * Math.sin(t * 8.3 + this.phase) + 0.04 * Math.sin(t * 13.1);
        const glow = Math.max(this.night, this.warm * 0.4);
        // Globe centre follows the swing.
        const r = (a * Math.PI) / 180;
        const gx = this.x - Math.sin(r) * LALTIN.globeY;
        const gy = this.y + Math.cos(r) * LALTIN.globeY;
        this.glass!.setAlpha(glow * 0.6 * f);
        this.flame!.setScale((1 / ART_SCALE) * (0.95 + 0.05 * f), (1 / ART_SCALE) * f);
        this.airGlow!.setPosition(gx, gy).setAlpha(glow * 0.55 * f * gk);
        this.groundGlow!.setPosition(gx, Math.max(gy + 40, CAMP.groundY + 2)).setAlpha(glow * 0.35 * f * gk * (this.y < CAMP.groundY - 260 ? 0 : 1));
        break;
      }
      case 'bunting': {
        const g = w.gust;
        for (let i = 0; i < this.pennants.length; i++) {
          const p = this.pennants[i];
          p.angle = Math.sin(t * 1.8 + i * 0.7) * 3 + w.base * 6 + g * 16 * Math.sin(t * 9 + i * 1.3);
          p.scaleY = (1 / ART_SCALE) * (1 - g * 0.12 * (0.5 + 0.5 * Math.sin(t * 11 + i)));
        }
        break;
      }
      case 'wind_chime': {
        const g = w.gust;
        this.chimeAmp += (g - this.chimeAmp) * Math.min(1, delta / 400);
        const amp = 2 + this.chimeAmp * 14;
        this.swing!.angle = Math.sin(t * 1.1 + this.phase) * 1.5 + w.base * 3;
        for (let i = 0; i < this.tubes.length; i++) this.tubes[i].angle = Math.sin(t * (3.1 + i * 0.37) + i) * amp * 0.6;
        this.clapper!.angle = Math.sin(t * 2.3 + this.phase) * amp;
        // Clonk/tinkle: when a gust begins, then now and then while it blows.
        this.chimeCool -= delta;
        if (w.gustStart || (g > 0.35 && this.chimeCool <= 0)) {
          if (this.chimeCool <= 0 || w.gustStart) {
            if (!this.ghost) this.onChime?.();
            this.chimeCool = 420 + ((t * 997) % 1) * 600;
          }
        }
        break;
      }
      case 'string_lights': {
        const n = this.night;
        for (let i = 0; i < this.bulbs.length; i++) {
          const b = this.bulbs[i];
          const tw = 0.5 + 0.5 * Math.sin(t * b.speed + b.phase);
          const blink = tw * tw;
          b.glow.setAlpha(n * (0.35 + 0.65 * blink) * gk);
          b.img.angle = Math.sin(t * 1.4 + b.phase) * 4 + w.gust * 8 * Math.sin(t * 4 + i);
        }
        break;
      }
      case 'hammock': {
        this.shawl!.angle = Math.sin(t * 0.8 + this.phase) * 1.2 + w.base * 1.5 + w.gust * 2.5 * Math.sin(t * 2);
        break;
      }
      case 'telescope': {
        const c = ((t + this.phase) % 4) / 4;
        const k = c < 0.12 ? Math.sin((c / 0.12) * Math.PI) : 0;
        this.glint!.setAlpha(k * (0.35 + this.night * 0.65)).setScale((0.3 + 0.5 * k) / ART_SCALE).setAngle(c * 120);
        break;
      }
      case 'guardian_lantern': {
        const a = Math.sin(t * 0.9 + this.phase) * 2 + w.base * 2.5 + w.gust * 4 * Math.sin(t * 2.2);
        this.swing!.angle = a;
        const p = 0.5 + 0.5 * Math.sin(t * 1.6);
        this.star!.setScale((1 / ART_SCALE) * (0.92 + 0.12 * p));
        const r = (a * Math.PI) / 180;
        const gx = this.x - Math.sin(r) * KLANTERN.starY;
        const gy = this.y + Math.cos(r) * KLANTERN.starY;
        // Never goes out: soft by day, lovely at night.
        const glow = 0.12 + 0.88 * this.night;
        this.starGlow!.setPosition(gx, gy).setAlpha(glow * (0.3 + 0.18 * p) * gk);
        this.groundGlow!.setPosition(gx, Math.max(gy + 40, CAMP.groundY + 2)).setAlpha(this.night * 0.25 * gk * (this.y < CAMP.groundY - 260 ? 0 : 1));
        break;
      }
      default:
        break;
    }
  }

  destroy(): void {
    for (const g of this.glows) g.destroy();
    this.glows.length = 0;
    this.root.destroy();
    void this.light;
  }
}
