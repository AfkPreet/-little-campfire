/**
 * Trip Album (spec section 5 "Trip end" and section 7): after Night 7 a
 * scrapbook opens — a page per day (the Contentment bloom shows that day's
 * peak, best catch, most-cooked dish, moments), the companion's page, the
 * mystery outcome, and a postcard teasing the next campsite. Buttons: Stay a
 * little longer (free play) and Start a new trip (keeps journal and badges).
 */
import Phaser from 'phaser';
import { directLaunch } from '@/core/debug';
import { DEPTH, SCENES } from '@/config';
import { markReady, registerDebug } from '@/core/debug';
import { go, startTrip } from '@/core/flow';
import { ART_SCALE, layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { S, save, type DayLog } from '@/core/state';
import { STR } from '@/data/dialogue';
import { FISH } from '@/data/fish';
import { MOMENTS } from '@/data/moments';
import { MYSTERY } from '@/data/mystery';
import { WORLD } from '@/data/world';
import type { DishId } from '@/data/ids';
import { lightAt } from '@/fx/lighting';
import { heartBurst, sparkleBurst } from '@/fx/particles';
import { playSfx, setAmbience, setMusicMood } from '@/audio/engine';
import { dawn } from '@/systems/day';
import { hearts } from '@/systems/companion';
import { Hero } from '@/chars/Hero';
import { dishName } from '@/systems/inventory';
import { Button, IconButton, fmt, iconObj, txtObj } from '@/ui';
import { A, P, hexToInt, mix } from '@/palette';

type Page = { kind: 'cover' } | { kind: 'day'; log: DayLog } | { kind: 'friend' } | { kind: 'mystery' } | { kind: 'postcard' };
const INK = P.ink;
const SOFT = mix(P.ink, A.lokta, 0.35);

function icon(scene: Phaser.Scene, id: string): string {
  const k = `item_${id}`;
  return scene.textures.exists(k) ? k : 'icon.star';
}

export default class Album extends Phaser.Scene {
  private pages: Page[] = [];
  private idx = 0;
  private book: Phaser.GameObjects.Container | null = null;
  private k = 1;
  private nav: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: SCENES.album });
  }

  create(): void {
    applyDebugOnce();
    setupCamera(this);
    const s = S();
    s.scene = 'album';
    save('album');
    const l = layout();
    const li = lightAt(0.92);
    const bg = this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(l.w, l.h);
    bg.setTint(li.skyTop, li.skyTop, li.horizon, li.horizon);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(l.w, l.h).setAlpha(0.3);
    this.pages = [{ kind: 'cover' }, ...s.days.slice(0, 7).map((log) => ({ kind: 'day' as const, log })), { kind: 'friend' }, { kind: 'mystery' }, { kind: 'postcard' }];
    this.idx = 0;
    this.k = Math.min(1, (l.w - 140) / 760, (l.h - 150) / 560);
    this.show(false);
    this.buildNav();
    setAmbience({ scene: 'album', p: 0.92, raining: false, inTent: false, nearFire: 0.3, nearWater: 0 });
    setMusicMood('night');
    if (!directLaunch()) this.cameras.main.fadeIn(reduceMotion() ? 200 : 900, 47, 53, 88);
    registerDebug('albumInfo', () => ({ idx: this.idx, pages: this.pages.map((p) => p.kind) }));
    registerDebug('albumTurn', ((d: number) => this.turn(d)) as never);
    registerDebug('albumStay', () => this.stay());
    registerDebug('albumNewTrip', () => this.newTrip());
    markReady(this, 1200);
  }

  private buildNav(): void {
    this.nav?.destroy();
    const l = layout();
    const c = this.add.container(0, 0).setDepth(DEPTH.ui);
    c.add(new IconButton(this, l.safe.left + 50, l.h / 2, { icon: 'icon.arrowLeft', size: 64, variant: 'cream', disabled: this.idx === 0, onTap: () => this.turn(-1) }));
    c.add(new IconButton(this, l.w - l.safe.right - 50, l.h / 2, { icon: 'icon.arrowRight', size: 64, variant: 'cream', disabled: this.idx >= this.pages.length - 1, onTap: () => this.turn(1) }));
    const by = l.h - l.safe.bottom - 48;
    c.add(new Button(this, l.w / 2 - 170, by, { label: STR.album.stay, variant: 'warm', w: 310, onTap: () => this.stay() }));
    c.add(new Button(this, l.w / 2 + 170, by, { label: STR.album.newTrip, variant: 'secondary', w: 280, onTap: () => this.newTrip() }));
    this.nav = c;
  }

  private turn(d: number): void {
    const n = Phaser.Math.Clamp(this.idx + d, 0, this.pages.length - 1);
    if (n === this.idx) return;
    this.idx = n;
    playSfx('page');
    this.show(true, d);
    this.buildNav();
  }

  private show(animate: boolean, dir = 1): void {
    const l = layout();
    const old = this.book;
    const c = this.add.container(l.w / 2 + (animate ? dir * l.w * 0.6 : 0), l.h / 2 - 30).setScale(this.k).setAlpha(animate ? 0 : 1);
    const page = this.add.image(0, 0, 'album_page').setScale(1 / ART_SCALE);
    c.add(page);
    const p = this.pages[this.idx];
    if (p.kind === 'cover') this.cover(c);
    else if (p.kind === 'day') this.day(c, p.log);
    else if (p.kind === 'friend') this.friend(c);
    else if (p.kind === 'mystery') this.mystery(c);
    else this.postcard(c);
    this.book = c;
    if (animate) {
      this.tweens.add({ targets: c, x: l.w / 2, alpha: 1, angle: { from: dir * 4, to: 0 }, duration: reduceMotion() ? 150 : 480, ease: 'Cubic.easeOut' });
      if (old) this.tweens.add({ targets: old, x: old.x - dir * l.w * 0.6, alpha: 0, duration: reduceMotion() ? 150 : 420, ease: 'Cubic.easeIn', onComplete: () => old.destroy() });
    }
  }

  private tape(c: Phaser.GameObjects.Container, x: number, y: number, angle: number, tint: string): void {
    c.add(this.add.image(x, y, 'album_tape').setScale(1 / ART_SCALE).setAngle(angle).setTint(hexToInt(tint)).setAlpha(0.85));
  }

  private cover(c: Phaser.GameObjects.Container): void {
    const s = S();
    c.add(txtObj(this, 0, -170, fmt(STR.album.cover, { n: s.trip }), 'handBig', { size: 56, color: INK }));
    const logo = this.add.image(40, 10, 'logo_main').setScale(0.55 / ART_SCALE);
    c.add(logo);
    // Tuki, sitting happily beside the title like a sticker.
    const tuki = new Hero(this, -250, 130).setPose('sit').setExpression('happy');
    tuki.setScale(1.15).setAngle(-4);
    c.add(tuki);
    this.events.on('update', (t: number, d: number) => tuki.active && tuki.tick(t, d));
    c.add(txtObj(this, 0, 190, `${WORLD.place} · ${WORLD.water}`, 'hand', { size: 28, color: SOFT }));
    this.tape(c, -300, -230, -20, P.rose);
    this.tape(c, 300, 230, -20, A['lake-jade']);
    sparkleBurst(this, layout().w / 2, layout().h / 2 - 60, { count: 18, depth: DEPTH.ui, spread: 1.4 });
  }

  private day(c: Phaser.GameObjects.Container, d: DayLog): void {
    c.add(txtObj(this, -200, -220, fmt(STR.journal.dayPage, { n: d.day }), 'handBig', { size: 50, color: INK }));
    const weather = d.weather === 'rain' ? 'Rainy day' : d.weather === 'mist' ? 'Misty morning' : d.weather === 'golden' ? 'Golden evening' : 'Clear skies';
    c.add(txtObj(this, -200, -170, weather + (d.rainyNight ? ', rain at night' : ''), 'hand', { size: 24, color: SOFT }));
    // Photo: Contentment bloom.
    const photo = this.add.image(-200, 20, 'album_photo').setScale(1 / ART_SCALE).setAngle(-3);
    c.add(photo);
    const g = this.add.graphics();
    const open = 0.35 + 0.65 * Math.min(1, d.peak / 100);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(hexToInt(mix(A.gurans, P.cream, 0.2)), 1).fillEllipse(-200 + Math.cos(a) * 30 * open, 0 + Math.sin(a) * 30 * open, 40 * open, 33 * open);
    }
    g.fillStyle(hexToInt(P.butter), 1).fillCircle(-200, 0, 10 * open + 4);
    c.add(g);
    c.add(txtObj(this, -200, 84, `peak ${Math.round(d.peak)}%`, 'hand', { size: 20, color: SOFT }));
    this.tape(c, -270, -64, -28, P.butter);
    // Right column: best catch, most cooked, moments.
    let y = -150;
    const row = (label: string, value: string, key?: string) => {
      c.add(txtObj(this, 40, y, label, 'hand', { align: 'left', size: 22, color: SOFT }));
      if (key) c.add(iconObj(this, 66, y + 46, key, 56));
      c.add(txtObj(this, key ? 104 : 40, y + 46, value, 'hand', { align: 'left', size: 26, color: INK, wrap: 230 }));
      y += 116;
    };
    if (d.bestCatch) row(STR.album.bestCatch, `${FISH[d.bestCatch.id].name} · ${d.bestCatch.cm.toFixed(1)} cm`, icon(this, d.bestCatch.id));
    const cooked = Object.entries(d.cooked) as [DishId, number][];
    if (cooked.length) {
      const [id, n] = cooked.sort((a, b) => b[1] - a[1])[0];
      row(STR.album.mostCooked, `${dishName(id)}${n > 1 ? ' x' + n : ''}`, icon(this, id));
    }
    if (d.moments.length) row(STR.album.moments, d.moments.map((m) => MOMENTS[m].name).join(', '));
    if (y === -150) row('', STR.summary.quiet);
  }

  private friend(c: Phaser.GameObjects.Container): void {
    const s = S();
    const known = s.journal.friend || s.companion.shareDays.length > 0;
    c.add(txtObj(this, 0, -210, WORLD.companion, 'handBig', { size: 54, color: INK }));
    if (this.textures.exists('kopila_ball')) {
      const img = this.add.image(-150, 10, 'kopila_ball').setScale(3 / ART_SCALE);
      if (!known) img.setTintFill(hexToInt(mix(A.lokta, P.lavender, 0.55))).setAlpha(0.7);
      c.add(img);
    }
    const n = hearts();
    for (let i = 0; i < 3; i++) c.add(this.add.image(80 + i * 70, -60, i < n ? 'journal_heart' : 'journal_heartEmpty').setScale(1.3 / ART_SCALE));
    const line = s.companion.befriended ? STR.companion.friendLine : known ? 'A shy little friend came close.' : 'Something small peeked from the bushes...';
    c.add(txtObj(this, 150, 40, line, 'hand', { size: 26, color: INK, wrap: 300, align: 'center' }));
    if (s.companion.befriended) heartBurst(this, layout().w / 2 + 150 * this.k, layout().h / 2 - 90, 6, DEPTH.ui);
  }

  private mystery(c: Phaser.GameObjects.Container): void {
    const met = S().mystery.step >= 5;
    c.add(txtObj(this, 0, -200, met ? MYSTERY.albumDone : MYSTERY.albumNotDone, 'handBig', { size: 40, color: INK, align: 'center', wrap: 640 }));
    // The guardian's freckle flower (or a faint glow if unmet).
    const cx = 0;
    const cy = 30;
    const glow = this.add.image(cx, cy, 'glow').setTint(hexToInt(A['fish-glow'])).setBlendMode(Phaser.BlendModes.ADD).setAlpha(met ? 0.6 : 0.25).setScale(1.2);
    c.add(glow);
    if (met) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        const x = k === 5 ? cx : cx + Math.cos(a) * 46;
        const y = k === 5 ? cy : cy + Math.sin(a) * 46;
        c.add(this.add.image(x, y, 'glowSmall').setTint(hexToInt(P.glow)).setBlendMode(Phaser.BlendModes.ADD).setScale(k === 5 ? 1.4 : 1.1));
        c.add(this.add.image(x, y, 'dot').setTint(hexToInt(P.butter)).setScale(k === 5 ? 1.1 : 0.9));
      }
    }
    if (!reduceMotion()) this.tweens.add({ targets: glow, alpha: glow.alpha * 0.6, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const clues = S().journal.clues.filter(Boolean).length;
    c.add(txtObj(this, 0, 200, `${clues} / 5 clues`, 'hand', { size: 26, color: SOFT }));
  }

  private postcard(c: Phaser.GameObjects.Container): void {
    const card = this.add.image(0, -20, 'album_postcard').setScale(1 / ART_SCALE).setAngle(-2);
    c.add(card);
    c.add(txtObj(this, 210, 40, MYSTERY.postcard, 'hand', { size: 24, color: INK, align: 'center', wrap: 180 }));
    c.add(txtObj(this, 0, 210, WORLD.nextCampsite, 'handBig', { size: 46, color: INK }));
  }

  private stay(): void {
    const s = S();
    this.archive();
    s.freePlay = true;
    const m = dawn();
    save('freePlay');
    go(SCENES.camp, { dawnMoment: m, woke: true });
  }

  private newTrip(): void {
    this.archive();
    startTrip();
  }

  private archive(): void {
    const s = S();
    const key = `archived${s.trip}`;
    if (s.journal.trips.some((t) => t.trip === s.trip) || s.flags[key]) return;
    s.flags[key] = true;
    s.journal.trips.push({ trip: s.trip, days: s.days.slice(0, 7), metGuardian: s.mystery.step >= 5 });
    save('archive');
  }
}
