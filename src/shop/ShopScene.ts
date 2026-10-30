/**
 * Boju's General Store (spec sections 5 and 7): fixed prices; tabs Camp,
 * Fishing, Kitchen, Pantry, Cozy, Sell; Day-1 essentials with a leaf tag;
 * "Saving up for that one?"; leaving without an essential asks once; the
 * Sell tab with quantity steppers; the legend when Tuki arrives with the
 * Moon Scale. The clock is paused in here.
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { markReady } from '@/core/debug';
import { go } from '@/core/flow';
import { ART_SCALE, layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { S, save } from '@/core/state';
import { Boju } from '@/chars/Boju';
import { addStrip } from '@/art/kit';
import { STR } from '@/data/dialogue';
import { DECOR } from '@/data/decor';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import { GEAR, PANTRY, SHOP_TAB_LABELS } from '@/data/items';
import { MYSTERY } from '@/data/mystery';
import { RECIPES } from '@/data/recipes';
import { WORLD } from '@/data/world';
import { SHOP_TABS, type ShopTab } from '@/data/ids';
import { lightAt } from '@/fx/lighting';
import { popIn, wobble } from '@/fx/juice';
import { sparkleBurst } from '@/fx/particles';
import { playSfx, setAmbience, setMusicMood, musicMoodFor } from '@/audio/engine';
import { pauseClock } from '@/systems/day';
import { dishName } from '@/systems/inventory';
import { hearLegend, legendDue } from '@/systems/mystery';
import { buy, canAfford, isEssential, itemsFor, missingEssentials, owned, sell, sellRows, type SellRow, type ShopItem } from '@/systems/shop';
import { Button, Card, Dialog, IconButton, Stepper, Tabs, fmt, iconObj, panel, shadowPanel, txtObj } from '@/ui';
import { A, P, hexToInt, mix } from '@/palette';

function icon(scene: Phaser.Scene, id: string): string {
  const k = `item_${id}`;
  return scene.textures.exists(k) ? k : 'icon.star';
}

function itemName(it: ShopItem): string {
  return it.kind === 'gear' ? GEAR[it.id].name : it.kind === 'pantry' ? PANTRY[it.id].name : DECOR[it.id].name;
}
function itemFlavor(it: ShopItem): string {
  return it.kind === 'gear' ? GEAR[it.id].flavor : it.kind === 'pantry' ? PANTRY[it.id].flavor : DECOR[it.id].flavor;
}

export default class Shop extends Phaser.Scene {
  private boju!: Boju;
  private unpause: (() => void) | null = null;
  private tab: ShopTab = 'camp';
  private page = 0;
  private grid!: Phaser.GameObjects.Container;
  private card!: Card;
  private speech: Phaser.GameObjects.Container | null = null;
  private lineIdx = 0;
  private warned = false;
  private busy = false;
  private cloth: Phaser.GameObjects.Image | null = null;
  private steamerImg: Phaser.GameObjects.Image | null = null;
  private catW = 500;
  private catH = 600;

  constructor() {
    super({ key: SCENES.shop });
  }

  create(): void {
    applyDebugOnce();
    setupCamera(this);
    this.unpause = pauseClock();
    const s = S();
    s.scene = 'shop';
    this.busy = false;
    this.warned = !!s.flags[`essWarned${s.day}`];
    this.page = 0;
    this.tab = 'camp';
    const l = layout();

    this.buildRoom();
    this.buildCatalog();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unpause?.());

    setAmbience({ scene: 'shop', p: s.p, raining: s.weather.raining, inTent: false, nearFire: 0, nearWater: 0 });
    setMusicMood(musicMoodFor(s.p, s.weather.raining));
    this.cameras.main.fadeIn(reduceMotion() ? 150 : 450, 47, 53, 88);

    if (legendDue()) this.time.delayedCall(700, () => this.legend());
    else {
      this.time.delayedCall(500, () => void this.boju.pourChiya());
      this.time.delayedCall(900, () => this.say(s.day === 1 && missingEssentials().length ? STR.shop.day1 : this.nextLine()));
    }
    void l;
    markReady(this, 900);
  }

  // ---------------------------------------------------------------------------
  // Room
  // ---------------------------------------------------------------------------

  private buildRoom(): void {
    const l = layout();
    const s = S();
    const light = lightAt(s.p, s.weather.raining ? 1 : 0, s.weather.mist);
    const roomW = l.w - this.catalogWidth() - 30;
    const bx = Math.max(220, roomW * 0.5);

    addStrip(this, 'shop_wall', 0, 0).setDepth(0);
    // Window with the outside view, tinted by the time of day.
    const wx = bx - 210;
    const wy = 130;
    const view = this.add.container(wx, wy).setDepth(1);
    const sky = this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(300, 220);
    sky.setTint(light.skyTop, light.skyTop, light.horizon, light.horizon);
    const ridge = this.add.image(0, 0, 'shop_viewRidge').setOrigin(0).setScale(1 / ART_SCALE).setTint(hexToInt(mix(A['ridge-far'], light.hex.haze, 0.5)));
    const trees = this.add.image(0, 10, 'shop_viewTrees').setOrigin(0).setScale(1 / ART_SCALE).setTint(hexToInt(mix(A.dhupi, light.hex.haze, 0.45)));
    const mist = this.add.image(0, 120, 'gradV').setOrigin(0).setDisplaySize(300, 140).setTint(light.haze).setAlpha(0.55 + light.rain * 0.3);
    view.add([sky, ridge, trees, mist]);
    const mask = this.add.graphics().setVisible(false);
    mask.fillStyle(0xffffff).fillRoundedRect(wx, wy, 300, 220, 18);
    view.setMask(mask.createGeometryMask());
    this.add.image(wx - 30, wy - 30, 'shop_windowFrame').setOrigin(0).setScale(1 / ART_SCALE).setDepth(2);
    if (light.night > 0.5) this.add.image(wx + 150, wy + 110, 'shop_glow').setScale(2 / ART_SCALE).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setDepth(2);
    // Geraniums on the ledge.
    [wx + 20, wx + 110, wx + 220].forEach((x, i) => this.add.image(x, wy + 250, 'shop_geranium').setOrigin(0, 1).setScale(0.85 / ART_SCALE).setDepth(3).setFlipX(i === 1));

    // Shelves behind Boju (right of the window).
    this.add.image(bx + 30, 110, 'shop_shelves').setOrigin(0, 0).setScale(0.8 / ART_SCALE).setDepth(1);
    const stX = bx + 30 + 0.8 * 230;
    const stY = 110 + 0.8 * 345;
    if (s.mystery.step >= 3) this.steamerImg = this.add.image(stX, stY, 'cook_steamer').setOrigin(0.5, 1).setScale(0.38 / ART_SCALE).setDepth(2);
    else this.cloth = this.add.image(stX, stY + 4, 'shop_cloth').setOrigin(0.5, 1).setScale(0.8 / ART_SCALE).setDepth(2);
    this.add.image(bx - 300, 50, 'shop_churpi').setOrigin(0, 0).setScale(0.9 / ART_SCALE).setDepth(3);
    const sign = this.add.image(bx + 330, 46, 'shop_kettleSign').setOrigin(0.5, 0).setScale(0.8 / ART_SCALE).setDepth(3);
    if (!reduceMotion()) this.tweens.add({ targets: sign, angle: { from: -3, to: 3 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Boju behind the counter.
    const counterY = 500;
    this.boju = new Boju(this, bx, counterY);
    this.boju.setDepth(5);
    this.boju.onBell = () => playSfx('chime', { vol: 0.25, pitch: 0.6 });
    addStrip(this, 'shop_counter', 0, counterY - 6).setDepth(6);
    const glass = this.add.image(bx + 120, counterY + 4, 'shop_glass').setOrigin(0.5, 1).setScale(1 / ART_SCALE).setDepth(7);
    void glass;

    // Header + exit.
    const hdr = txtObj(this, roomW / 2, l.safe.top + 36, STR.shop.header, 'h1', { color: P.cream, stroke: mix(P.bark, P.ink, 0.4), strokeWidth: 8 });
    hdr.setDepth(20);
    const exit = new Button(this, Math.min(roomW / 2, 260), l.h - l.safe.bottom - 54, {
      label: STR.shop.exit,
      variant: 'warm',
      icon: 'icon.arrowRight',
      iconSide: 'right',
      onTap: () => this.tryLeave(),
    });
    exit.setDepth(20);

    // Tap Boju for another line.
    const hit = this.add.zone(bx, counterY - 150, 260, 300).setInteractive().setDepth(8);
    hit.on('pointerdown', () => {
      if (this.busy) return;
      this.boju.nod();
      this.say(this.nextLine());
    });
    this.events.on('update', (t: number, d: number) => this.boju.tick(t, d));
  }

  private nextLine(): string {
    const lines = STR.boju;
    const s = S();
    const i = (s.day * 3 + this.lineIdx++) % lines.length;
    return lines[i];
  }

  private say(text: string, hold = 4200): void {
    this.speech?.destroy();
    const l = layout();
    const roomW = l.w - this.catalogWidth() - 30;
    const bx = Math.max(220, roomW * 0.5);
    const maxW = Math.min(380, roomW - 60);
    const t = txtObj(this, 0, 0, text, 'body', { size: 22, wrap: maxW - 40, align: 'center' });
    const w = Math.min(maxW, t.width + 48);
    const h = t.height + 30;
    const c = this.add.container(Math.min(Math.max(bx, w / 2 + 20), roomW - w / 2 - 10), 230 - h / 2).setDepth(21);
    c.add([shadowPanel(this, 'card', w, h, 0, 4, 0.14), panel(this, 'ui.card.cream', w, h), t]);
    const tail = this.add.image(0, h / 2 - 4, 'ui.bubbleTail').setOrigin(0.5, 0).setScale(1 / ART_SCALE);
    c.add(tail);
    this.speech = c;
    popIn(this, c, 0, 320);
    this.boju.talk(Math.min(3000, text.length * 45));
    const me = c;
    this.time.delayedCall(hold, () => {
      if (this.speech !== me) return;
      this.tweens.add({ targets: me, alpha: 0, duration: 300, onComplete: () => me.destroy() });
      this.speech = null;
    });
  }

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------

  private catalogWidth(): number {
    const l = layout();
    return Math.min(760, Math.max(500, l.w * 0.5));
  }

  private buildCatalog(): void {
    const l = layout();
    this.catW = this.catalogWidth();
    this.catH = l.h - l.safe.top - l.safe.bottom - 40;
    const cx = l.w - l.safe.right - 20 - this.catW / 2;
    const cy = l.safe.top + 20 + this.catH / 2;
    this.card = new Card(this, cx, cy, { w: this.catW, h: this.catH });
    this.card.setDepth(10);
    const tabs = new Tabs(this, cx, cy - this.catH / 2 + 46, {
      tabs: SHOP_TABS.map((t) => SHOP_TAB_LABELS[t]),
      selected: 0,
      height: 54,
      gap: 6,
      tabW: Math.floor((this.catW - 40) / 6) - 6,
      onChange: (i) => {
        this.tab = SHOP_TABS[i];
        this.page = 0;
        this.fill();
      },
    });
    tabs.setDepth(11);
    this.grid = this.add.container(cx, cy).setDepth(11);
    this.fill();
  }

  private fill(): void {
    this.grid.removeAll(true);
    if (this.tab === 'sell') {
      this.fillSell();
      return;
    }
    const items = itemsFor(this.tab);
    const cols = this.catW >= 700 ? 3 : 2;
    const rows = 3;
    const per = cols * rows;
    const pages = Math.max(1, Math.ceil(items.length / per));
    this.page = Math.min(this.page, pages - 1);
    const cw = (this.catW - 40 - (cols - 1) * 14) / cols;
    const top = -this.catH / 2 + 96;
    const ch = Math.min(150, (this.catH - 190) / rows - 12);
    items.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = -this.catW / 2 + 20 + cw / 2 + col * (cw + 14);
      const y = top + ch / 2 + row * (ch + 12);
      this.grid.add(this.itemCard(it, x, y, cw, ch));
    });
    if (pages > 1) this.pager(pages);
  }

  private pager(pages: number): void {
    const y = this.catH / 2 - 44;
    this.grid.add(new IconButton(this, -70, y, { icon: 'icon.arrowLeft', size: 56, variant: 'cream', disabled: this.page === 0, onTap: () => { this.page--; this.fill(); } }));
    this.grid.add(txtObj(this, 0, y, `${this.page + 1} / ${pages}`, 'label', { size: 20 }));
    this.grid.add(new IconButton(this, 70, y, { icon: 'icon.arrowRight', size: 56, variant: 'cream', disabled: this.page >= pages - 1, onTap: () => { this.page++; this.fill(); } }));
  }

  private itemCard(it: ShopItem, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const isOwned = owned(it);
    const ess = isEssential(it) && !isOwned;
    c.add(panel(this, ess ? 'ui.card.butter' : 'ui.well', w, h));
    const ic = iconObj(this, -w / 2 + 46, -h / 2 + 46, icon(this, it.id), 64);
    c.add(ic);
    c.add(txtObj(this, -w / 2 + 88, -h / 2 + 26, itemName(it), 'label', { align: 'left', size: 19 }));
    c.add(txtObj(this, -w / 2 + 88, -h / 2 + 54, WORLD.money(it.price), 'label', { align: 'left', size: 22, color: mix(P.ink, A.copper, 0.35) }));
    c.add(txtObj(this, -w / 2 + 16, h / 2 - 50, itemFlavor(it), 'small', { align: 'left', size: 15, wrap: w - 130, color: mix(P.ink, P.cream, 0.3) }));
    if (ess) c.add(iconObj(this, w / 2 - 22, -h / 2 + 20, 'icon.leafTag', 34));
    const btn = new Button(this, w / 2 - 58, h / 2 - 30, {
      label: isOwned ? STR.shop.owned : STR.shop.buy,
      variant: isOwned ? 'quiet' : 'primary',
      w: 100,
      h: 48,
      textKind: 'label',
      disabled: isOwned,
      onTap: () => this.tryBuy(it, btn),
      onDisabledTap: () => undefined,
    });
    c.add(btn);
    return c;
  }

  private tryBuy(it: ShopItem, btn: Button): void {
    if (this.busy) return;
    if (!canAfford(it)) {
      wobble(this, btn as unknown as Phaser.GameObjects.Image);
      playSfx('nope');
      this.say(STR.shop.tooPricey, 2600);
      return;
    }
    const r = buy(it);
    if (r === 'ok') {
      playSfx('coin');
      const m = btn.getWorldTransformMatrix();
      sparkleBurst(this, m.tx, m.ty, { count: 10, depth: DEPTH.ui + 5 });
      bus.emit('toast', { text: fmt(STR.toasts.bought, { item: itemName(it) }), icon: icon(this, it.id) });
      if (S().day === 1 && missingEssentials().length === 0 && !S().flags.essThanks) {
        S().flags.essThanks = true;
        this.time.delayedCall(400, () => this.say(STR.boju[4]));
      }
      save('buy');
      this.fill();
    }
  }

  private fillSell(): void {
    const rows = sellRows();
    if (!rows.length) {
      this.grid.add(txtObj(this, 0, 0, STR.shop.nothingToSell, 'body', { size: 22, align: 'center', wrap: this.catW - 80 }));
      return;
    }
    const per = 5;
    const pages = Math.ceil(rows.length / per);
    this.page = Math.min(this.page, pages - 1);
    const rh = Math.min(92, (this.catH - 190) / per);
    rows.slice(this.page * per, this.page * per + per).forEach((r, i) => {
      const y = -this.catH / 2 + 100 + rh / 2 + i * (rh + 6);
      this.grid.add(this.sellRow(r, y, rh));
    });
    if (pages > 1) this.pager(pages);
  }

  private sellRow(r: SellRow, y: number, h: number): Phaser.GameObjects.Container {
    const w = this.catW - 40;
    const c = this.add.container(0, y);
    c.add(panel(this, 'ui.well', w, h));
    c.add(iconObj(this, -w / 2 + 40, 0, icon(this, r.id), 54));
    const name = r.kind === 'fish' ? FISH[r.id].name : r.kind === 'forage' ? FORAGE[r.id].name : dishName(r.id);
    c.add(txtObj(this, -w / 2 + 80, -14, name, 'label', { align: 'left', size: 19 }));
    c.add(txtObj(this, -w / 2 + 80, 16, `${WORLD.money(r.price)} each · x${r.n}`, 'small', { align: 'left', size: 16, color: mix(P.ink, P.cream, 0.3) }));
    let qty = 1;
    const stepper = new Stepper(this, w / 2 - 230, 0, { value: 1, min: 1, max: r.n, size: 48, onChange: (v) => (qty = v) });
    c.add(stepper);
    c.add(
      new Button(this, w / 2 - 66, 0, {
        label: STR.shop.sell,
        variant: 'sage',
        w: 104,
        h: 48,
        textKind: 'label',
        onTap: () => {
          const earned = sell(r, qty);
          if (earned > 0) {
            playSfx('coin');
            bus.emit('toast', { text: fmt(STR.shop.sold, { money: WORLD.money(earned) }) });
            this.fill();
          }
        },
      }),
    );
    void RECIPES;
    return c;
  }

  // ---------------------------------------------------------------------------
  // Leaving
  // ---------------------------------------------------------------------------

  private tryLeave(): void {
    if (this.busy) return;
    const s = S();
    if (s.day === 1 && missingEssentials().length && !this.warned) {
      this.warned = true;
      s.flags[`essWarned${s.day}`] = true;
      Dialog.open(this, {
        title: STR.shop.leaveAsk,
        confirm: STR.shop.headOut,
        cancel: STR.shop.backToShopping,
        depth: DEPTH.overlay,
        onConfirm: () => this.leave(),
      });
      return;
    }
    this.leave();
  }

  private leave(): void {
    this.unpause?.();
    this.unpause = null;
    save('leaveShop');
    go(SCENES.camp, { fromShop: true });
  }

  // ---------------------------------------------------------------------------
  // Legend (mystery clue 3)
  // ---------------------------------------------------------------------------

  private legend(): void {
    this.busy = true;
    const lines = [...MYSTERY.legend, ...MYSTERY.lore];
    void this.boju.surprisedScale();
    playSfx('chime');
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        hearLegend();
        this.revealSteamer();
        this.busy = false;
        this.fill();
        return;
      }
      const text = lines[i++];
      this.say(text, 99999);
      if (i === 3) this.showRecipeCard();
      const cont = this.add.zone(0, 0, layout().w * 2, layout().h * 2).setOrigin(0).setInteractive().setDepth(DEPTH.overlay - 5);
      this.time.delayedCall(700, () => cont.once('pointerdown', () => {
        cont.destroy();
        next();
      }));
      this.time.delayedCall(6500, () => {
        if (cont.active) {
          cont.destroy();
          next();
        }
      });
    };
    this.time.delayedCall(900, next);
  }

  private showRecipeCard(): void {
    const l = layout();
    const r = RECIPES.moon_dumplings;
    const c = new Card(this, l.w / 2, l.h / 2 + 40, { w: 420, h: 250, tint: 'butter', title: r.name });
    c.setDepth(DEPTH.overlay - 4);
    c.add(iconObj(this, 0, -10, icon(this, r.id), 90));
    c.add(txtObj(this, 0, 76, `${GEAR.steamer.name} · ${PANTRY.flour.name} · ${FORAGE.moon_blossom.name} · ${FISH.night_glowfin.name}`, 'small', { size: 16, align: 'center', wrap: 380 }));
    popIn(this, c, 0, 500);
    sparkleBurst(this, l.w / 2, l.h / 2, { count: 20, depth: DEPTH.overlay - 3, spread: 1.6 });
    this.time.delayedCall(5200, () => this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() }));
  }

  private revealSteamer(): void {
    if (!this.cloth) return;
    const cl = this.cloth;
    this.tweens.add({ targets: cl, y: cl.y - 40, alpha: 0, angle: 12, duration: 700, onComplete: () => cl.destroy() });
    this.steamerImg = this.add.image(cl.x, cl.y - 4, 'cook_steamer').setOrigin(0.5, 1).setScale(0.38 / ART_SCALE).setDepth(2);
    popIn(this, this.steamerImg, 300);
    sparkleBurst(this, cl.x, cl.y - 40, { count: 14, depth: 5 });
  }
}
