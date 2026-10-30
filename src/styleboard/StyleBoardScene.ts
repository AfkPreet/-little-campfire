/**
 * M0 style board (?scene=styleboard&page=1|2|3): page 1 the cast (Tuki's
 * expressions, poses and walk; Kopila; Boju; Kuhiro) and the palette; page 2
 * the camp landscape at dawn, day, golden hour, dusk, night and in rain;
 * page 3 the UI parts (card, buttons, toast, catch card, bubbles...).
 */
import Phaser from 'phaser';
import { SCENES } from '@/config';
import { anyParam, markReady } from '@/core/debug';
import { layout, setupCamera } from '@/core/layout';
import { Hero, type HeroPose } from '@/chars/Hero';
import { Kopila, BudBush } from '@/chars/Kopila';
import { Boju } from '@/chars/Boju';
import { Kuhiro } from '@/chars/Kuhiro';
import { EXPRESSIONS } from '@/chars/rig';
import { LIGHT_PRESETS, lightAt } from '@/fx/lighting';
import { Landscape } from '@/world/Landscape';
import { A, ACCENTS, P, hexToInt, mix } from '@/palette';
import { txt, txtObj } from '@/ui';

type Ticker = { tick: (t: number, d: number) => void };

export default class StyleBoard extends Phaser.Scene {
  private tickers: Ticker[] = [];
  private lands: Landscape[] = [];

  constructor() {
    super({ key: SCENES.styleboard });
  }

  async create(): Promise<void> {
    setupCamera(this);
    this.tickers = [];
    this.lands = [];
    const page = Number(anyParam('page') ?? 1);
    const l = layout();
    const bg = this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(l.w, l.h);
    const li = lightAt(0.3);
    bg.setTint(hexToInt(mix(li.hex.skyTop, P.cream, 0.55)), hexToInt(mix(li.hex.skyTop, P.cream, 0.55)), hexToInt(mix(P.cream, P.peach, 0.2)), hexToInt(mix(P.cream, P.peach, 0.2)));
    const titles = ['', 'Moonlight Momos · style board · cast & palette', 'style board · Junkiri Danda in every light', 'style board · UI kit'];
    txt(this, 28, 30, titles[page] ?? '', 'hand', { align: 'left', size: 30, color: P.ink });
    if (page === 1) this.cast();
    else if (page === 2) this.world();
    else if (page === 3) {
      const mod = await import('@/ui/ui.preview');
      await mod.default(this);
    }
    markReady(this, 1200);
  }

  private label(x: number, y: number, s: string): void {
    txt(this, x, y, s, 'small', { size: 16, color: mix(P.ink, P.cream, 0.25) });
  }

  private cast(): void {
    const l = layout();
    const W = l.w;
    // Row 1: expressions.
    const exY = 210;
    const exStep = Math.min(130, (W * 0.62) / EXPRESSIONS.length);
    EXPRESSIONS.forEach((e, i) => {
      const x = 70 + i * exStep;
      const h = new Hero(this, x, exY);
      h.setExpression(e);
      this.tickers.push(h);
      this.label(x, exY + 22, e);
    });
    // Row 2: poses + walk.
    const poses: HeroPose[] = ['sit', 'fish', 'eat', 'pick', 'rest', 'sleep'];
    const pY = 400;
    poses.forEach((p, i) => {
      const x = 70 + i * exStep;
      const h = new Hero(this, x, pY);
      h.setPose(p);
      this.tickers.push(h);
      this.label(x, pY + 22, p);
    });
    // Rain hood + glowing tier + walker.
    const rainHero = new Hero(this, 70, 590);
    rainHero.setRain(true);
    this.tickers.push(rainHero);
    this.label(70, 612, 'ghum (rain)');
    const blissHero = new Hero(this, 70 + exStep, 590);
    blissHero.setTier('blissful');
    blissHero.setExpression('blissful');
    this.tickers.push(blissHero);
    this.label(70 + exStep, 612, 'blissful');
    const night = new Hero(this, 70 + exStep * 2, 590);
    night.setLightTint(LIGHT_PRESETS.night().actor);
    night.setExpression('sleepy');
    this.tickers.push(night);
    this.label(70 + exStep * 2, 612, 'night tint');
    const walker = new Hero(this, 70 + exStep * 3, 590);
    this.tickers.push(walker);
    const walk = () => walker.walkTo(walker.x < 70 + exStep * 4 ? 70 + exStep * 5.5 : 70 + exStep * 3, () => this.time.delayedCall(300, walk));
    walk();
    this.label(70 + exStep * 4.2, 612, 'hop-walk');

    // Right column: Kopila, Bud Bush, Boju, Kuhiro.
    const rx = W * 0.66;
    const k1 = new Kopila(this, rx + 20, 240);
    k1.setMode('stand');
    const k2 = new Kopila(this, rx + 90, 240);
    k2.setMode('curled');
    this.tickers.push(k1, k2);
    this.label(rx + 55, 262, 'Kopila');
    const bush = new BudBush(this, rx + 200, 244);
    bush.peek(true);
    this.tickers.push(bush);
    this.label(rx + 200, 262, 'Bud Bush peek');
    const boju = new Boju(this, rx + 90, 470);
    boju.setScale(0.62);
    this.tickers.push(boju);
    const counter = this.add.image(rx + 90, 470, 'px').setOrigin(0.5, 0).setDisplaySize(240, 16).setTint(hexToInt(A['shop-wood']));
    void counter;
    this.label(rx + 90, 500, 'Boju');
    const kh = new Kuhiro(this, W - 150, 690);
    kh.setScale(0.36);
    void kh.rise(10);
    this.tickers.push(kh);
    this.label(W - 150, 700, 'Kuhiro');

    // Palette strip.
    const tokens = Object.entries(P);
    const sw = Math.min(46, (W * 0.6 - 40) / tokens.length);
    tokens.forEach(([name, hex], i) => {
      const x = 30 + i * sw;
      const r = this.add.rectangle(x + sw / 2, 670, sw - 4, 40, hexToInt(hex)).setStrokeStyle(2, hexToInt(mix(hex, P.ink, 0.3)));
      void r;
      if (i % 2 === 0) txt(this, x + sw / 2, 700, name, 'small', { size: 11 });
    });
    const acc = ['gurans', 'lake-jade', 'snow', 'tea-green', 'tin-blue', 'oat', 'doko', 'yak', 'pango', 'mistfish', 'fish-glow', 'copper'];
    acc.forEach((name, i) => {
      const x = 30 + i * sw;
      this.add.rectangle(x + sw / 2, 630, sw - 4, 26, hexToInt(ACCENTS[name])).setStrokeStyle(2, hexToInt(mix(ACCENTS[name], P.ink, 0.3)));
    });
    this.events.on('update', (t: number, d: number) => this.tickers.forEach((x) => x.tick(t, d)));
  }

  private world(): void {
    const l = layout();
    const keys: [string, () => ReturnType<typeof lightAt>][] = [
      ['dawn', LIGHT_PRESETS.dawn],
      ['day', LIGHT_PRESETS.day],
      ['golden hour', LIGHT_PRESETS.golden],
      ['dusk', LIGHT_PRESETS.dusk],
      ['night', LIGHT_PRESETS.night],
      ['rain', LIGHT_PRESETS.rain],
    ];
    const cols = 3;
    const gap = 16;
    const tw = (l.w - 40 - gap * (cols - 1)) / cols;
    const th = tw * (720 / 1280);
    keys.forEach(([name, fn], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * (tw + gap);
      const y = 80 + row * (th + 46);
      const holder = this.add.container(x, y);
      const land = new Landscape(this, { container: holder });
      land.applyLight(fn());
      const k = tw / 1280;
      holder.setScale(k);
      // Show the clearing + a little lake: shift the world left.
      holder.x = x - 980 * k;
      const mask = this.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(x, y, tw, th, 14);
      holder.setMask(mask.createGeometryMask());
      const frame = this.add.graphics();
      frame.lineStyle(3, hexToInt(mix(P.cream, P.bark, 0.25)), 1).strokeRoundedRect(x, y, tw, th, 14);
      this.lands.push(land);
      this.add.existing(txtObj(this, x + tw / 2, y + th + 18, name, 'label', { size: 20 }));
    });
    this.events.on('update', (t: number, d: number) => this.lands.forEach((ld) => ld.update(t, d)));
  }
}
