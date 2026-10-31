/**
 * Kuhiro preview: ?scene=preview&what=kuhiro&beat=idle|rise|finale|glow|moments|sky|end
 * (sky and end jump straight to the finale's 30-37 s and 37-45 s beats.)
 * A simple night-lake backdrop (palette colours only) with a dock on the left.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { anyParam } from '@/core/debug';
import { ART_SCALE, layout } from '@/core/layout';
import { lightAt, type ResolvedLight } from '@/fx/lighting';
import { Fireflies, Rain, ripple } from '@/fx/particles';
import { blobPath, type Ctx, fillOutline, rGrad, roundRectPath, smoothOpen, vGrad, withState, artRng, noise1 } from '@/art/kit';
import { A, LIGHT, P, hexToInt, mix, mixInt, rgba } from '@/palette';
import { GlowSighting, Kuhiro, UnderGlow } from './Kuhiro';
import { cloudPartingPlume, highlightGurans, playRainbow, playShootingStar, showMoonbow } from '@/world/skyMoments';

const DOCK_Y = 575;
const WATER_Y = 590;
const HORIZON = 452;

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, Math.ceil(w * ART_SCALE), Math.ceil(h * ART_SCALE));
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  draw(ctx, w, h);
  ct.refresh();
}

class Backdrop {
  skyA: Phaser.GameObjects.Image;
  skyB: Phaser.GameObjects.Image;
  stars: Phaser.GameObjects.Image[] = [];
  gurans: { x: number; y: number };
  snow: Phaser.GameObjects.Image;
  far: Phaser.GameObjects.Image;
  near: Phaser.GameObjects.Image;
  lake: Phaser.GameObjects.Image;
  hazeFar: Phaser.GameObjects.Image;
  breath: Phaser.GameObjects.Image[] = [];
  dock: Phaser.GameObjects.Container;
  dockImg: Phaser.GameObjects.Image;
  vignette: Phaser.GameObjects.Image;
  breathK = 1;

  constructor(scene: Phaser.Scene, w: number, dockEnd: number) {
    const K = 1 / ART_SCALE;
    this.skyA = scene.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(w, 270).setDepth(DEPTH.sky);
    this.skyB = scene.add.image(0, 270, 'px').setOrigin(0).setDisplaySize(w, HORIZON - 270 + 4).setDepth(DEPTH.sky);
    const r = artRng(5);
    for (let i = 0; i < 90; i++) {
      const s = scene.add.image(r() * w, r() * 300, 'dot').setTint(hexToInt(P.cream)).setDepth(DEPTH.stars);
      s.setScale((0.12 + r() * 0.22) * K).setData('a', 0.35 + r() * 0.6);
      this.stars.push(s);
    }
    this.gurans = { x: w * 0.7, y: 132 };
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const rr = i < 5 ? 18 : 0;
      const s = scene.add.image(this.gurans.x + Math.cos(a) * rr, this.gurans.y + Math.sin(a) * rr, 'dot').setTint(hexToInt(P.cream)).setDepth(DEPTH.stars);
      s.setScale(0.42 * K).setData('a', 0.95);
      this.stars.push(s);
    }

    canvasTex(scene, 'pv_snow', w, 240, (ctx) => {
      const peaks = [
        [w * 0.18, 150, 300, 150],
        [w * 0.4, 130, 340, 170],
        [w * 0.6, 108, 380, 192],
        [w * 0.8, 140, 320, 160],
        [w * 0.97, 160, 300, 140],
      ];
      for (const [cx, top, wid] of peaks) {
        ctx.beginPath();
        const base = 240;
        smoothOpen(ctx, [
          [cx - wid / 2, base],
          [cx - wid * 0.2, top + 40],
          [cx, top - 6],
          [cx + wid * 0.25, top + 46],
          [cx + wid / 2, base],
        ]);
        ctx.closePath();
        ctx.fillStyle = vGrad(ctx, top, base, [
          [0, A.snow],
          [1, A['snow-shade']],
        ]);
        ctx.fill();
      }
    });
    this.snow = scene.add.image(0, 70, 'pv_snow').setOrigin(0).setScale(K).setDepth(DEPTH.far - 1);

    canvasTex(scene, 'pv_far', w, 180, (ctx, ww, hh) => {
      const n = noise1(11);
      const pts: [number, number][] = [];
      for (let x = -20; x <= ww + 20; x += 30) pts.push([x, 50 + n(x / 160) * 60 + Math.sin(x / 210) * 14]);
      ctx.beginPath();
      smoothOpen(ctx, pts);
      ctx.lineTo(ww + 20, hh);
      ctx.lineTo(-20, hh);
      ctx.closePath();
      ctx.fillStyle = A['ridge-far'];
      ctx.fill();
    });
    this.far = scene.add.image(0, 250, 'pv_far').setOrigin(0).setScale(K).setDepth(DEPTH.far);
    this.hazeFar = scene.add.image(0, 300, 'gradV').setOrigin(0).setDisplaySize(w, 170).setDepth(DEPTH.hazeFar);

    canvasTex(scene, 'pv_near', w, 140, (ctx, ww, hh) => {
      const rr = artRng(21);
      for (let x = -20; x < ww + 40; x += 26 + rr() * 30) {
        if (rr() < 0.45) {
          const hgt = 70 + rr() * 50;
          ctx.beginPath();
          ctx.ellipse(x, hh - hgt / 2, 16 + rr() * 6, hgt / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = A.dhupi;
          ctx.fill();
        } else {
          ctx.beginPath();
          blobPath(ctx, x, hh - 26, 34 + rr() * 16, 30 + rr() * 10, 0.1, (x | 0) + 3);
          ctx.fillStyle = P.moss;
          ctx.fill();
        }
      }
      ctx.fillStyle = A.dhupi;
      ctx.fillRect(-20, hh - 20, ww + 40, 20);
    });
    this.near = scene.add.image(0, HORIZON - 132, 'pv_near').setOrigin(0).setScale(K).setDepth(DEPTH.near);

    canvasTex(scene, 'pv_lake', w, 720 - HORIZON, (ctx, ww, hh) => {
      ctx.fillStyle = vGrad(ctx, 0, hh, [
        [0, A['lake-jade']],
        [1, A['lake-deep']],
      ]);
      ctx.fillRect(0, 0, ww, hh);
      // Soft horizontal shimmer dashes.
      const rr = artRng(8);
      for (let i = 0; i < 70; i++) {
        const y = rr() * hh;
        const len = 10 + rr() * 50 * (0.4 + y / hh);
        ctx.fillStyle = rgba(P.cream, 0.05 + rr() * 0.07);
        ctx.beginPath();
        roundRectPath(ctx, rr() * ww, y, len, 1.6, 0.8);
        ctx.fill();
      }
      ctx.fillStyle = rgba(P.cream, 0.18);
      ctx.fillRect(0, 0, ww, 1.4);
    });
    this.lake = scene.add.image(0, HORIZON, 'pv_lake').setOrigin(0).setScale(K).setDepth(DEPTH.water);
    for (let i = 0; i < 4; i++) {
      const m = scene.add.image(w * (0.1 + i * 0.28), HORIZON + 6 + (i % 2) * 14, 'mistBlob').setDepth(DEPTH.water + 0.2).setScale(K * 1.2, K * 0.7);
      this.breath.push(m);
    }

    // Dock: 5 rounded planks on 3 round posts, reaching right over the water.
    const dw = dockEnd + 30;
    canvasTex(scene, 'pv_dock', dw, 140, (ctx) => {
      const posts = [dockEnd - 220, dockEnd - 110, dockEnd - 10];
      for (const px of posts) {
        ctx.beginPath();
        roundRectPath(ctx, px - 7, 10, 14, 100, 6);
        fillOutline(ctx, vGrad(ctx, 10, 110, [
          [0, A['shop-wood']],
          [1, mix(A['shop-wood'], P.bark, 0.6)],
        ]), P.bark, 2);
      }
      const pw = (dockEnd + 6) / 5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        roundRectPath(ctx, i * pw - 4, 0, pw + 2, 13, 6);
        fillOutline(ctx, A['shop-wood'], P.bark, 2);
      }
      withState(ctx, () => {
        ctx.fillStyle = rGrad(ctx, dockEnd - 10, 112, 0, 26, [
          [0, P.cream, 0.18],
          [1, P.cream, 0],
        ]);
        ctx.fillRect(dockEnd - 40, 100, 60, 24);
      });
    });
    this.dock = scene.add.container(0, DOCK_Y).setDepth(DEPTH.ground);
    this.dockImg = scene.add.image(0, 0, 'pv_dock').setOrigin(0, 0).setScale(K);
    this.dock.add(this.dockImg);

    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(w, 720).setDepth(DEPTH.vignette);
  }

  apply(l: ResolvedLight, skyOpen = 0): void {
    // Keep the night indigo even under rain (the rainy key greys it a lot).
    const n = 0.55 * l.night;
    const top = mixInt(l.hex.skyTop, LIGHT.night.skyTop, n);
    const midC = mixInt(l.hex.skyMid, mix(LIGHT.night.skyTop, LIGHT.night.horizon, 0.55), n);
    const hor = mixInt(l.hex.horizon, LIGHT.night.horizon, n * 0.6);
    this.skyA.setTint(top, top, midC, midC);
    this.skyB.setTint(midC, midC, hor, hor);
    const starA = Math.max(l.stars, skyOpen * l.night);
    for (const s of this.stars) s.setAlpha(starA * (s.getData('a') as number));
    this.snow.setTint(mixInt(l.hex.far, l.hex.horizon, 0.5)).setAlpha(l.night > 0.5 ? (l.rain > 0.5 ? 0.1 : 0.35) : 1 - l.rain * 0.9);
    this.far.setTint(mixInt(l.hex.far, l.hex.horizon, 0.35));
    this.near.setTint(l.near);
    this.hazeFar.setTint(l.haze).setAlpha(l.hazeAlpha * 0.7);
    this.lake.setTint(l.water);
    for (const m of this.breath) m.setTint(mixInt(P.cream, l.hex.haze, 0.4)).setAlpha(0.35 * this.breathK);
    this.dockImg.setTint(l.ground);
    this.vignette.setAlpha(l.vignette);
  }
}

export default function preview(scene: Phaser.Scene): void {
  const L = layout();
  const w = L.w;
  const beat = anyParam('beat') ?? 'idle';
  const kx = Math.round(Math.min(w - 560, w * 0.5 + 40));
  const dockEnd = kx - 168;
  const bd = new Backdrop(scene, w, dockEnd);
  let rainAmt = beat === 'moments' ? 0 : 1;
  let skyOpen = 0;
  let light = lightAt(1, rainAmt);
  const rain = new Rain(scene, w, 720, DEPTH.rain, 640);
  rain.set(rainAmt, true);
  const ff = new Fireflies(scene, { x0: 30, x1: Math.max(200, kx - 240), y0: 380, y1: 560 }, 20);
  ff.setAmount(0.6, true);

  const kuhiro = new Kuhiro(scene, kx, WATER_Y);
  kuhiro.on('nuzzle', () => {
    scene.tweens.add({ targets: bd.dock, y: DOCK_Y + 5, duration: 160, yoyo: true, ease: 'Sine.easeOut', repeat: 1 });
    ripple(scene, dockEnd - 10, DOCK_Y + 40, { rings: 2, size: 0.7, depth: DEPTH.ground + 1 });
  });

  const relight = () => {
    light = lightAt(beat === 'moments' ? light.p : 1, rainAmt);
    bd.apply(light, skyOpen);
    kuhiro.setLight(light);
  };
  relight();
  // Game-clock seconds since the beat started (screenshot scripts wait on it).
  const win = window as unknown as { __pvT?: number; __pvPause?: (on: boolean) => void; __pvSlept?: number; __pvWake?: () => void };
  // &stops=14,23.5: the game loop sleeps when the beat clock reaches each stop
  // (window.__pvSlept = stop) until a script calls __pvWake() after its screenshot.
  const stops = (anyParam('stops') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  win.__pvSlept = -1;
  if (stops.length) {
    // Software GL: run the loop, timers and tweens all on the same wall clock
    // (no delta smoothing), and let tweens swallow the screenshot pauses.
    (scene.game.loop as unknown as { smoothStep: boolean }).smoothStep = false;
    // Tweens normally run on Date.now(); drive them from the loop delta instead.
    (scene.tweens as unknown as { getDelta: () => number }).getDelta = () => scene.game.loop.delta;
  }
  win.__pvWake = () => {
    win.__pvSlept = -1;
    scene.game.loop.resetDelta(); // the screenshot pause must not count as game time
    scene.game.loop.wake();
  };
  let beatMs = 0;
  win.__pvT = 0;
  let paused = false;
  win.__pvPause = (on: boolean) => {
    paused = on;
  };
  // &fixed=1: every rendered frame advances exactly 1/60 s (deterministic screenshots on slow GPUs).
  if (anyParam('fixed')) {
    const loop = scene.game.loop as unknown as {
      raf: { stop(): void; start(cb: (t: number) => void, forceSetTimeOut: boolean, delay: number): void };
      step(t: number): void;
      lastTime: number;
      forceSetTimeOut: boolean;
      _target: number;
    };
    let vt = loop.lastTime;
    loop.raf.stop();
    loop.raf.start(
      () => {
        if (paused) return;
        vt += 1000 / 60;
        loop.step(vt);
      },
      loop.forceSetTimeOut,
      loop._target,
    );
  }
  scene.events.on(Phaser.Scenes.Events.UPDATE, (t: number, d: number) => {
    // Beat clock in game time (accumulated loop delta, like tweens and timers),
    // not wall time: software GL can run far slower than real time.
    beatMs += d;
    win.__pvT = beatMs / 1000;
    if (stops.length && win.__pvT >= stops[0]) {
      win.__pvSlept = stops.shift();
      scene.game.loop.sleep();
    }
    rain.update(d / 1000);
    ff.update(t, d);
    kuhiro.tick(t, d);
  });

  const wait = (ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, () => r()));

  if (beat === 'idle') {
    void kuhiro.rise(10).then(() => kuhiro.setHappy(false));
    const ug = new UnderGlow(scene, kx + 60, WATER_Y);
    ug.set(0.42, 10);
  } else if (beat === 'rise') {
    const ug = new UnderGlow(scene, kx + 60, WATER_Y);
    ug.set(0.45, 2500);
    void wait(600).then(() => kuhiro.rise());
  } else if (beat === 'glow') {
    rainAmt = 0;
    rain.set(0, true);
    relight();
    const gs = new GlowSighting(scene);
    const loop = () => void gs.play(w * 0.72, 470).then(() => wait(1200)).then(loop);
    loop();
  } else if (beat === 'finale') {
    void runFinale();
  } else if (beat === 'moments') {
    void runMoments();
  } else if (beat === 'end') {
    // Finale 37-45 s: a freckle-light drifts to the dock, a last slow blink, it sinks in rings.
    const ug = new UnderGlow(scene, kx + 60, WATER_Y);
    ug.set(0.5, 10);
    void kuhiro.rise(10).then(async () => {
      kuhiro.setHappy(true);
      await kuhiro.lightFreckles();
      await kuhiro.releaseFreckle(dockEnd - 30, DOCK_Y - 40);
      await kuhiro.slowBlink();
      ug.set(0, 3200);
      await kuhiro.sink(3200);
    });
  } else if (beat === 'sky') {
    // Straight to the plume and the sky opening (finale 30-37 s), for quick checks.
    const ug = new UnderGlow(scene, kx + 60, WATER_Y);
    ug.set(0.5, 10);
    rainAmt = 0.55;
    rain.set(0.4, true);
    relight();
    void kuhiro.rise(10).then(async () => {
      kuhiro.setHappy(true);
      await kuhiro.lightFreckles();
      kuhiro.once('plume', skyReveal);
      await kuhiro.breathePlume();
    });
  }
  // Setup above can block for a long time on software GL: do not count it as game time.
  if (stops.length) scene.game.loop.resetDelta();

  /** The great plume parts the clouds: stars, the Gurans and a moonbow (finale 30-37 s). */
  function skyReveal(px: number, py: number): void {
    void cloudPartingPlume(scene, px, py);
    const s = { v: 0 };
    const r0 = rainAmt;
    scene.tweens.add({
      targets: s,
      v: 1,
      duration: 5000,
      delay: 2200,
      onUpdate: () => {
        skyOpen = s.v;
        rainAmt = r0 * (1 - s.v);
        relight();
      },
    });
    rain.set(0);
    scene.time.delayedCall(3200, () => void highlightGurans(scene, bd.gurans.x, bd.gurans.y));
    scene.time.delayedCall(4200, () => showMoonbow(scene, { centerX: kx + 40, hold: true }));
    scene.time.delayedCall(2600, () => ff.swirl(kx - 120, 420));
    ff.setAmount(1);
  }

  async function runFinale(): Promise<void> {
    const ug = new UnderGlow(scene, kx + 60, WATER_Y);
    // 0-5 s: the rain thins to 40%.
    rain.set(0.4);
    const r0 = { v: 1 };
    scene.tweens.add({ targets: r0, v: 0.55, duration: 4000, onUpdate: () => ((rainAmt = r0.v), relight()) });
    await wait(5000);
    // 5-11 s: the glow wells up, the lake lights from below, the mist thickens.
    ug.set(0.5, 5000);
    scene.tweens.add({ targets: bd, breathK: 2.2, duration: 5000, onUpdate: () => bd.apply(light, skyOpen) });
    for (let i = 0; i < 4; i++) scene.time.delayedCall(i * 1300, () => ripple(scene, dockEnd + 40 + i * 30, WATER_Y + 18, { rings: 2, size: 1.2 + i * 0.3, depth: DEPTH.water + 1.6, tint: A['lake-glow'] }));
    await wait(6000);
    // 11-17 s: Kuhiro rises.
    await kuhiro.rise(5000);
    await wait(500);
    // 17-21 s: slow-blink at Tuki.
    await kuhiro.slowBlink();
    await wait(1200);
    // 21-25 s: nuzzle the dock.
    await kuhiro.nuzzle();
    // 25-30 s: the momos float to its mouth; it eats, the freckles light one by one.
    const m = kuhiro.mouthPoint();
    const orb = scene.add.image(dockEnd - 20, DOCK_Y - 14, 'glowSmall').setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(A['fish-glow'])).setDepth(DEPTH.fx).setScale(0.9 / ART_SCALE);
    const eatP = kuhiro.eat();
    scene.tweens.add({ targets: orb, x: m.x, y: m.y, duration: 900, ease: 'Sine.easeInOut', onComplete: () => orb.destroy() });
    await wait(1800);
    void kuhiro.lightFreckles();
    kuhiro.setHappy(true);
    await eatP;
    await wait(400);
    // 30-37 s: the great plume parts the clouds; the Gurans and a moonbow appear.
    kuhiro.once('plume', skyReveal);
    await kuhiro.breathePlume();
    await wait(500);
    // 37-42 s: one freckle-light drifts to the dock; a last slow blink.
    void kuhiro.releaseFreckle(dockEnd - 30, DOCK_Y - 40);
    await wait(2600);
    await kuhiro.slowBlink();
    await wait(600);
    // 42-45 s: it sinks in widening rings.
    ug.set(0, 3200);
    await kuhiro.sink(3200);
  }

  async function runMoments(): Promise<void> {
    // Clear night: Wishing Star.
    light = lightAt(1, 0);
    relight();
    await wait(400);
    await playShootingStar(scene);
    await wait(800);
    // Dawn after rain: Monsoon Rainbow.
    light = lightAt(0.09, 0);
    relight();
    await playRainbow(scene, { centerX: w * 0.58, hold: 6000 });
    // Night again: Moonbow.
    rainAmt = 0.3;
    rain.set(0.3, true);
    light = lightAt(1, 0.3);
    relight();
    showMoonbow(scene, { centerX: w * 0.58 });
  }
}
