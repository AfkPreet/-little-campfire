/**
 * HUD overlay (spec section 7): minimal, rounded, paper-textured; nothing red.
 * Top-left money, top-right "Day 2 · Morning" with a sun/moon that morphs,
 * bottom-left the Contentment lamp (no number), bottom-right Backpack and
 * Journal. Also hosts toasts, banners, hints and the backpack panel.
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { layout, onLayout, setupCamera } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { S } from '@/core/state';
import { closeOverlay, isActive, openOverlay } from '@/core/flow';
import { STR } from '@/data/dialogue';
import { WORLD } from '@/data/world';
import { labelFor } from '@/data/time';
import { CONTENTMENT, DECOR } from '@/data/decor';
import { GEAR, PANTRY } from '@/data/items';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import { DECOR_IDS, FISH_IDS, FORAGE_IDS, GEAR_IDS, PANTRY_IDS, type DishId } from '@/data/ids';
import { squash } from '@/fx/juice';
import { tierOf } from '@/systems/contentment';
import { eat } from '@/systems/cooking';
import { dishName, dishStacks } from '@/systems/inventory';
import { share } from '@/systems/companion';
import { pauseClock } from '@/systems/day';
import { BannerManager, Button, Card, IconButton, Tabs, ToastManager, iconObj, panel, shadowPanel, txtObj, fmt } from '@/ui';
import { P, hexToInt } from '@/palette';

function itemIcon(scene: Phaser.Scene, id: string): string {
  const k = `item_${id}`;
  return scene.textures.exists(k) ? k : 'icon.star';
}

export default class Hud extends Phaser.Scene {
  private money!: Phaser.GameObjects.Container;
  private moneyText!: Phaser.GameObjects.Text;
  private shownMoney = 0;
  private timeBox!: Phaser.GameObjects.Container;
  private timeText!: Phaser.GameObjects.Text;
  private sun!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private lamp!: Phaser.GameObjects.Container;
  private lampLit!: Phaser.GameObjects.Image;
  private lampGlow!: Phaser.GameObjects.Image;
  private lampLabel: Phaser.GameObjects.Container | null = null;
  private backpackBtn!: IconButton;
  private journalBtn!: IconButton;
  private settingsBtn!: IconButton;
  private hint: Phaser.GameObjects.Container | null = null;
  private pack: Phaser.GameObjects.Container | null = null;
  private unpause: (() => void) | null = null;
  private lastLabel = '';
  private lastTier = '';

  constructor() {
    super({ key: SCENES.hud });
  }

  create(): void {
    setupCamera(this);
    this.shownMoney = S().money;
    this.build();
    new ToastManager(this, { depth: DEPTH.toast });
    new BannerManager(this, { depth: DEPTH.toast - 1 });

    bus.onScene(this, 'money:changed', (e) => this.onMoney(e.money, e.delta));
    bus.onScene(this, 'hud:bounce', (e) => this.bounce(e.target));
    bus.onScene(this, 'hud:hint', (e) => this.setHint(e.text));
    bus.onScene(this, 'contentment:changed', (e) => {
      if (e.tierChanged) this.bounce('lamp');
    });
    bus.onScene(this, 'state:changed', () => this.refresh(true));
    const off = onLayout(() => this.layoutAll());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.unpause?.();
    });
    this.refresh(true);
  }

  private build(): void {
    // Money pill (top-left).
    this.money = this.add.container(0, 0).setDepth(DEPTH.ui);
    const mBg = panel(this, 'ui.pill', 150, 54);
    const mSh = shadowPanel(this, 'pill', 150, 54, 0, 4, 0.13);
    const coin = iconObj(this, -46, 0, this.textures.exists('item_coin') ? 'item_coin' : 'icon.coin', 36);
    this.moneyText = txtObj(this, 16, 1, WORLD.money(S().money), 'label', { size: 26 });
    this.money.add([mSh, mBg, coin, this.moneyText]);

    // Day / time pill (top-right).
    this.timeBox = this.add.container(0, 0).setDepth(DEPTH.ui);
    const tBg = panel(this, 'ui.pill', 270, 54);
    const tSh = shadowPanel(this, 'pill', 270, 54, 0, 4, 0.13);
    this.sun = iconObj(this, -106, 0, 'icon.sun', 38);
    this.moon = iconObj(this, -106, 0, 'icon.moon', 38);
    this.timeText = txtObj(this, 16, 1, '', 'label', { size: 22 });
    this.timeBox.add([tSh, tBg, this.sun, this.moon, this.timeText]);

    this.settingsBtn = new IconButton(this, 0, 0, { icon: 'icon.settings', size: 56, variant: 'cream', onTap: () => openOverlay(SCENES.settings) });
    this.settingsBtn.setDepth(DEPTH.ui);

    // Contentment lamp (bottom-left).
    this.lamp = this.add.container(0, 0).setDepth(DEPTH.ui);
    const lampBtn = new IconButton(this, 0, 0, { icon: 'icon.lantern', size: 72, variant: 'cream', iconScale: 0.7, onTap: () => this.showLampLabel() });
    this.lampLit = iconObj(this, 0, 0, 'icon.lanternLit', 50);
    this.lampGlow = iconObj(this, 0, -4, 'icon.lanternGlow', 110).setBlendMode(Phaser.BlendModes.ADD);
    this.lamp.add([this.lampGlow, lampBtn, this.lampLit]);

    // Backpack + Journal (bottom-right).
    this.backpackBtn = new IconButton(this, 0, 0, { icon: 'icon.backpack', size: 72, variant: 'cream', onTap: () => this.togglePack() });
    this.journalBtn = new IconButton(this, 0, 0, { icon: 'icon.journal', size: 72, variant: 'cream', onTap: () => openOverlay(SCENES.journal) });
    this.backpackBtn.setDepth(DEPTH.ui);
    this.journalBtn.setDepth(DEPTH.ui);

    this.layoutAll();
  }

  private layoutAll(): void {
    const l = layout();
    const m = 20;
    const top = l.safe.top + m + 27;
    const bot = l.h - l.safe.bottom - m - 36;
    this.money.setPosition(l.safe.left + m + 75, top);
    this.timeBox.setPosition(l.w - l.safe.right - m - 135, top);
    this.settingsBtn.setPosition(l.safe.left + m + 36 + 84, bot + 6);
    this.lamp.setPosition(l.safe.left + m + 36, bot);
    this.journalBtn.setPosition(l.w - l.safe.right - m - 36, bot);
    this.backpackBtn.setPosition(l.w - l.safe.right - m - 36 - 90, bot);
    if (this.hint) this.hint.setPosition(l.w / 2, top + 64);
    if (this.pack) this.pack.setPosition(l.w / 2, l.h / 2);
  }

  /** Screen point of the backpack button (items fly here). */
  basketPoint(): { x: number; y: number } {
    return { x: this.backpackBtn.x, y: this.backpackBtn.y };
  }

  override update(): void {
    this.refresh(false);
  }

  private refresh(force: boolean): void {
    const s = S();
    const label = `${fmt(STR.hud.dayTime, { n: s.day, time: labelFor(s.p) })}`;
    if (label !== this.lastLabel || force) {
      this.lastLabel = label;
      this.timeText.setText(label);
    }
    // Sun/moon morph: crossfade across dusk.
    const nightAmt = s.p >= 1 ? 1 : s.p > 0.86 ? (s.p - 0.86) / 0.14 : s.p < 0.05 ? 0.5 * (1 - s.p / 0.05) : 0;
    this.sun.setAlpha(1 - nightAmt);
    this.moon.setAlpha(nightAmt);
    this.sun.setAngle((s.p * 90) % 360);
    // Lamp glow by tier.
    const t = tierOf(s.contentment.value);
    if (t !== this.lastTier || force) {
      this.lastTier = t;
      const lit = t === 'cozy' ? 0.25 : t === 'content' ? 0.55 : t === 'glowing' ? 0.85 : 1;
      this.tweens.add({ targets: this.lampLit, alpha: lit, duration: 600 });
      const base = (this.lampGlow.getData('base') as number | undefined) ?? this.lampGlow.scale;
      this.lampGlow.setData('base', base);
      this.tweens.add({ targets: this.lampGlow, scale: base * (0.8 + lit * 0.35), duration: 600 });
    }
    // Lamp breathes gently.
    if (!reduceMotion()) this.lampGlow.setAlpha(Math.min(1, (this.lampLit.alpha || 0) * (0.75 + 0.2 * Math.sin(this.time.now / 700))));
    if (force && s.money !== this.shownMoney) {
      this.shownMoney = s.money;
      this.moneyText.setText(WORLD.money(s.money));
    }
  }

  private onMoney(money: number, delta: number): void {
    const from = this.shownMoney;
    this.shownMoney = money;
    const o = { v: from };
    this.tweens.add({
      targets: o,
      v: money,
      duration: Math.min(900, 200 + Math.abs(delta) * 20),
      ease: 'Sine.easeOut',
      onUpdate: () => this.moneyText.setText(WORLD.money(Math.round(o.v))),
    });
    this.bounce('money');
  }

  private bounce(target: 'backpack' | 'money' | 'lamp' | 'journal'): void {
    const obj = target === 'money' ? this.money : target === 'lamp' ? this.lamp : target === 'journal' ? this.journalBtn : this.backpackBtn;
    squash(this, obj as unknown as Phaser.GameObjects.Container, 1);
  }

  private showLampLabel(): void {
    this.lampLabel?.destroy();
    const t = tierOf(S().contentment.value);
    const text = CONTENTMENT.tiers.find((x) => x.id === t)!.label;
    const c = this.add.container(this.lamp.x + 150, this.lamp.y).setDepth(DEPTH.ui + 1);
    const w = 220;
    c.add([shadowPanel(this, 'pill', w, 50, 0, 4, 0.12), panel(this, 'ui.pill', w, 50), txtObj(this, 0, 1, text, 'label', { size: 22 })]);
    this.lampLabel = c;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, x: c.x + 6, duration: 220 });
    this.time.delayedCall(2200, () => {
      if (this.lampLabel !== c) return;
      this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() });
      this.lampLabel = null;
    });
  }

  private setHint(text: string | null): void {
    const old = this.hint;
    this.hint = null;
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 250, onComplete: () => old.destroy() });
    if (!text) return;
    const l = layout();
    const t = txtObj(this, 0, 1, text, 'label', { size: 22 });
    const w = Math.max(240, t.width + 56);
    const c = this.add.container(l.w / 2, l.safe.top + 20 + 27 + 64).setDepth(DEPTH.ui);
    c.add([shadowPanel(this, 'pill', w, 50, 0, 4, 0.12), panel(this, 'ui.pill', w, 50), t]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    this.hint = c;
  }

  // ---------------------------------------------------------------------------
  // Backpack panel
  // ---------------------------------------------------------------------------

  private togglePack(tab = 0): void {
    if (this.pack) {
      this.closePack();
      return;
    }
    if (isActive(SCENES.cooking) || isActive(SCENES.journal)) return;
    this.unpause = pauseClock();
    bus.emit('overlay:open', { key: 'backpack' });
    const l = layout();
    const W = Math.min(820, l.w - 80);
    const H = Math.min(560, l.h - 120);
    const c = this.add.container(l.w / 2, l.h / 2).setDepth(DEPTH.overlay);
    const scrim = this.add.rectangle(0, 0, l.w * 2, l.h * 2, hexToInt(P.ink), 0.3).setInteractive();
    scrim.on('pointerdown', () => this.closePack());
    const card = new Card(this, 0, 0, { w: W, h: H, title: STR.backpack.title });
    const close = new IconButton(this, W / 2 - 34, -H / 2 + 34, { icon: 'icon.close', size: 56, variant: 'cream', onTap: () => this.closePack() });
    c.add([scrim, card, close]);
    const body = this.add.container(0, 0);
    c.add(body);
    const tabs = new Tabs(this, 0, -H / 2 + 104, {
      tabs: [STR.backpack.food, STR.backpack.gear, STR.backpack.decor],
      selected: tab,
      onChange: (i) => this.fillPack(body, i, W, H),
    });
    c.add(tabs);
    this.pack = c;
    this.fillPack(body, tab, W, H);
    c.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  private closePack(): void {
    const c = this.pack;
    if (!c) return;
    this.pack = null;
    this.unpause?.();
    this.unpause = null;
    bus.emit('overlay:close', { key: 'backpack' });
    this.tweens.add({ targets: c, alpha: 0, scale: 0.94, duration: 180, onComplete: () => c.destroy() });
  }

  private fillPack(body: Phaser.GameObjects.Container, tab: number, W: number, H: number): void {
    body.removeAll(true);
    const s = S();
    const tiles: { key: string; label: string; n?: number; onTap?: () => void; sub?: string }[] = [];
    if (tab === 0) {
      for (const d of dishStacks()) {
        tiles.push({ key: itemIcon(this, d.id), label: dishName(d.id), n: d.n, sub: d.id === 'moon_dumplings' ? '' : WORLD.money(d.value), onTap: () => this.dishMenu(d.id, d.value) });
      }
      for (const id of FISH_IDS) if ((s.fish[id] ?? 0) > 0) tiles.push({ key: itemIcon(this, id), label: FISH[id].name, n: s.fish[id] });
      for (const id of FORAGE_IDS) if ((s.forage[id] ?? 0) > 0) tiles.push({ key: itemIcon(this, id), label: FORAGE[id].name, n: s.forage[id] });
      for (const id of PANTRY_IDS) if ((s.pantry[id] ?? 0) > 0) tiles.push({ key: itemIcon(this, id), label: PANTRY[id].name, n: s.pantry[id] });
    } else if (tab === 1) {
      for (const id of GEAR_IDS) {
        if (id === 'wiggly_bait' || id === 'sparkle_bait') continue;
        if (s.gear[id]) tiles.push({ key: itemIcon(this, id), label: GEAR[id].name });
      }
      if (s.bait.wiggly > 0) tiles.push({ key: itemIcon(this, 'wiggly_bait'), label: WORLD.bait.wiggly, n: s.bait.wiggly });
      if (s.bait.sparkle > 0) tiles.push({ key: itemIcon(this, 'sparkle_bait'), label: WORLD.bait.sparkle, n: s.bait.sparkle });
      if (s.mystery.hasScale && s.mystery.step < 5) tiles.push({ key: itemIcon(this, 'moon_scale'), label: WORLD.scale });
    } else {
      for (const id of DECOR_IDS) {
        const n = s.decor[id] ?? 0;
        const placed = s.camp.placed.filter((p) => p.id === id).length;
        if (n > 0 || placed > 0) tiles.push({ key: itemIcon(this, id), label: DECOR[id].name, n: n || undefined, sub: placed ? 'placed' : '' });
      }
      if (s.camp.pitched) {
        const b = new Button(this, 0, H / 2 - 56, {
          label: STR.actions.decorate,
          variant: 'primary',
          onTap: () => {
            this.closePack();
            bus.emit('camp:activity', { activity: 'decorate' });
          },
        });
        body.add(b);
      }
    }
    if (!tiles.length) {
      body.add(txtObj(this, 0, 10, STR.backpack.empty, 'body', { color: P.ink }));
      return;
    }
    const cols = Math.max(3, Math.floor((W - 60) / 128));
    const cell = (W - 60) / cols;
    const top = -H / 2 + 170;
    tiles.slice(0, cols * 3).forEach((t, i) => {
      const cx = -W / 2 + 30 + cell * (i % cols) + cell / 2;
      const cy = top + Math.floor(i / cols) * 118;
      const tile = this.add.container(cx, cy);
      const well = panel(this, 'ui.well', cell - 14, 104);
      const icon = iconObj(this, 0, -14, t.key, 56);
      const name = txtObj(this, 0, 32, t.label, 'small', { size: 16, align: 'center', wrap: cell - 20 });
      tile.add([well, icon, name]);
      if (t.n && t.n > 1) tile.add(txtObj(this, cell / 2 - 26, -36, `x${t.n}`, 'small', { size: 17, color: P.ink }));
      if (t.sub) tile.add(txtObj(this, -cell / 2 + 26, -36, t.sub, 'small', { size: 16, color: P.ink }));
      if (t.onTap) {
        tile.setSize(cell - 14, 104).setInteractive({ useHandCursor: true });
        tile.on('pointerup', () => {
          squash(this, tile as unknown as Phaser.GameObjects.Container, 0.6);
          t.onTap!();
        });
      }
      body.add(tile);
    });
  }

  private dishMenu(id: DishId, value: number): void {
    const s = S();
    const dish = s.dishes.find((d) => d.id === id && d.value === value);
    if (!dish) return;
    const near = isActive(SCENES.camp) && s.p >= 0.82 && !s.companion.befriended ? true : s.companion.befriended;
    const W = 420;
    const c = this.add.container(0, 0);
    this.pack?.add(c);
    const card = new Card(this, 0, 0, { w: W, h: 200, title: dishName(id), tint: 'butter' });
    const eatBtn = new Button(this, near ? -100 : 0, 50, {
      label: STR.backpack.eat,
      variant: 'primary',
      onTap: () => {
        eat(dish);
        bus.emit('sfx', { id: 'pop' });
        this.closePack();
      },
    });
    c.add([card, eatBtn]);
    if (near) {
      c.add(
        new Button(this, 100, 50, {
          label: STR.actions.share,
          variant: 'warm',
          onTap: () => {
            const idx = s.dishes.indexOf(dish);
            if (idx >= 0) s.dishes.splice(idx, 1);
            const r = share();
            bus.emit('toast', { text: r === 'befriended' ? STR.companion.stay : fmt(STR.companion.nibbled, { dish: dishName(id) }) });
            this.closePack();
          },
        }),
      );
    }
  }

  /** Close transient panels when another overlay opens. */
  closeTransient(): void {
    this.closePack();
    closeOverlay(SCENES.settings);
  }
}
