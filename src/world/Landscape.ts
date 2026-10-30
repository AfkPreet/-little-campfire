/**
 * The layered camp landscape of Junkiri Danda (WORLD.md 3.1, 3.2, 3.4, 3.5, 4).
 *
 * Every band is baked once (src/art/landscape*.ts) and relit here only by
 * multiply tint (ResolvedLight band ints), fill-tinted haze copies of the same
 * textures (atmospheric perspective toward the haze colour), alpha changes and
 * additive glow sprites. Nothing is redrawn per frame; update() only moves,
 * fades and crops existing images and allocates nothing.
 */
import Phaser from 'phaser';
import { ART_SCALE, layout, onLayout } from '@/core/layout';
import { stripInfo } from '@/art/kit';
import { CAMP, PARALLAX } from '@/data/camp';
import { DEPTH } from '@/config';
import type { ResolvedLight } from '@/fx/lighting';
import { windAt } from '@/world/wind';
import { A, P, hexToInt } from '@/palette';
import { BAND, BX0, ELDEST, GURANS, LAKE_Y, MIST_F, SPILL, STEAM, THREADS, VIEW_MAX, WINDOWS, bandW } from '@/art/landscape-geo';
import { SEA_TILE } from '@/art/landscape-far';
import { BAMBOO, CHIMNEY, DOCK, SHOP, SHOP_WINDOW, TREES } from '@/art/landscape-ground';
import { FgLayer } from './landscape-fg';
import { clamp01, lerpInt, mulInt, smooth } from './landscape-color';

export interface LandscapeOpts {
  worldW?: number;
  variant?: 'camp' | 'title';
  container?: Phaser.GameObjects.Container;
  /** Container mode only: the camera scrollX to frame (default near the fire). */
  viewX?: number;
  /** Container mode only: logical view width (default layout().w). */
  viewW?: number;
}

type Img = Phaser.GameObjects.Image;
const S = ART_SCALE;
const K = 1 / ART_SCALE;
const WHITE = 0xffffff;
const SKY_W = VIEW_MAX + 80;

interface Band {
  imgs: Img[];
  haze: Img[];
  rimR: Img[];
  rimL: Img[];
}

interface DriftRow {
  tiles: Img[];
  fill: Img;
  f: number;
  y: number;
  speed: number;
  flip: boolean;
}

interface Ribbon {
  o: Img;
  x: number;
  speed: number;
  period: number;
  f: number;
  base: number;
}

interface ReflRow {
  o: Img;
  bx: number;
  f: number;
  ph: number;
  amp: number;
}

interface Ring {
  o: Img;
  t: number;
  life: number;
  size: number;
}

/** Spectacle weights derived from day progress (cached per light). */
interface Weights {
  dawn: number;
  day: number;
  golden: number;
  dusk: number;
  night: number;
  climb: number;
}

export class Landscape {
  private readonly scene: Phaser.Scene;
  private readonly cont: Phaser.GameObjects.Container | null;
  private readonly worldW: number;
  private readonly vx: number;
  private viewW: number;
  private readonly list: { o: Phaser.GameObjects.Image; d: number }[] = [];
  private offLayout: (() => void) | null = null;

  // sky
  private skyA!: Img;
  private skyB!: Img;
  private skyC!: Img;
  private stars: { o: Img; th: number; tw: number; ph: number; base: number }[] = [];
  private milky: Img[] = [];
  private gurans: { core: Img; halo: Img; dx: number; dy: number }[] = [];
  private sunWide!: Img;
  private sunBloom!: Img;
  private sunDisc!: Img;
  private moonHalo!: Img;
  private moonGlow!: Img;
  private moonDisc!: Img;
  private clouds: { o: Img; x: number; y: number; speed: number }[] = [];
  private ceiling: { o: Img; bx: number }[] = [];
  private ceilFill!: Img;
  private shaft!: Img;
  // far
  private snow!: Band;
  private snowGlow: Img[] = [];
  private duskShadow: Img[][] = [];
  private banner!: Img;
  private seaBack!: DriftRow;
  private seaFront!: DriftRow;
  private swallowFar!: DriftRow;
  private swallowMid!: DriftRow;
  private far!: Band;
  private spill: Img[] = [];
  private ribbons: Ribbon[] = [];
  // mid
  private mid!: Band;
  private windows: { core: Img; bloom: Img; v: number; at: number }[] = [];
  private threads: { line: Img; dash: Img[]; puff: Img[]; len: number; x: number; y0: number; v: number }[] = [];
  // near
  private near!: Band;
  private steam: { o: Img; x: number; y: number; ph: number }[] = [];
  private junkiri: Img[] = [];
  // water
  private waterBody!: Img;
  private waterSheen!: Img;
  private refl: { far: ReflRow[]; mid: ReflRow[]; near: ReflRow[]; dock: ReflRow[] } = { far: [], mid: [], near: [], dock: [] };
  private path: Img[] = [];
  private glints: { o: Img; ph: number; rate: number }[] = [];
  private rings: Ring[] = [];
  private breath: Ribbon[] = [];
  private curls: { o: Img; x: number; y: number; ph: number }[] = [];
  private fireRefl!: Img;
  // ground
  private ground: Img[] = [];
  private trees!: Img;
  private shop!: Img;
  private shopGlow!: Img;
  private bamboo: Img[] = [];
  private dock!: Img;
  private smoke: { o: Img; ph: number }[] = [];
  private groundMist: Ribbon[] = [];
  private walkMist: Ribbon[] = [];
  private fg!: FgLayer;

  // state
  private last: ResolvedLight | null = null;
  private readonly sigv = [NaN, NaN, NaN, NaN, NaN];
  private w: Weights = { dawn: 0, day: 1, golden: 0, dusk: 0, night: 0, climb: 0 };
  private rain = 0;
  private mist = 0;
  private skyOpen = 0;
  private appliedSkyOpen = -1;
  private necklaceOn = false;
  private necklaceAt = -100;
  private threadRain = 0;
  private junkiriT = -1;
  private junkiriArmed = true;
  private ringTimer = 0;
  private t = 0;
  private starVis = 0;
  private pathCol = WHITE;
  private pathAlpha = 0;
  private pathX = 0;
  private glintAlpha = 0;
  private curlAlpha = 0;
  private steamAlpha = 0;
  private spillAlpha = 0;
  private bannerAlpha = 0;
  private ceilAlpha = 0;
  private reflAlpha = 0.35;
  private smokeAlpha = 0.5;
  private windowNight = 0;
  private seaRaise = 0;

  constructor(scene: Phaser.Scene, opts: LandscapeOpts = {}) {
    this.scene = scene;
    this.cont = opts.container ?? null;
    this.worldW = opts.worldW ?? CAMP.worldW;
    this.viewW = opts.viewW ?? layout().w;
    this.vx = this.cont ? (opts.viewX ?? (opts.variant === 'title' ? CAMP.fire.x - this.viewW * 0.55 : 900)) : 0;

    this.buildSky();
    this.buildFar();
    this.buildMid();
    this.buildNear();
    this.buildWater();
    this.buildGround();
    this.fg = new FgLayer(this, this.worldW, this.viewW);

    if (this.cont) {
      const sorted = this.list.slice().sort((a, b) => a.d - b.d);
      this.cont.add(sorted.map((e) => e.o));
    }
    if (!this.cont) {
      this.offLayout = onLayout((l) => {
        this.viewW = l.w;
        this.layoutSky();
        if (this.last) this.applyLight(this.last, true);
      });
    }
    this.layoutSky();
  }

  // -------------------------------------------------------------------------
  // Object helpers (shared with the foreground layer)
  // -------------------------------------------------------------------------

  /** Create a registered image at band x with scroll factor f and depth d. */
  img(key: string, x: number, y: number, f: number, d: number, ox = 0, oy = 0, scaleMul = 1): Img {
    const o = this.cont ? new Phaser.GameObjects.Image(this.scene, 0, y, key) : this.scene.add.image(0, y, key);
    o.setOrigin(ox, oy).setScale(scaleMul * K);
    if (!this.cont) o.setScrollFactor(f, 1).setDepth(d);
    o.x = x - this.vx * f;
    this.list.push({ o, d });
    return o;
  }

  /** Set an image's band x honouring container-mode parallax. */
  setX(o: Img, x: number, f: number): void {
    o.x = x - this.vx * f;
  }

  /** Camera scrollX (virtual in container mode). */
  camX(): number {
    return this.cont ? this.vx : this.scene.cameras.main.scrollX;
  }

  get width(): number {
    return this.viewW;
  }

  private stripImgs(key: string, x0: number, y: number, f: number, d: number, scaleMul = 1): Img[] {
    const info = stripInfo(key);
    if (!info) return [];
    return info.chunks.map((c) => this.img(c.key, x0 + c.x * scaleMul, y, f, d, 0, 0, scaleMul));
  }

  private band(key: string, f: number, y: number, d: number, rims: boolean): Band {
    const imgs = this.stripImgs(key, BX0, y, f, d);
    const haze = this.stripImgs(key, BX0, y, f, d + 0.3);
    for (const h of haze) h.setTintFill(WHITE).setAlpha(0);
    const rimR = rims ? this.stripImgs(`${key}RimR`, BX0, y, f, d + 0.1, 2) : [];
    const rimL = rims ? this.stripImgs(`${key}RimL`, BX0, y, f, d + 0.1, 2) : [];
    for (const r of [...rimR, ...rimL]) r.setAlpha(0);
    return { imgs, haze, rimR, rimL };
  }

  private quad(x: number, y: number, w: number, h: number, f: number, d: number): Img {
    const o = this.img('px', x, y, f, d);
    o.setDisplaySize(w, h);
    return o;
  }

  private driftRow(key: string, y: number, f: number, d: number, speed: number, flip = false): DriftRow {
    const tiles: Img[] = [];
    for (let k = 0; k < 4; k++) {
      const o = this.img(key, BX0 + k * SEA_TILE.w, y, f, d, 0, 0);
      if (flip) o.setScale(K, -K);
      tiles.push(o);
    }
    const fill = flip ? this.quad(BX0 - 800, -20, bandW(f) + 1600, y - SEA_TILE.h + 22, f, d) : this.quad(BX0 - 800, y + SEA_TILE.h - 2, bandW(f) + 1600, 120, f, d);
    return { tiles, fill, f, y, speed, flip };
  }

  private ribbon(arr: Ribbon[], key: string, x: number, y: number, w: number, h: number, f: number, d: number, speed: number, period: number): Img {
    const o = this.img(key, x, y, f, d, 0.5, 0.5);
    o.setDisplaySize(w, h);
    arr.push({ o, x, speed, period, f, base: y });
    return o;
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  private buildSky(): void {
    const d = DEPTH.sky;
    this.skyA = this.quad(-40, 0, SKY_W, 196, 0, d);
    this.skyB = this.quad(-40, 196, SKY_W, 150, 0, d);
    this.skyC = this.quad(-40, 346, SKY_W, 380, 0, d);
    // Milky Way: two overlapping soft bands across the upper sky.
    for (let i = 0; i < 2; i++) {
      const o = this.img('land_milky', 0, 0, 0, DEPTH.stars, 0.5, 0.5, 2.6 - i * 0.5);
      o.setRotation(-0.32 + i * 0.06).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.lavender)).setAlpha(0);
      this.milky.push(o);
    }
    // Stars: seeded scatter; the brightest show first at dusk.
    let s = 12345;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 150; i++) {
      const bright = i < 12;
      const x = rnd() * SKY_W - 20;
      const y = 10 + Math.pow(rnd(), 1.3) * 290;
      const o = bright ? this.img('sparkle', x, y, 0, DEPTH.stars, 0.5, 0.5, 0.26 + rnd() * 0.08) : this.img('dot', x, y, 0, DEPTH.stars, 0.5, 0.5, 0.16 + rnd() * rnd() * 0.22);
      o.setTint(hexToInt(P.cream)).setAlpha(0);
      this.stars.push({ o, th: bright ? 0.12 + rnd() * 0.18 : 0.3 + rnd() * 0.62, tw: i % 4 === 0 ? 1 + rnd() * 2 : 0, ph: rnd() * 6.28, base: 0.55 + rnd() * 0.45 });
    }
    // The Gurans: 5 stars in a ring of radius 18 around 1 centre star.
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + ((i - 1) / 5) * Math.PI * 2;
      const dx = i === 0 ? 0 : Math.cos(a) * GURANS.r;
      const dy = i === 0 ? 0 : Math.sin(a) * GURANS.r;
      const halo = this.img('glowSmall', 0, 0, 0, DEPTH.stars + 0.1, 0.5, 0.5, i === 0 ? 0.7 : 0.55);
      halo.setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['moon-gurans'])).setAlpha(0);
      const core = this.img('sparkle', 0, 0, 0, DEPTH.stars + 0.2, 0.5, 0.5, i === 0 ? 0.36 : 0.3);
      core.setTint(hexToInt(P.cream)).setAlpha(0);
      this.gurans.push({ core, halo, dx, dy });
    }
    // Sun and moon.
    this.sunWide = this.img('glow', 0, 0, 0, DEPTH.celestial, 0.5, 0.5, 3.4).setBlendMode(Phaser.BlendModes.ADD);
    this.sunBloom = this.img('glow', 0, 0, 0, DEPTH.celestial, 0.5, 0.5, 1.15).setBlendMode(Phaser.BlendModes.ADD);
    this.sunDisc = this.img('land_sun', 0, 0, 0, DEPTH.celestial + 0.1, 0.5, 0.5, 1);
    this.moonHalo = this.img('glow', 0, 0, 0, DEPTH.celestial, 0.5, 0.5, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.moonGlow = this.img('glowSmall', 0, 0, 0, DEPTH.celestial, 0.5, 0.5, 2.2).setBlendMode(Phaser.BlendModes.ADD);
    this.moonDisc = this.img('land_moon', 0, 0, 0, DEPTH.celestial + 0.1, 0.5, 0.5, 1);
    // Pillow cumulus parked above the snows.
    const cl: [number, number, number][] = [
      [0.12, 66, 0],
      [0.47, 46, 2],
      [0.83, 84, 1],
    ];
    cl.forEach(([fx, y, k], i) => {
      const o = this.img(`land_cloud${k}`, 0, y, 0, DEPTH.celestial + 0.5, 0.5, 0.5, 1);
      this.clouds.push({ o, x: fx, y, speed: 1.6 + i * 0.5 });
    });
    // Rain cloud ceiling: the cloud-sea tiles flipped, plus a solid band above.
    for (let k = 0; k < 4; k++) {
      const bx = -420 + k * SEA_TILE.w;
      const o = this.img(k % 2 ? 'land_seaB' : 'land_seaA', bx, 168, 0, DEPTH.celestial + 0.8);
      o.setScale(K, -K * 1.15).setAlpha(0);
      this.ceiling.push({ o, bx });
    }
    this.ceilFill = this.quad(-40, -20, SKY_W, 60, 0, DEPTH.celestial + 0.8).setAlpha(0);
    this.shaft = this.img('glow', 0, 0, 0, DEPTH.celestial + 0.9, 0.5, 0.5, 1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  }

  private buildFar(): void {
    const fs = PARALLAX.snow;
    this.snow = this.band('land_snow', fs, BAND.snow.y0, DEPTH.far, true);
    this.snowGlow = this.stripImgs('land_snowGlow', BX0, BAND.snow.y0, fs, DEPTH.far + 0.15);
    for (const g of this.snowGlow) g.setAlpha(0);
    // Dusk: a lavender shadow climbing the peaks (3 soft stepped crops).
    for (let k = 0; k < 3; k++) {
      const row = this.stripImgs('land_snow', BX0, BAND.snow.y0, fs, DEPTH.far + 0.2);
      for (const o of row) o.setTintFill(hexToInt(A['mist-lavender'])).setAlpha(0);
      this.duskShadow.push(row);
    }
    this.banner = this.img('land_banner', ELDEST.x + 6, ELDEST.tip + 22, fs, DEPTH.far + 0.4, 0, 0.5, 1).setAlpha(0);

    const sf = MIST_F.sea;
    this.seaBack = this.driftRow('land_seaA', 226, sf, DEPTH.far + 1, 3);
    this.seaFront = this.driftRow('land_seaB', 234, sf * 1.08, DEPTH.far + 2, -3);
    this.far = this.band('land_far', PARALLAX.far, BAND.far.y0, DEPTH.far + 3, true);
    for (let i = 0; i < 2; i++) {
      const o = this.img('land_spill', SPILL.x, SPILL.y - 30, PARALLAX.far, DEPTH.far + 3.6, 0.22, 0.2, 1).setAlpha(0);
      this.spill.push(o);
    }
    this.swallowFar = this.driftRow('land_seaB', 210, PARALLAX.far, DEPTH.far + 4, 4);
    for (const t of this.swallowFar.tiles) t.setAlpha(0);
    this.swallowFar.fill.setAlpha(0);
    // Valley ribbons (between far and mid at 0.18, between mid and near at 0.35).
    const hi = MIST_F.ribbonHi;
    const lo = MIST_F.ribbonLo;
    const pHi = bandW(hi) + 1400;
    const pLo = bandW(lo) + 1400;
    this.ribbon(this.ribbons, 'land_ellipse', 200, 344, 1100, 54, hi, DEPTH.hazeFar, 5, pHi);
    this.ribbon(this.ribbons, 'land_ellipse', 1100, 338, 900, 44, hi, DEPTH.hazeFar, 6.5, pHi);
    this.ribbon(this.ribbons, 'land_ellipse', 1900, 350, 1200, 60, hi, DEPTH.hazeFar, 4.2, pHi);
    this.ribbon(this.ribbons, 'land_ellipse', 400, 406, 1200, 58, lo, DEPTH.hazeMid, -6, pLo);
    this.ribbon(this.ribbons, 'land_ellipse', 1350, 400, 1000, 50, lo, DEPTH.hazeMid, -7.5, pLo);
    this.ribbon(this.ribbons, 'land_ellipse', 2300, 412, 1150, 62, lo, DEPTH.hazeMid, -5, pLo);
  }

  private buildMid(): void {
    const f = PARALLAX.mid;
    this.mid = this.band('land_mid', f, BAND.mid.y0, DEPTH.mid, true);
    for (const w of WINDOWS) {
      const bloom = this.img('glowSmall', w.x, w.y, f, DEPTH.mid + 0.5, 0.5, 0.5, 0.42).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setAlpha(0);
      const core = this.img('dot', w.x, w.y, f, DEPTH.mid + 0.5, 0.5, 0.5, 0.34).setTint(hexToInt(P.glow)).setAlpha(0);
      this.windows.push({ core, bloom, v: 0, at: 0 });
    }
    for (const th of THREADS) {
      const len = th.y1 - th.y0;
      const line = this.img('land_thread', th.x, th.y0, f, DEPTH.mid + 0.6, 0.5, 0).setTint(hexToInt(A['water-thread']));
      line.setDisplaySize(2.6, len).setAlpha(0);
      const dash: Img[] = [];
      for (let k = 0; k < 2; k++) {
        const o = this.img('land_dash', th.x, th.y0, f, DEPTH.mid + 0.65, 0.5, 0.5, 0.3).setRotation(Math.PI / 2).setTint(hexToInt(P.cream)).setAlpha(0);
        dash.push(o);
      }
      const puff: Img[] = [];
      for (let k = 0; k < 3; k++) {
        const o = this.img('puff', th.x + (k - 1) * 6, th.y1 - 6 - (k % 2) * 3, f, DEPTH.mid + 0.62, 0.5, 0.5, 0.22 + (k % 2) * 0.06).setTint(hexToInt(A['cloud-spill'])).setAlpha(0);
        puff.push(o);
      }
      this.threads.push({ line, dash, puff, len, x: th.x, y0: th.y0, v: 0 });
    }
    const lo = MIST_F.ribbonLo;
    this.swallowMid = this.driftRow('land_seaA', 290, lo * 0.8, DEPTH.hazeMid + 0.5, -5);
    for (const t of this.swallowMid.tiles) t.setAlpha(0);
    this.swallowMid.fill.setAlpha(0);
  }

  private buildNear(): void {
    const f = PARALLAX.near;
    this.near = this.band('land_near', f, BAND.near.y0, DEPTH.near, true);
    STEAM.forEach((s, i) => {
      const o = this.img('land_wisp', s.x, s.y, f, DEPTH.near + 0.5, 0.5, 0.8, 0.8).setTint(hexToInt(P.cream)).setAlpha(0);
      this.steam.push({ o, x: s.x, y: s.y, ph: i * 0.37 });
    });
    for (let i = 0; i < 20; i++) {
      const o = this.img('glowSmall', 0, 0, f, DEPTH.near + 0.6, 0.5, 0.5, 0.3).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setAlpha(0);
      this.junkiri.push(o);
    }
  }

  private buildWater(): void {
    const d = DEPTH.water - 2;
    this.waterBody = this.quad(-40, LAKE_Y, SKY_W, 720 - LAKE_Y + 4, 0, d);
    this.waterSheen = this.quad(-40, LAKE_Y, SKY_W, 220, 0, d + 0.05);
    this.refl.far = this.reflRows('land_far', BAND.far.y0, BAND.far.y1, PARALLAX.far, d + 0.1);
    this.refl.mid = this.reflRows('land_mid', BAND.mid.y0, BAND.mid.y1, PARALLAX.mid, d + 0.2);
    this.refl.near = this.reflRows('land_near', BAND.near.y0, BAND.near.y1, PARALLAX.near, d + 0.3);
    // Dock reflection (deck and posts above the waterline).
    const wy = CAMP.waterY;
    for (let y = wy; y < wy + 30; y += 5) {
      const o = this.img('land_dock', DOCK.x0, 2 * wy - DOCK.y0, 1, d + 0.35);
      o.setScale(K, -K);
      const srcTop = 2 * wy - (y + 5) - DOCK.y0;
      o.setCrop(0, Math.max(0, srcTop) * S, DOCK.w * S, 5 * S);
      this.refl.dock.push({ o, bx: DOCK.x0, f: 1, ph: y * 0.21, amp: 1.5 + (y - wy) * 0.05 });
    }
    // Sun / moon path: stacked dashes.
    for (let i = 0; i < 13; i++) {
      const o = this.img('land_dash', 0, 0, 0, d + 0.5, 0.5, 0.5, 1).setAlpha(0);
      this.path.push(o);
    }
    // Day glints on open water and in the back strip.
    let s = 777;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 16; i++) {
      const open = i < 10;
      const x = open ? 2060 + rnd() * 720 : 560 + rnd() * 1400;
      const y = open ? 470 + rnd() * 230 : 458 + rnd() * 34;
      const f = open ? 1 : 0.8;
      const o = this.img('sparkle', x, y, f, d + 0.55, 0.5, 0.5, 0.16 + rnd() * 0.12).setTint(hexToInt(P.cream)).setAlpha(0);
      this.glints.push({ o, ph: rnd() * 6.28, rate: 0.9 + rnd() * 1.4 });
    }
    for (let i = 0; i < 18; i++) {
      const o = this.img('ring', -999, 0, 1, d + 0.6, 0.5, 0.5).setTint(hexToInt(P.cream)).setAlpha(0);
      this.rings.push({ o, t: 1, life: 1, size: 1 });
    }
    // Warm firelight reflection on the back strip at night.
    this.fireRefl = this.img('glow', CAMP.fire.x, 474, 0.9, d + 0.58, 0.5, 0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setAlpha(0);
    this.fireRefl.setDisplaySize(260, 40);
    // Lake-breath (M3): a soft low strip plus curls lifting off the water.
    const bf = MIST_F.breath;
    const per = bandW(bf) + 1200;
    for (let i = 0; i < 5; i++) {
      this.ribbon(this.breath, 'land_ellipse', i * 560, 456 + (i % 2) * 8, 820, 46, bf, DEPTH.water + 0.5, 3 + (i % 3), per);
    }
    for (let i = 0; i < 7; i++) {
      const x = 180 + i * 300 + (i % 2) * 90;
      const o = this.img('land_wisp', x, 470, bf, DEPTH.water + 0.55, 0.3, 0.8, 0.9).setAlpha(0);
      this.curls.push({ o, x, y: 470 + (i % 3) * 8, ph: i * 0.29 });
    }
  }

  private reflRows(key: string, y0: number, y1: number, f: number, d: number): ReflRow[] {
    const info = stripInfo(key);
    if (!info) return [];
    const rows: ReflRow[] = [];
    const maxCam = Math.max(0, this.worldW - 960);
    const yMax = 2 * LAKE_Y - y0;
    const srcBottom = Math.min(y1, LAKE_Y);
    for (const c of info.chunks) {
      const cx1 = BX0 + c.x + c.w;
      const openVisible = cx1 > 1990 - maxCam * (1 - f);
      let ya = 2 * LAKE_Y - srcBottom;
      let k = 0;
      while (ya < Math.min(yMax, 720)) {
        const rh = Math.round(5 + (ya - LAKE_Y) / 55);
        const yb = Math.min(ya + rh, yMax);
        if (ya > 502 && !openVisible) break;
        const o = this.img(c.key, BX0 + c.x, 2 * LAKE_Y - y0, f, d);
        o.setScale(K, -K);
        const srcTop = 2 * LAKE_Y - yb - y0;
        o.setCrop(0, srcTop * S, c.w * S, (yb - ya) * S);
        rows.push({ o, bx: BX0 + c.x, f, ph: k * 0.9 + ya * 0.05, amp: 1.6 + (ya - LAKE_Y) * 0.012 });
        ya = yb;
        k++;
      }
    }
    return rows;
  }

  private buildGround(): void {
    const d = DEPTH.ground;
    this.ground = this.stripImgs('land_ground', BX0, BAND.ground.y0, 1, d);
    this.shop = this.img('land_shop', SHOP.x0, SHOP.y0, 1, d + 0.1);
    this.shopGlow = this.img('glow', SHOP_WINDOW.x, SHOP_WINDOW.y, 1, d + 0.11, 0.5, 0.5, 0.36).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.glow)).setAlpha(0);
    for (let i = 0; i < 5; i++) {
      const o = this.img('puff', CHIMNEY.x, CHIMNEY.y, 1, d + 0.09, 0.5, 0.5, 0.3).setTint(hexToInt(P.cream)).setAlpha(0);
      this.smoke.push({ o, ph: i / 5 });
    }
    this.dock = this.img('land_dock', DOCK.x0, DOCK.y0, 1, d + 0.15);
    this.trees = this.img('land_trees', TREES.x0, TREES.y0, 1, d + 0.2);
    const b0 = this.img('land_bamboo', CAMP.bamboo[0], 594, 1, d + 0.3, BAMBOO.bx / BAMBOO.w, BAMBOO.by / BAMBOO.h);
    const b1 = this.img('land_bamboo', CAMP.bamboo[1], 588, 1, d + 0.3, BAMBOO.bx / BAMBOO.w, BAMBOO.by / BAMBOO.h, 0.9);
    b1.setFlipX(true);
    this.bamboo.push(b0, b1);
    // Ground mist (misty mornings) and walking mist (rain).
    for (let i = 0; i < 5; i++) {
      const o = this.ribbon(this.groundMist, 'mistBlob', 760 + i * 380, 560 + (i % 2) * 22, 620, 120, 1, DEPTH.props - 1, 5 + (i % 2) * 2, 2400);
      o.setAlpha(0);
    }
    this.ribbon(this.walkMist, 'mistBlob', 600, 392, 900, 170, PARALLAX.near, DEPTH.near + 0.8, 6, bandW(0.5) + 1400).setAlpha(0);
    this.ribbon(this.walkMist, 'mistBlob', 1500, 360, 1000, 190, 1, DEPTH.ground + 0.5, 6, 3800).setAlpha(0);
    this.ribbon(this.walkMist, 'mistBlob', 3000, 450, 900, 160, 1, DEPTH.ground + 0.5, 6, 3800).setAlpha(0);
  }

  // -------------------------------------------------------------------------
  // Sky layout (scroll factor 0, depends on the view width)
  // -------------------------------------------------------------------------

  private layoutSky(): void {
    const w = this.viewW;
    this.milky[0].setPosition(w * 0.42, 118);
    this.milky[1].setPosition(w * 0.5, 104);
    const gx = w * GURANS.fx;
    for (const g of this.gurans) {
      g.core.setPosition(gx + g.dx, GURANS.y + g.dy);
      g.halo.setPosition(gx + g.dx, GURANS.y + g.dy);
    }
    this.shaft.setPosition(gx, GURANS.y + 10);
  }

  // -------------------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------------------

  /** Alias so the camp light director can treat the landscape as Lit. */
  setLight(l: ResolvedLight): void {
    this.applyLight(l);
  }

  applyLight(l: ResolvedLight, force = false): void {
    const sg = this.sigv;
    if (!force && sg[0] === l.p && sg[1] === l.rain && sg[2] === l.mist && sg[3] === l.golden && sg[4] === l.skyTop) return;
    sg[0] = l.p;
    sg[1] = l.rain;
    sg[2] = l.mist;
    sg[3] = l.golden;
    sg[4] = l.skyTop;
    this.last = l;
    const p = l.p;
    const night = clamp01(l.night);
    const dawn = p >= 1 ? 0 : 1 - smooth(0.05, 0.15, p);
    const goldenBase = p >= 1 ? 0 : smooth(0.62, 0.73, p) * (1 - smooth(0.85, 0.92, p));
    const golden = clamp01(goldenBase + l.golden * goldenBase * 0.4);
    const dusk = p >= 1 ? 0 : smooth(0.84, 0.91, p);
    const day = clamp01(1 - dawn - golden - dusk - night);
    const climb = p >= 1 ? 1 : smooth(0.895, 0.975, p);
    this.w = { dawn, day, golden, dusk, night, climb };
    const rain = (this.rain = clamp01(l.rain));
    const mist = (this.mist = clamp01(l.mist));
    const dry = 1 - rain;
    const hKey = clamp01(l.hazeAlpha - 0.35 * rain - 0.4 * mist);

    // --- Sky gradient
    this.skyA.setTint(l.skyTop, l.skyTop, l.skyMid, l.skyMid);
    this.skyB.setTint(l.skyMid, l.skyMid, l.horizon, l.horizon);
    this.skyC.setTint(l.horizon, l.horizon, l.horizon, l.horizon);

    // --- Stars, Milky Way, Gurans
    this.starVis = clamp01(l.stars);
    this.appliedSkyOpen = -1; // re-apply star alphas in update

    // --- Sun
    const w = this.viewW;
    const sx = w * (0.64 + 0.24 * l.sun.x);
    const sy = 300 - 236 * Math.pow(Math.max(0, l.sun.y), 1.3);
    const sunCol = lerpInt(lerpInt(hexToInt(P.cream), hexToInt(P.butter), golden * 0.7 + dawn * 0.2), l.horizon, dusk * 0.4 + dawn * 0.25);
    const bloomCol = lerpInt(l.horizon, hexToInt(P.butter), 0.3 + golden * 0.4);
    const sa = l.sun.a;
    this.sunDisc.setPosition(sx, sy).setTint(sunCol).setAlpha(sa * (1 - mist * 0.5));
    this.sunBloom.setPosition(sx, sy).setTint(bloomCol).setAlpha(sa * (0.3 + golden * 0.25 + dawn * 0.2 + mist * 0.2));
    this.sunWide.setPosition(sx, sy + 20).setTint(bloomCol).setAlpha(sa * (0.1 + golden * 0.16 + dawn * 0.14 + mist * 0.22));
    // --- Moon
    const mx = w * Math.max(0.16, Math.min(0.84, l.moon.x - 0.4));
    const my = 70 + (1 - l.moon.y) * 190;
    const ma = clamp01(l.moon.a);
    this.moonDisc.setPosition(mx, my).setAlpha(ma);
    this.moonHalo.setPosition(mx, my).setTint(hexToInt(P.lavender)).setAlpha(ma * 0.42);
    this.moonGlow.setPosition(mx, my).setTint(hexToInt(P.cream)).setAlpha(ma * 0.35);

    // --- Pillow clouds and rain ceiling
    const cloudTint = lerpInt(WHITE, l.horizon, 0.38 + night * 0.4);
    const cloudA = (1 - night) * dry * (1 - mist * 0.7) * (0.92 - dusk * 0.4);
    for (const c of this.clouds) c.o.setTint(cloudTint).setAlpha(cloudA);
    const pewter = lerpInt(hexToInt(P.lavender), hexToInt(A.steamer), 0.5);
    const ceilTop = mulInt(lerpInt(pewter, l.skyTop, 0.35), lerpInt(WHITE, l.skyTop, 0.3 + night * 0.4));
    const ceilBot = mulInt(lerpInt(pewter, l.horizon, 0.25), lerpInt(WHITE, l.skyMid, 0.2 + night * 0.4));
    for (const c of this.ceiling) c.o.setTint(ceilBot, ceilBot, ceilTop, ceilTop);
    this.ceilFill.setTint(ceilTop);
    this.ceilAlpha = rain;

    // --- Snow Grannies
    const snowBase = lerpInt(l.far, WHITE, 0.5);
    let snowTint = snowBase;
    snowTint = lerpInt(snowTint, mulInt(snowTint, hexToInt(A.alpenglow)), 0);
    snowTint = lerpInt(snowTint, lerpInt(WHITE, hexToInt(P.butter), 0.75), golden * 0.8);
    snowTint = lerpInt(snowTint, lerpInt(WHITE, l.horizon, 0.7), dusk * 0.75);
    snowTint = lerpInt(snowTint, lerpInt(hexToInt(A['moon-snow']), l.skyTop, 0.12), night);
    const snowA = (1 - mist) * (1 - rain * 0.9) * (1 - night * 0.62);
    this.tintBand(this.snow, snowTint, l.haze, clamp01(0.42 * hKey + mist * 0.4 + night * 0.15), snowA);
    // alpenglow at dawn (top 30%), sun-side butter rim at golden, moon rim at night
    const glowA = snowA * dry * (dawn * 0.82 + dusk * 0.5 * (1 - climb));
    const glowCol = lerpInt(hexToInt(A.alpenglow), lerpInt(hexToInt(A.alpenglow), l.horizon, 0.5), dusk);
    for (const g of this.snowGlow) g.setTint(glowCol).setAlpha(glowA);
    for (const r of this.snow.rimR) r.setTint(hexToInt(P.butter)).setAlpha(snowA * dry * (golden * 0.85 + dawn * 0.4));
    for (const r of this.snow.rimL) r.setTint(hexToInt(A['moon-snow'])).setAlpha(night * dry * 0.55 * (1 - mist));
    this.setDuskClimb(climb, snowA * dry * dusk * (1 - night));
    this.bannerAlpha = snowA * dry * (day * 0.85 + golden * 0.5);
    this.banner.setTint(snowTint);

    // --- Cloud sea (tops tinted by the key)
    const seaTop = lerpInt(lerpInt(l.horizon, hexToInt(P.cream), 0.5 - night * 0.3), l.haze, 0.15);
    const seaBot = lerpInt(lerpInt(l.skyMid, hexToInt(A['cloud-sea']), 0.55 - night * 0.4), l.haze, 0.2);
    const seaTopB = lerpInt(seaTop, hexToInt(P.cream), 0.25 - night * 0.2);
    this.tintRow(this.seaBack, seaTop, seaBot);
    this.tintRow(this.seaFront, seaTopB, seaBot);
    this.seaRaise = dawn * 14 + rain * 40 + mist * 36;
    const swallow = clamp01(rain * 0.85 + mist * 0.95);
    this.tintRow(this.swallowFar, seaTopB, seaBot, swallow);
    this.tintRow(this.swallowMid, seaTopB, seaBot, clamp01(mist * 0.9 + rain * 0.35));

    // --- Far ridges
    const farA = 1 - mist * 0.25;
    this.tintBand(this.far, l.far, l.haze, clamp01(0.36 * hKey + rain * 0.42 + mist * 0.62), farA);
    const rimWarm = lerpInt(hexToInt(P.peach), hexToInt(P.butter), golden / Math.max(0.001, golden + dawn));
    for (const r of this.far.rimR) r.setTint(rimWarm).setAlpha(dry * (dawn * 0.9 + golden * 0.85) * (1 - mist));
    for (const r of this.far.rimL) r.setTint(hexToInt(A['moon-snow'])).setAlpha(night * dry * 0.3);
    this.spillAlpha = (0.55 + rain * 0.35 + mist * 0.3) * (1 - night * 0.65);
    for (const s of this.spill) s.setTint(seaTopB);

    // --- Valley ribbons and walking/ground mist colour
    const ribbonCol = lerpInt(l.haze, hexToInt(P.cream), 0.35 - night * 0.25);
    const ribA = clamp01(0.32 + dawn * 0.2 + rain * 0.25 + mist * 0.4 - day * 0.04 - night * 0.08);
    for (const r of this.ribbons) r.o.setTint(ribbonCol).setAlpha(ribA * (r.f < 0.3 ? 1 : 0.85));

    // --- Mid ridge: tea, town, windows, threads
    this.tintBand(this.mid, l.mid, l.haze, clamp01(0.26 * hKey + rain * 0.36 + mist * 0.58), 1);
    for (const r of this.mid.rimR) r.setTint(rimWarm).setAlpha(dry * golden * 0.85 * (1 - mist));
    for (const r of this.mid.rimL) r.setTint(hexToInt(A['moon-snow'])).setAlpha(night * dry * 0.28);
    const wantOn = p >= 0.88 || night > 0.5;
    if (wantOn !== this.necklaceOn) {
      this.necklaceOn = wantOn;
      this.necklaceAt = this.t > 0 ? this.t : -100;
    }
    this.windowNight = 1 - mist * 0.6;
    for (const th of this.threads) th.line.setTint(lerpInt(hexToInt(A['water-thread']), l.mid, 0.25));

    // --- Near forest
    this.tintBand(this.near, l.near, l.haze, clamp01(0.1 * hKey + rain * 0.16 + mist * 0.5), 1);
    for (const r of this.near.rimR) r.setTint(rimWarm).setAlpha(dry * (golden * 0.8 + dawn * 0.25) * (1 - mist));
    for (const r of this.near.rimL) r.setTint(hexToInt(A['moon-snow'])).setAlpha(night * dry * 0.2);
    this.steamAlpha = rain * 0.55;
    if (dusk < 0.3 && night < 0.5) this.junkiriArmed = true;

    // --- Water
    const jade = mulInt(hexToInt(A['lake-jade']), l.water);
    const deep = mulInt(hexToInt(A['lake-deep']), l.water);
    this.waterBody.setTint(jade, jade, deep, deep);
    const sheen = lerpInt(l.horizon, l.skyMid, 0.35);
    this.waterSheen.setTint(sheen, sheen, sheen, sheen);
    const sheenA = clamp01(day * 0.22 + dawn * 0.68 + golden * 0.62 + dusk * 0.58 + night * 0.45 + rain * 0.12 + mist * 0.5);
    this.waterSheen.setAlpha(sheenA, sheenA, sheenA * 0.12, sheenA * 0.12);
    this.reflAlpha = (0.38 - rain * 0.18) * (1 - mist * 0.95);
    const reflTint = lerpInt(WHITE, l.water, 0.35);
    this.tintRefl(this.refl.far, mulInt(lerpInt(l.far, l.haze, 0.35), reflTint));
    this.tintRefl(this.refl.mid, mulInt(lerpInt(l.mid, l.haze, 0.25), reflTint));
    this.tintRefl(this.refl.near, mulInt(l.near, reflTint));
    this.tintRefl(this.refl.dock, mulInt(l.ground, reflTint));
    // Sun or moon path.
    const moonPath = ma * 0.85 * (1 - mist);
    const sunPath = sa * dry * (golden * 0.95 + dawn * 0.6 + day * 0.3 + dusk * 0.5) * (1 - mist);
    if (moonPath > sunPath) {
      this.pathX = mx;
      this.pathCol = hexToInt(P.cream);
      this.pathAlpha = moonPath;
    } else {
      this.pathX = sx;
      this.pathCol = lerpInt(lerpInt(hexToInt(P.cream), hexToInt(P.butter), golden), l.horizon, dawn * 0.4 + dusk * 0.4);
      this.pathAlpha = sunPath;
    }
    for (const d of this.path) d.setTint(this.pathCol);
    this.glintAlpha = day * dry * (1 - mist) * 0.9 + golden * dry * 0.4;
    for (const g of this.glints) g.o.setTint(lerpInt(hexToInt(P.cream), hexToInt(P.butter), golden));
    this.fireRefl.setAlpha(l.warmLight * (night * 0.5 + dusk * 0.2));
    // Lake-breath
    const breathCol = lerpInt(hexToInt(P.cream), l.haze, 0.3 + night * 0.4);
    const breathA = clamp01(0.22 + dawn * 0.4 + mist * 0.55 + rain * 0.3 + night * 0.12 - golden * 0.05);
    for (const b of this.breath) b.o.setTint(breathCol).setAlpha(breathA * 0.8);
    for (const c of this.curls) c.o.setTint(breathCol);
    this.curlAlpha = clamp01(0.2 + dawn * 0.6 + mist * 0.5 + rain * 0.2 + night * 0.15);

    // --- Ground band
    const g = l.ground;
    for (const o of this.ground) o.setTint(g);
    this.shop.setTint(g);
    this.dock.setTint(g);
    this.trees.setTint(g);
    for (const b of this.bamboo) b.setTint(g);
    this.shopGlow.setAlpha(l.warmLight * clamp01(dusk * 0.6 + night) * 0.85);
    this.smokeAlpha = 0.32 + dawn * 0.3 + golden * 0.1 - rain * 0.1;
    const smokeCol = lerpInt(lerpInt(hexToInt(P.cream), hexToInt(P.butter), golden * 0.8), g, 0.4);
    for (const s of this.smoke) s.o.setTint(smokeCol);
    const mistCol = lerpInt(hexToInt(P.cream), l.haze, 0.25);
    for (const m of this.groundMist) m.o.setTint(mistCol).setAlpha(mist * 0.5);
    for (const m of this.walkMist) m.o.setTint(lerpInt(mistCol, l.horizon, 0.3)).setAlpha(rain * (m.f < 1 ? 0.5 : 0.38));

    this.fg.applyLight(l, this.w, rain);
  }

  private tintBand(b: Band, tint: number, haze: number, hazeA: number, alpha: number): void {
    for (const o of b.imgs) o.setTint(tint).setAlpha(alpha);
    for (const o of b.haze) o.setTintFill(haze).setAlpha(hazeA * alpha);
  }

  private tintRow(r: DriftRow, top: number, bot: number, alpha = 1): void {
    for (const t of r.tiles) {
      if (r.flip) t.setTint(bot, bot, top, top);
      else t.setTint(top, top, bot, bot);
      t.setAlpha(alpha);
    }
    r.fill.setTint(bot).setAlpha(alpha);
  }

  private tintRefl(rows: ReflRow[], tint: number): void {
    for (const r of rows) r.o.setTint(tint).setAlpha(this.reflAlpha);
  }

  private setDuskClimb(climb: number, alpha: number): void {
    const y0 = BAND.snow.y0;
    const y1 = BAND.snow.y1;
    const line = 340 - climb * 246;
    const info = stripInfo('land_snow');
    if (!info) return;
    this.duskShadow.forEach((row, k) => {
      const yy = Math.max(y0, Math.min(y1, line + k * 9));
      row.forEach((o, i) => {
        const c = info.chunks[i];
        o.setCrop(0, (yy - y0) * S, c.w * S, (y1 - yy) * S);
        o.setAlpha(alpha * 0.42);
      });
    });
  }

  /** 0..1: the finale parts the rain clouds and reveals the stars and the Gurans. */
  setSkyOpen(a: number): void {
    this.skyOpen = clamp01(a);
  }

  guransAnchor(): { x: number; y: number } {
    return { x: GURANS.fx, y: GURANS.y };
  }

  // -------------------------------------------------------------------------
  // Per-frame
  // -------------------------------------------------------------------------

  update(time: number, delta: number): void {
    const t = (this.t = time / 1000);
    const dt = Math.min(delta, 50) / 1000;
    const W = this.w;
    const cam = this.camX();
    const open = this.skyOpen;

    // Stars / Gurans (re-applied only when visibility or skyOpen changes; twinkle per frame).
    const vis = Math.max(this.starVis, open * 0.95);
    if (vis > 0.001) {
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        const v = clamp01((vis - s.th) * 4);
        let a = v * s.base;
        if (s.tw > 0) a *= 0.7 + 0.3 * Math.sin(t * s.tw + s.ph);
        s.o.setAlpha(a);
      }
      const ga = clamp01((vis - 0.18) * 3);
      for (let i = 0; i < this.gurans.length; i++) {
        const g = this.gurans[i];
        const tw = 0.85 + 0.15 * Math.sin(t * 1.3 + i * 1.7);
        g.core.setAlpha(ga * tw);
        g.halo.setAlpha(ga * (0.4 + open * 0.4) * tw);
      }
      const ma = clamp01((vis - 0.5) * 2) * 0.32;
      this.milky[0].setAlpha(ma);
      this.milky[1].setAlpha(ma * 0.7);
      this.appliedSkyOpen = open;
    } else if (this.appliedSkyOpen !== 0) {
      for (const s of this.stars) s.o.setAlpha(0);
      for (const g of this.gurans) {
        g.core.setAlpha(0);
        g.halo.setAlpha(0);
      }
      this.milky[0].setAlpha(0);
      this.milky[1].setAlpha(0);
      this.appliedSkyOpen = 0;
    }

    // Rain ceiling parts around the Gurans when the sky opens.
    const ca = this.ceilAlpha * (1 - open * 0.75);
    if (ca > 0.001 || this.ceiling[0].o.alpha > 0) {
      const gx = this.viewW * GURANS.fx;
      const drift = (t * 2) % SEA_TILE.w;
      for (const c of this.ceiling) {
        let x = c.bx + drift;
        if (x > SKY_W) x -= SEA_TILE.w * 4;
        const mid = x + SEA_TILE.w / 2;
        x += (mid < gx ? -1 : 1) * open * 260;
        c.o.x = x;
        c.o.setAlpha(ca);
      }
      this.ceilFill.setAlpha(ca);
    }
    this.shaft.setTint(hexToInt(A['moon-gurans'])).setAlpha(open * this.ceilAlpha * 0.35);

    // Pillow clouds drift.
    if (this.clouds[0].o.alpha > 0.001) {
      for (const c of this.clouds) {
        const span = this.viewW + 300;
        const x = ((c.x * this.viewW + t * c.speed + 150) % span) - 150;
        c.o.x = x;
      }
    }

    // Cloud banner breathes.
    if (this.bannerAlpha > 0.001) {
      this.banner.setAlpha(this.bannerAlpha * (0.85 + 0.15 * Math.sin(t * 0.4)));
      this.banner.setScale(K * (1 + 0.06 * Math.sin(t * 0.23)), K * (1 + 0.04 * Math.sin(t * 0.31 + 1)));
    } else if (this.banner.alpha !== 0) this.banner.setAlpha(0);

    // Cloud sea rows drift in opposite directions; rise per key.
    const raise = this.seaRaise;
    this.driftUpdate(this.seaBack, t, -raise);
    this.driftUpdate(this.seaFront, t, -raise * 0.9);
    if (this.swallowFar.tiles[0].alpha > 0.001) this.driftUpdate(this.swallowFar, t, 30 - raise * 0.6);
    if (this.swallowMid.tiles[0].alpha > 0.001) this.driftUpdate(this.swallowMid, t, 40 - this.mist * 40);

    // Cloud spill through the saddle: 40 s loop (twice as fast in rain).
    const loop = 40 / (1 + this.rain);
    for (let i = 0; i < this.spill.length; i++) {
      const u = ((t / loop + i * 0.5) % 1 + 1) % 1;
      const env = Math.min(1, u / 0.15) * (1 - smooth(0.55, 1, u));
      const o = this.spill[i];
      o.y = SPILL.y - 30 + u * 80;
      this.setX(o, SPILL.x + u * 18, PARALLAX.far);
      o.setScale(K * (0.9 + u * 0.25), K * (0.8 + u * 0.5));
      o.setAlpha(this.spillAlpha * env);
    }

    // Valley ribbons, lake-breath, mist.
    this.ribbonUpdate(this.ribbons, t);
    this.ribbonUpdate(this.breath, t);
    if (this.mist > 0.001) this.ribbonUpdate(this.groundMist, t);
    if (this.rain > 0.001) this.ribbonUpdate(this.walkMist, t);

    // Window necklace: one by one, 0.4 s apart; gentle flicker at night.
    const since = t - this.necklaceAt;
    for (let i = 0; i < this.windows.length; i++) {
      const wdw = this.windows[i];
      const target = this.necklaceOn ? (since > i * 0.4 ? 1 : 0) : since > i * 0.4 ? 0 : 1;
      wdw.v += Phaser.Math.Clamp(target - wdw.v, -dt * 4, dt * 4);
      const fl = 0.86 + 0.14 * Math.sin(t * 5.1 + i * 2.1) * Math.sin(t * 1.7 + i);
      const a = wdw.v * fl * this.windowNight;
      wdw.core.setAlpha(a);
      wdw.bloom.setAlpha(a * 0.85);
    }

    // Waterfall threads: 2 always, 5 in rain (fading in over 20 s).
    this.threadRain += Phaser.Math.Clamp((this.rain > 0.5 ? 1 : 0) - this.threadRain, -dt / 20, dt / 20);
    const thA = (1 - this.mist * 0.8) * (1 - W.night * 0.5);
    for (let i = 0; i < this.threads.length; i++) {
      const th = this.threads[i];
      const v = (i < 2 ? 1 : this.threadRain) * thA;
      th.line.setAlpha(v * 0.5);
      for (let k = 0; k < th.dash.length; k++) {
        const u = (t * 0.45 + k * 0.5 + i * 0.13) % 1;
        th.dash[k].y = th.y0 + u * th.len;
        th.dash[k].setAlpha(v * 0.8 * Math.sin(u * Math.PI));
      }
      for (let k = 0; k < th.puff.length; k++) th.puff[k].setAlpha(v * (0.35 + 0.15 * Math.sin(t * 1.4 + k * 2 + i)));
    }

    // Steam curls off the canopy in rain.
    for (let i = 0; i < this.steam.length; i++) {
      const s = this.steam[i];
      if (this.steamAlpha < 0.001) {
        if (s.o.alpha !== 0) s.o.setAlpha(0);
        continue;
      }
      const u = (t / 10 + s.ph) % 1;
      s.o.y = s.y - u * 40;
      s.o.setAlpha(this.steamAlpha * Math.sin(u * Math.PI));
      s.o.setScale(K * (0.7 + u * 0.4));
    }

    // Junkiri ribbon rises once at dusk (15 s).
    if (this.junkiriArmed && W.dusk > 0.5 && this.rain < 0.5) {
      this.junkiriArmed = false;
      this.junkiriT = t;
    }
    const jt = this.junkiriT >= 0 ? t - this.junkiriT : 99;
    if (jt < 15) {
      const env = Math.min(1, jt / 2) * (1 - smooth(11, 15, jt));
      const baseX = cam * PARALLAX.near + this.viewW * 0.3;
      for (let i = 0; i < this.junkiri.length; i++) {
        const o = this.junkiri[i];
        const x = baseX + i * 16 + jt * 6;
        const y = 440 - jt * 9 - i * 1.2 + Math.sin(i * 0.55 - t * 1.6) * 10;
        this.setX(o, x, PARALLAX.near);
        o.y = y;
        o.setAlpha(env * (0.6 + 0.4 * Math.sin(t * 4 + i)));
      }
    } else if (this.junkiri[0].alpha !== 0) for (const o of this.junkiri) o.setAlpha(0);

    // Reflections ripple in rows.
    this.reflUpdate(this.refl.far, t, 0.5);
    this.reflUpdate(this.refl.mid, t, 0.65);
    this.reflUpdate(this.refl.near, t, 0.8);
    this.reflUpdate(this.refl.dock, t, 1);

    // Sun / moon path.
    if (this.pathAlpha > 0.001) {
      for (let i = 0; i < this.path.length; i++) {
        const o = this.path[i];
        const yy = LAKE_Y + 6 + i * i * 1.45 + i * 3;
        const wob = Math.sin(t * 1.3 + i * 1.9);
        const wd = (0.55 + i * 0.12) * (0.75 + 0.25 * wob);
        o.setPosition(this.pathX + Math.sin(t * 0.9 + i * 2.7) * (3 + i), yy);
        o.setScale(K * wd * (1 + i * 0.08), K * (0.5 + i * 0.04));
        o.setAlpha(this.pathAlpha * (0.45 + 0.35 * Math.sin(t * 2.1 + i * 1.3)) * (1 - i / 16));
      }
    } else if (this.path[0].alpha !== 0) for (const o of this.path) o.setAlpha(0);

    // Glints twinkle by day.
    if (this.glintAlpha > 0.001) {
      for (const g of this.glints) {
        const s = Math.sin(t * g.rate + g.ph);
        g.o.setAlpha(this.glintAlpha * (s > 0.6 ? (s - 0.6) / 0.4 : 0));
      }
    } else if (this.glints[0].o.alpha !== 0) for (const g of this.glints) g.o.setAlpha(0);

    // Rain rings in 2 sizes.
    this.ringTimer -= dt * this.rain * 26;
    while (this.ringTimer < 0) {
      this.ringTimer += 1;
      this.spawnRing(cam);
    }
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t += dt / r.life;
      const u = Math.min(1, r.t);
      r.o.setScale(K * r.size * (0.12 + u * 0.5), K * r.size * (0.04 + u * 0.16));
      r.o.setAlpha((1 - u) * 0.7);
      if (r.t >= 1) r.o.setAlpha(0);
    }

    // Lake-breath curls lift off the water.
    for (let i = 0; i < this.curls.length; i++) {
      const c = this.curls[i];
      const u = (t / 12 + c.ph) % 1;
      c.o.y = c.y - u * 26;
      this.setX(c.o, c.x + u * 20, MIST_F.breath);
      c.o.setAlpha(this.curlAlpha * Math.sin(u * Math.PI) * 0.7);
    }

    // Chimney smoke curl.
    for (let i = 0; i < this.smoke.length; i++) {
      const s = this.smoke[i];
      const u = (t / 7 + s.ph) % 1;
      s.o.y = CHIMNEY.y - 4 - u * 70;
      this.setX(s.o, CHIMNEY.x + Math.sin(u * 5 + t * 0.5) * 7 + u * 26, 1);
      s.o.setScale(K * (0.22 + u * 0.55));
      s.o.setAlpha(this.smokeAlpha * Math.sin(u * Math.PI) * (1 - u * 0.4));
    }

    this.fg.update(t, dt, cam, windAt(t));
  }

  private driftUpdate(r: DriftRow, t: number, dy: number): void {
    const tw = SEA_TILE.w;
    const off = (((t * r.speed) % tw) + tw) % tw;
    for (let k = 0; k < r.tiles.length; k++) this.setX(r.tiles[k], BX0 - tw + off + k * tw, r.f);
    const y = r.y + dy;
    for (const tile of r.tiles) tile.y = r.flip ? y + SEA_TILE.h : y;
    if (!r.flip) r.fill.y = y + SEA_TILE.h - 2;
  }

  private ribbonUpdate(arr: Ribbon[], t: number): void {
    for (const r of arr) {
      const x = ((((r.x + t * r.speed) % r.period) + r.period) % r.period) - 700;
      this.setX(r.o, x, r.f);
    }
  }

  private reflUpdate(rows: ReflRow[], t: number, speed: number): void {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      this.setX(r.o, r.bx + Math.sin(t * speed + r.ph) * r.amp, r.f);
    }
  }

  private spawnRing(cam: number): void {
    let r: Ring | null = null;
    for (const c of this.rings) if (c.t >= 1) {
      r = c;
      break;
    }
    if (!r) return;
    const u = Math.random();
    const y = LAKE_Y + 6 + u * u * (720 - LAKE_Y - 10);
    const persp = 0.35 + (y - LAKE_Y) / 260;
    r.o.y = y;
    this.setX(r.o, cam + Math.random() * this.viewW, 1);
    r.size = (Math.random() < 0.35 ? 1.5 : 0.85) * persp;
    r.life = 0.7 + Math.random() * 0.5;
    r.t = 0;
  }

  destroy(): void {
    this.offLayout?.();
    this.offLayout = null;
    for (const e of this.list) e.o.destroy();
    this.list.length = 0;
  }
}
