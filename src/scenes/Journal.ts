/**
 * Tuki's Journal (spec section 5 "Journal (the spine)" and section 7): a
 * hand-drawn lokta notebook. The cover shows "{n} / 36 stamps" and badges;
 * tabs Fish (8), Recipes (16), Moments (6), Friends (1), Mystery (5), Trip
 * (a page per day). Undiscovered entries are soft silhouettes with "???" and
 * a one-line hint.
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { anyParam, markReady } from '@/core/debug';
import { ART_SCALE, layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { S, type DayLog } from '@/core/state';
import { STR } from '@/data/dialogue';
import { FISH, FISH_ORDER, RARITY_STARS } from '@/data/fish';
import { RECIPES, RECIPE_ORDER } from '@/data/recipes';
import { MOMENTS, MOMENT_ORDER } from '@/data/moments';
import { MYSTERY } from '@/data/mystery';
import { GEAR, PANTRY } from '@/data/items';
import { FORAGE } from '@/data/forage';
import { WORLD } from '@/data/world';
import type { RecipeIngredient } from '@/data/recipes';
import { playSfx } from '@/audio/engine';
import { pauseClock } from '@/systems/day';
import { stampCount, TOTAL_STAMPS } from '@/systems/journal';
import { hearts } from '@/systems/companion';
import { dishName } from '@/systems/inventory';
import { IconButton, fmt, iconObj, txtObj } from '@/ui';
import { pressable, setHitSize } from '@/ui/Button';
import { A, P, hexToInt, mix } from '@/palette';
import { registerShot } from '@/camp/registry';
import { openOverlay } from '@/core/flow';

type Tab = 'fish' | 'recipes' | 'moments' | 'friends' | 'mystery' | 'trip';
const TABS: Tab[] = ['fish', 'recipes', 'moments', 'friends', 'mystery', 'trip'];
const TAB_TINT: Record<Tab, string> = { fish: A['lake-jade'], recipes: P.peach, moments: P.lavender, friends: P.blush, mystery: A.mistfish, trip: P.sage };

const PAGE_INK = P.ink;
const SOFT_INK = mix(P.ink, A.lokta, 0.35);

function iconKeyOf(scene: Phaser.Scene, id: string): string {
  const k = `item_${id}`;
  return scene.textures.exists(k) ? k : 'icon.star';
}

function ingName(i: RecipeIngredient): string {
  if (i === 'any_fish') return 'Any fish';
  if (i in FISH) return FISH[i as keyof typeof FISH].name;
  if (i in FORAGE) return FORAGE[i as keyof typeof FORAGE].name;
  return PANTRY[i as keyof typeof PANTRY].name;
}

export default class Journal extends Phaser.Scene {
  private unpause: (() => void) | null = null;
  private book!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  private tabsC!: Phaser.GameObjects.Container;
  private tab: Tab = 'fish';
  private tripPage = 0;
  private recipePage = 0;
  private k = 1;

  constructor() {
    super({ key: SCENES.journal });
  }

  create(data: { tab?: Tab; open?: boolean } = {}): void {
    applyDebugOnce();
    setupCamera(this);
    this.unpause = pauseClock();
    bus.emit('overlay:open', { key: SCENES.journal });
    const l = layout();
    const qTab = anyParam('tab') as Tab | null;
    if (qTab && TABS.includes(qTab)) data = { tab: qTab, open: true };
    this.tab = data.tab ?? 'fish';
    this.tripPage = Math.max(0, Math.floor((S().days.length - 1) / 2));
    this.recipePage = 0;
    const scrim = this.add.rectangle(0, 0, l.w, l.h, hexToInt(P.ink), 0.45).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    scrim.on('pointerdown', () => this.close());
    this.k = Math.min(1, (l.w - 40) / 980, (l.h - 50) / 640);
    this.book = this.add.container(l.w / 2, l.h / 2 + 14).setDepth(DEPTH.overlay + 1).setScale(this.k);
    const close = new IconButton(this, l.w - l.safe.right - 46, l.safe.top + 46, { icon: 'icon.close', size: 60, variant: 'cream', onTap: () => this.close() });
    close.setDepth(DEPTH.overlay + 5);
    this.input.keyboard?.once('keydown-ESC', () => this.close());
    this.input.keyboard?.once('keydown-J', () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unpause?.());
    if (data.open) this.openSpread(false);
    else this.showCover();
    playSfx('page');
    markReady(this, 700);
  }

  // ---------------------------------------------------------------------------
  // Cover
  // ---------------------------------------------------------------------------

  private showCover(): void {
    this.book.removeAll(true);
    const cover = this.add.image(0, 0, 'journal_cover').setScale(1 / ART_SCALE);
    const blocker = this.add.zone(0, 0, 520, 620).setInteractive();
    blocker.on('pointerdown', () => this.openSpread(true));
    this.book.add([blocker, cover]);
    this.book.add(txtObj(this, -20, -160, STR.journal.cover, 'handBig', { size: 52, color: PAGE_INK }));
    this.book.add(txtObj(this, -20, -96, fmt(STR.journal.stamps, { n: stampCount() }), 'hand', { size: 32, color: SOFT_INK }));
    const j = S().journal;
    const badges: [string, string, boolean][] = [
      ['journal_badgeCamper', STR.journal.happyCamper, j.badges.happyCamper],
      ['journal_badgeGuardian', STR.journal.guardianFriend, j.badges.guardianFriend],
    ];
    badges.forEach(([key, label, got], i) => {
      const x = -110 + i * 180;
      const img = this.add.image(x, 18, key).setScale(1 / ART_SCALE);
      if (!got) img.setTintFill(hexToInt(mix(A.lokta, P.lavender, 0.45))).setAlpha(0.55);
      this.book.add(img);
      this.book.add(txtObj(this, x, 88, got ? label : STR.journal.locked, 'hand', { size: 22, color: got ? PAGE_INK : SOFT_INK }));
    });
    // Progress strip of little stamps.
    const n = stampCount();
    const per = 12;
    for (let i = 0; i < TOTAL_STAMPS; i++) {
      const x = -185 + (i % per) * 30;
      const y = 152 + Math.floor(i / per) * 28;
      const st = this.add.image(x, y, 'journal_stamp').setScale(0.34 / ART_SCALE);
      if (i >= n) st.setAlpha(0.18);
      this.book.add(st);
    }
    this.book.add(txtObj(this, -20, 278, 'tap to open', 'hand', { size: 22, color: mix(P.cream, P.rose, 0.2) }));
    if (!reduceMotion()) {
      this.book.setScale(this.k * 0.92);
      this.tweens.add({ targets: this.book, scale: this.k, duration: 360, ease: 'Back.easeOut' });
    }
  }

  // ---------------------------------------------------------------------------
  // Spread
  // ---------------------------------------------------------------------------

  private openSpread(animate: boolean): void {
    this.book.removeAll(true);
    const blocker = this.add.zone(0, 0, 980, 620).setInteractive();
    const spread = this.add.image(0, 0, 'journal_spread').setScale(1 / ART_SCALE);
    this.tabsC = this.add.container(0, 0);
    this.content = this.add.container(0, 0);
    this.book.add([blocker, this.tabsC, spread, this.content]);
    this.buildTabs();
    this.fill();
    if (animate) playSfx('page');
    if (animate && !reduceMotion()) {
      this.book.setScale(this.k * 0.94);
      this.tweens.add({ targets: this.book, scale: this.k, duration: 300, ease: 'Back.easeOut' });
    }
  }

  private buildTabs(): void {
    this.tabsC.removeAll(true);
    const labels = STR.journal.tabs;
    TABS.forEach((t, i) => {
      const x = -400 + i * 140 + 60;
      const sel = t === this.tab;
      const c = this.add.container(x, -322 + (sel ? -8 : 0));
      const bg = this.add.image(0, 0, 'journal_tab').setScale(1 / ART_SCALE).setTint(hexToInt(mix(TAB_TINT[t], A.lokta, sel ? 0.1 : 0.35)));
      c.add(bg);
      c.add(txtObj(this, 0, -2, labels[t], 'hand', { size: 25, color: PAGE_INK }));
      setHitSize(c, 120, 64);
      pressable(this, c, {
        onTap: () => {
          if (this.tab === t) return;
          this.tab = t;
          playSfx('page');
          this.buildTabs();
          this.fill(true);
        },
        sfx: null,
      });
      this.tabsC.add(c);
    });
  }

  private fill(animate = false): void {
    this.content.removeAll(true);
    switch (this.tab) {
      case 'fish':
        this.fishPages();
        break;
      case 'recipes':
        this.recipePages();
        break;
      case 'moments':
        this.momentPages();
        break;
      case 'friends':
        this.friendPages();
        break;
      case 'mystery':
        this.mysteryPages();
        break;
      case 'trip':
        this.tripPages();
        break;
    }
    if (animate && !reduceMotion()) {
      this.content.setAlpha(0);
      this.content.x = 18;
      this.tweens.add({ targets: this.content, alpha: 1, x: 0, duration: 260, ease: 'Sine.easeOut' });
    }
  }

  /** Page geometry: left page centre x = -245, right = +245; usable ~420 x 520. */
  private pageX(side: 0 | 1): number {
    return side === 0 ? -245 : 245;
  }

  private header(side: 0 | 1, text: string): void {
    this.content.add(txtObj(this, this.pageX(side), -262, text, 'handBig', { size: 38, color: PAGE_INK }));
  }

  private entry(x: number, y: number, w: number, o: { key: string; known: boolean; title: string; lines: string[]; hint: string; stars?: number; iconSize?: number }): void {
    const c = this.add.container(x, y);
    const isz = o.iconSize ?? 74;
    const ic = iconObj(this, -w / 2 + isz / 2 + 4, 0, o.key, isz);
    if (!o.known) ic.setTintFill(hexToInt(mix(A.lokta, P.lavender, 0.55))).setAlpha(0.7);
    c.add(ic);
    const tx = -w / 2 + isz + 16;
    c.add(txtObj(this, tx, -22, o.known ? o.title : STR.journal.locked, 'hand', { align: 'left', size: 26, color: PAGE_INK }));
    const lines = o.known ? o.lines : [o.hint];
    // Stack lines top-down by their real height (a wrapped flavor line used to
    // overlap the line above), and keep text clear of the stamp on the right.
    const wrap = w - isz - 24 - (o.known ? 58 : 0);
    let ly = -6;
    for (const ln of lines) {
      const t = txtObj(this, tx, ly, ln, 'hand', { align: 'left', size: 19, color: SOFT_INK, wrap }).setOrigin(0, 0);
      c.add(t);
      ly += t.height - 6;
    }
    if (o.known && o.stars) {
      for (let s = 0; s < 3; s++) c.add(iconObj(this, w / 2 - 70 + s * 22, -24, s < o.stars ? 'icon.star' : 'icon.starEmpty', 20));
    }
    if (o.known) c.add(this.add.image(w / 2 - 20, 18, 'journal_stamp').setScale(0.55 / ART_SCALE).setAngle(-12));
    this.content.add(c);
  }

  private fishPages(): void {
    const j = S().journal;
    this.header(0, STR.journal.tabs.fish);
    this.header(1, `${Object.keys(j.fish).length} / ${FISH_ORDER.length}`);
    FISH_ORDER.forEach((id, i) => {
      const side = (i < 4 ? 0 : 1) as 0 | 1;
      const row = i % 4;
      const e = j.fish[id];
      const f = FISH[id];
      this.entry(this.pageX(side), -170 + row * 118, 400, {
        key: iconKeyOf(this, id),
        known: !!e,
        title: f.name,
        lines: e ? [fmt(STR.journal.best, { cm: e.bestCm.toFixed(1) }) + ' · ' + fmt(STR.journal.caught, { n: e.caught }), f.flavor] : [],
        hint: f.hint,
        stars: RARITY_STARS[f.rarity],
      });
    });
  }

  private recipePages(): void {
    const j = S().journal;
    const per = 8;
    const pages = Math.ceil(RECIPE_ORDER.length / per);
    const start = this.recipePage * per;
    const ids = RECIPE_ORDER.slice(start, start + per);
    this.header(0, STR.journal.tabs.recipes);
    this.header(1, `${Object.keys(j.recipes).length} / ${RECIPE_ORDER.length}`);
    ids.forEach((id, i) => {
      const side = (i < 4 ? 0 : 1) as 0 | 1;
      const row = i % 4;
      const r = RECIPES[id];
      const e = j.recipes[id];
      this.entry(this.pageX(side), -170 + row * 118, 400, {
        key: iconKeyOf(this, id),
        known: !!e,
        title: r.name,
        lines: e ? [`${GEAR[r.cookware].name}: ${r.ingredients.map(ingName).join(' + ')}`] : [],
        hint: r.hint,
        iconSize: 70,
      });
    });
    if (pages > 1) {
      const nav = (dx: number, icon: string, enabled: boolean, fn: () => void) => {
        const b = new IconButton(this, dx, 268, { icon, size: 54, variant: 'cream', disabled: !enabled, onTap: fn });
        this.content.add(b);
      };
      nav(-430, 'icon.arrowLeft', this.recipePage > 0, () => {
        this.recipePage--;
        playSfx('page');
        this.fill(true);
      });
      nav(430, 'icon.arrowRight', this.recipePage < pages - 1, () => {
        this.recipePage++;
        playSfx('page');
        this.fill(true);
      });
    }
  }

  private momentPages(): void {
    const j = S().journal;
    this.header(0, STR.journal.tabs.moments);
    this.header(1, `${Object.keys(j.moments).length} / ${MOMENT_ORDER.length}`);
    MOMENT_ORDER.forEach((id, i) => {
      const side = (i < 3 ? 0 : 1) as 0 | 1;
      const row = i % 3;
      const m = MOMENTS[id];
      const e = j.moments[id];
      const key = id === 'golden_whisker' ? iconKeyOf(this, 'golden_whisker') : 'sparkle';
      this.entry(this.pageX(side), -150 + row * 150, 400, {
        key: this.textures.exists(key) ? key : 'icon.star',
        known: !!e,
        title: m.name,
        lines: e ? [m.flavor, fmt(STR.journal.dayPage, { n: e.day })] : [],
        hint: m.hint,
        iconSize: 66,
      });
    });
  }

  private friendPages(): void {
    const s = S();
    const known = s.journal.friend || s.companion.shareDays.length > 0;
    this.header(0, STR.journal.tabs.friends);
    const portrait = this.add.container(this.pageX(0), -20);
    if (this.textures.exists('kopila_ball')) {
      const img = this.add.image(0, 0, 'kopila_ball').setScale(2.6 / ART_SCALE);
      if (!known) img.setTintFill(hexToInt(mix(A.lokta, P.lavender, 0.55))).setAlpha(0.7);
      portrait.add(img);
    }
    this.content.add(portrait);
    this.content.add(txtObj(this, this.pageX(0), 160, known ? WORLD.companion : STR.journal.locked, 'handBig', { size: 42, color: PAGE_INK }));
    this.header(1, '');
    const n = hearts();
    for (let i = 0; i < 3; i++) this.content.add(this.add.image(this.pageX(1) - 70 + i * 70, -150, i < n ? 'journal_heart' : 'journal_heartEmpty').setScale(1.3 / ART_SCALE));
    const line = s.journal.friend ? STR.companion.friendLine : known ? 'Shared a dish. It looked very pleased.' : 'Something small peeks from the bushes after dark...';
    this.content.add(txtObj(this, this.pageX(1), -40, line, 'hand', { size: 26, color: PAGE_INK, align: 'center', wrap: 380 }));
    this.content.add(this.add.image(this.pageX(1), 110, 'journal_stamp').setScale(1.1 / ART_SCALE).setAlpha(s.journal.friend ? 1 : 0.15).setAngle(-10));
  }

  private mysteryPages(): void {
    const j = S().journal;
    this.header(0, STR.journal.tabs.mystery);
    this.header(1, `${j.clues.filter(Boolean).length} / 5`);
    MYSTERY.clues.forEach((c, i) => {
      const side = (i < 3 ? 0 : 1) as 0 | 1;
      const row = side === 0 ? i : i - 3;
      const known = j.clues[i];
      const y = -170 + row * 150;
      const x = this.pageX(side);
      this.content.add(txtObj(this, x - 190, y - 30, `${c.n}. ${known ? c.title : STR.journal.locked}`, 'hand', { align: 'left', size: 27, color: PAGE_INK }));
      this.content.add(txtObj(this, x - 190, y - 4, known ? c.text : c.hint, 'hand', { align: 'left', size: 20, color: SOFT_INK, wrap: known ? 330 : 360 }).setOrigin(0, 0));
      if (known) this.content.add(this.add.image(x + 180, y - 22, 'journal_stamp').setScale(0.6 / ART_SCALE).setAngle(10));
    });
  }

  private tripPages(): void {
    const days = S().days;
    const pages = Math.max(1, Math.ceil(days.length / 2));
    this.tripPage = Math.min(this.tripPage, pages - 1);
    [0, 1].forEach((side) => {
      const d = days[this.tripPage * 2 + side];
      if (d) this.dayPage(side as 0 | 1, d);
    });
    const nav = (dx: number, icon: string, enabled: boolean, fn: () => void) => this.content.add(new IconButton(this, dx, 268, { icon, size: 54, variant: 'cream', disabled: !enabled, onTap: fn }));
    if (pages > 1) {
      nav(-430, 'icon.arrowLeft', this.tripPage > 0, () => {
        this.tripPage--;
        playSfx('page');
        this.fill(true);
      });
      nav(430, 'icon.arrowRight', this.tripPage < pages - 1, () => {
        this.tripPage++;
        playSfx('page');
        this.fill(true);
      });
    }
  }

  private dayPage(side: 0 | 1, d: DayLog): void {
    const x = this.pageX(side);
    this.header(side, fmt(STR.journal.dayPage, { n: d.day }));
    const weather = d.weather === 'rain' ? 'Rainy' : d.weather === 'mist' ? 'Misty morning' : d.weather === 'golden' ? 'Golden evening' : 'Clear';
    const lines: string[] = [`${weather}${d.rainyNight ? ', rain at night' : ''}`];
    if (d.fishCaught) lines.push(fmt(STR.summary.caught, { n: d.fishCaught }) + (d.bestCatch ? ` · best: ${FISH[d.bestCatch.id].name}` : ''));
    const cooked = Object.entries(d.cooked) as [string, number][];
    if (cooked.length) lines.push('Cooked ' + cooked.map(([id, n]) => `${dishName(id as never)}${n > 1 ? ' x' + n : ''}`).join(', '));
    if (d.moments.length) lines.push('Moments: ' + d.moments.map((m) => MOMENTS[m].name).join(', '));
    if (d.shared) lines.push(STR.summary.shared);
    if (d.sold) lines.push(fmt(STR.summary.sold, { money: WORLD.money(d.sold) }));
    lines.forEach((ln, i) => this.content.add(txtObj(this, x - 190, -190 + i * 52, ln, 'hand', { align: 'left', size: 24, color: i === 0 ? PAGE_INK : SOFT_INK, wrap: 380 })));
    // Contentment bloom for the day's peak.
    const g = this.add.graphics();
    const open = 0.35 + 0.65 * Math.min(1, d.peak / 100);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(hexToInt(mix(A.gurans, P.cream, 0.2)), 1).fillEllipse(x + Math.cos(a) * 26 * open, 190 + Math.sin(a) * 26 * open, 34 * open, 28 * open);
    }
    g.fillStyle(hexToInt(P.butter), 1).fillCircle(x, 190, 9 * open + 3);
    this.content.add(g);
  }

  private close(): void {
    this.unpause?.();
    this.unpause = null;
    playSfx('page', { vol: 0.6 });
    bus.emit('overlay:close', { key: SCENES.journal });
    this.scene.stop();
  }
}

registerShot('journal', () => openOverlay(SCENES.journal, { tab: 'fish', open: true }));
