/**
 * Foreground band (WORLD 3.4 FG, parallax 1.3): big rhododendron leaves from
 * the bottom edge, grass blades with soft seed heads that sway one by one via
 * the shared wind, fiddlehead curls; rain beads slide off leaf tips, dew glints
 * at dawn, seed heads glow when backlit at golden hour. At most ~20% of frame.
 */
import Phaser from 'phaser';
import { ART_SCALE } from '@/core/layout';
import { DEPTH } from '@/config';
import { PARALLAX } from '@/data/camp';
import type { ResolvedLight } from '@/fx/lighting';
import type { Wind } from '@/world/wind';
import { P, hexToInt } from '@/palette';
import { lerpInt, mulInt } from './landscape-color';

type Img = Phaser.GameObjects.Image;
const K = 1 / ART_SCALE;
const F = PARALLAX.fg;

export interface FgHost {
  img(key: string, x: number, y: number, f: number, d: number, ox?: number, oy?: number, scaleMul?: number): Img;
  setX(o: Img, x: number, f: number): void;
}

interface Blade {
  o: Img;
  x: number;
  base: number;
  flex: number;
  ph: number;
  tipDx: number;
  tipDy: number;
  glow: Img | null;
}

interface Leaf {
  o: Img;
  x: number;
  y: number;
  rot: number;
  len: number;
  flip: boolean;
  ph: number;
}

interface Bead {
  o: Img;
  leaf: Leaf;
  t: number;
  state: number;
  dur: number;
  fx: number;
  fy: number;
  vy: number;
}

interface Dew {
  o: Img;
  leaf: Leaf;
  u: number;
  ph: number;
}

const BLADES: Record<string, { h: number; lean: number; head: boolean }> = {
  land_bladeA: { h: 128, lean: 3, head: true },
  land_bladeB: { h: 104, lean: -4, head: false },
  land_bladeC: { h: 138, lean: 7, head: true },
};

export class FgLayer {
  private blades: Blade[] = [];
  private leaves: Leaf[] = [];
  private beads: Bead[] = [];
  private dew: Dew[] = [];
  private fiddles: { o: Img; x: number; ph: number }[] = [];
  private golden = 0;
  private dawn = 0;
  private rain = 0;

  constructor(private host: FgHost, worldW: number, viewW: number) {
    const span = viewW + Math.max(0, worldW - viewW) * F + 200;
    let s = 4242;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let k = 0;
    for (let x = 80; x < span; x += 560, k++) {
      if (k % 2 === 0) this.leafCluster(x, (k / 2) % 2 === 0, rnd);
      else this.grassClump(x, rnd, k % 4 === 1);
    }
  }

  private blade(key: string, x: number, scale: number, rnd: () => number): void {
    const b = BLADES[key];
    const o = this.host.img(key, x, 726, F, DEPTH.fg, 0.5, 1, scale);
    const base = (rnd() - 0.5) * 0.24;
    o.setRotation(base);
    let glow: Img | null = null;
    if (b.head) {
      glow = this.host.img('glowSmall', x, 600, F, DEPTH.fg + 0.1, 0.5, 0.5, 0.75 * scale).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.butter)).setAlpha(0);
    }
    this.blades.push({ o, x, base, flex: 0.7 + rnd() * 0.6, ph: rnd() * 6.28, tipDx: b.lean * scale, tipDy: -(b.h - 22) * scale, glow });
  }

  private leaf(key: string, x: number, y: number, rot: number, flip: boolean, scale: number, len: number): Leaf {
    const o = this.host.img(key, x, y, F, DEPTH.fg - 0.1, flip ? 1 : 0, 0.5, scale);
    o.setFlipX(flip).setRotation(rot);
    const l: Leaf = { o, x, y, rot, len: len * scale, flip, ph: x * 0.013 };
    this.leaves.push(l);
    return l;
  }

  private leafCluster(x: number, right: boolean, rnd: () => number): void {
    const sgn = right ? 1 : -1;
    const bx = x - sgn * 30;
    const ls = [
      this.leaf('land_leafA', bx, 762, sgn * -0.98, !right, 1, 196),
      this.leaf('land_leafB', bx + sgn * 10, 760, sgn * -0.58, !right, 1, 158),
      this.leaf('land_leafA', bx + sgn * 4, 756, sgn * -0.24, !right, 0.86, 196),
    ];
    for (let i = 0; i < 5; i++) {
      const key = i % 3 === 0 ? 'land_bladeC' : i % 3 === 1 ? 'land_bladeA' : 'land_bladeB';
      this.blade(key, x + sgn * (30 + i * 19 + rnd() * 8), 0.8 + rnd() * 0.25, rnd);
    }
    // two rain beads and two dew glints per cluster
    for (let i = 0; i < 2; i++) {
      const o = this.host.img('land_bead', 0, 0, F, DEPTH.fg + 0.2, 0.5, 0.5, 0.9).setAlpha(0);
      this.beads.push({ o, leaf: ls[i], t: rnd(), state: 2, dur: 0.4 + rnd(), fx: 0, fy: 0, vy: 0 });
      const d = this.host.img('sparkle', 0, 0, F, DEPTH.fg + 0.2, 0.5, 0.5, 0.22).setTint(hexToInt(P.cream)).setAlpha(0);
      this.dew.push({ o: d, leaf: ls[i + 1], u: 0.45 + rnd() * 0.35, ph: rnd() * 6.28 });
    }
  }

  private grassClump(x: number, rnd: () => number, fiddle: boolean): void {
    const n = 6 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const key = i % 3 === 0 ? 'land_bladeA' : i % 3 === 1 ? 'land_bladeB' : 'land_bladeC';
      this.blade(key, x - 50 + i * 16 + rnd() * 8, 0.75 + rnd() * 0.3, rnd);
    }
    if (fiddle) {
      for (let i = 0; i < 2; i++) {
        const fx = x + 40 + i * 22;
        const o = this.host.img('land_fiddle', fx, 728, F, DEPTH.fg + 0.05, 0.45, 1, 0.85 - i * 0.12);
        if (i === 1) o.setFlipX(true);
        this.fiddles.push({ o, x: fx, ph: rnd() * 6.28 });
      }
    }
  }

  applyLight(l: ResolvedLight, w: { golden: number; dawn: number }, rain: number): void {
    // Slightly darker and warmer than the ground (WORLD 3.4: -8%).
    const tint = mulInt(l.ground, lerpInt(0xffffff, hexToInt(P.bark), 0.14));
    for (const b of this.blades) b.o.setTint(tint);
    for (const lf of this.leaves) lf.o.setTint(tint).setAlpha(0.95);
    for (const f of this.fiddles) f.o.setTint(tint);
    for (const b of this.beads) b.o.setTint(lerpInt(hexToInt(P.cream), l.ground, 0.25));
    this.golden = w.golden * (1 - rain);
    this.dawn = w.dawn * (1 - rain);
    this.rain = rain;
  }

  update(t: number, dt: number, _cam: number, wind: Wind): void {
    const gold = this.golden;
    for (let i = 0; i < this.blades.length; i++) {
      const b = this.blades[i];
      const sway = (wind.base * 0.05 + wind.gust * 0.16 * (0.75 + 0.25 * Math.sin(t * 3.1 + b.ph))) * b.flex + Math.sin(t * 1.2 + b.ph) * 0.025;
      const r = b.base + sway;
      b.o.setRotation(r);
      if (b.glow) {
        if (gold > 0.01) {
          const c = Math.cos(r);
          const s = Math.sin(r);
          const tx = b.x + b.tipDx * c - b.tipDy * s;
          const ty = 726 + b.tipDx * s + b.tipDy * c;
          this.host.setX(b.glow, tx, F);
          b.glow.y = ty;
          b.glow.setAlpha(gold * (0.7 + 0.2 * Math.sin(t * 2 + b.ph)));
        } else if (b.glow.alpha !== 0) b.glow.setAlpha(0);
      }
    }
    for (let i = 0; i < this.leaves.length; i++) {
      const lf = this.leaves[i];
      lf.o.setRotation(lf.rot + (wind.base * 0.012 + wind.gust * 0.035) * (lf.flip ? -1 : 1) + Math.sin(t * 0.8 + lf.ph) * 0.008);
    }
    for (let i = 0; i < this.fiddles.length; i++) {
      const f = this.fiddles[i];
      f.o.setRotation((wind.base * 0.03 + wind.gust * 0.06) + Math.sin(t + f.ph) * 0.02);
    }
    // Rain beads slide to the leaf tip, bounce, drop.
    for (let i = 0; i < this.beads.length; i++) {
      const b = this.beads[i];
      if (this.rain < 0.05) {
        if (b.o.alpha !== 0) b.o.setAlpha(0);
        continue;
      }
      b.t += dt / b.dur;
      const lf = b.leaf;
      const r = lf.o.rotation;
      const dx = Math.cos(r) * (lf.flip ? -1 : 1);
      const dy = Math.sin(r) * (lf.flip ? -1 : 1);
      if (b.state === 0) {
        const u = 0.32 + 0.62 * b.t * b.t;
        const px = lf.x + dx * lf.len * u;
        const py = lf.y + dy * lf.len * u - 3.5;
        this.host.setX(b.o, px, F);
        b.o.y = py;
        b.o.setScale(K * (0.6 + 0.4 * b.t));
        b.o.setAlpha(this.rain * Math.min(1, b.t * 4));
        if (b.t >= 1) {
          b.state = 1;
          b.t = 0;
          b.fx = px;
          b.fy = py;
          b.vy = 0;
          b.dur = 0.55;
        }
      } else if (b.state === 1) {
        const bounce = b.t < 0.18 ? Math.sin((b.t / 0.18) * Math.PI) : 0;
        if (b.t >= 0.18) b.vy += 900 * dt;
        b.fy += b.vy * dt;
        b.o.y = b.fy - bounce * 2;
        b.o.setScale(K * (1 + bounce * 0.25), K * (1 - bounce * 0.2 + Math.min(0.4, b.vy / 1500)));
        b.o.setAlpha(this.rain * (1 - b.t));
        if (b.t >= 1) {
          b.state = 2;
          b.t = 0;
          b.dur = 0.3 + ((i * 0.37 + t) % 1) * 1.2;
          b.o.setAlpha(0);
        }
      } else if (b.t >= 1) {
        b.state = 0;
        b.t = 0;
        b.dur = 1 + ((i * 0.61 + t * 0.3) % 1) * 2;
      }
    }
    // Dew glints at dawn.
    for (let i = 0; i < this.dew.length; i++) {
      const d = this.dew[i];
      if (this.dawn < 0.02) {
        if (d.o.alpha !== 0) d.o.setAlpha(0);
        continue;
      }
      const lf = d.leaf;
      const r = lf.o.rotation;
      const sg = lf.flip ? -1 : 1;
      this.host.setX(d.o, lf.x + Math.cos(r) * sg * lf.len * d.u, F);
      d.o.y = lf.y + Math.sin(r) * sg * lf.len * d.u - 4;
      const s = Math.sin(t * 1.7 + d.ph);
      d.o.setAlpha(this.dawn * (s > 0.2 ? (s - 0.2) / 0.8 : 0));
    }
  }
}
