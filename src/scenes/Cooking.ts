/**
 * Cooking overlay (spec section 5 Cooking, section 7 strings): a close-up of
 * the fire; pick one owned cookware; drag 1-3 ingredients from the basket
 * tray into it; stir by circling twice (hold 1.5 s with Reduce motion);
 * ~2.5 s of steam, bubbles and sizzle; the dish pops onto a plate. First time:
 * "NEW RECIPE!" and a journal stamp. Then Eat, Save or Share.
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { anyParam, markReady, registerDebug } from '@/core/debug';
import { ART_SCALE, layout, setupCamera } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { S, type DishItem } from '@/core/state';
import { STR } from '@/data/dialogue';
import { GEAR } from '@/data/items';
import { COOKING, MUSH } from '@/data/recipes';
import type { CookwareId, IngredientId } from '@/data/ids';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import { PANTRY } from '@/data/items';
import { P, A, hexToInt, mix } from '@/palette';
import { EASE, popIn, squash, wobble } from '@/fx/juice';
import { embers, heartBurst, sparkleBurst, steam } from '@/fx/particles';
import { playSfx, type SfxId } from '@/audio/engine';
import { cook, eat, ownedCookware, saveDish, type CookResult } from '@/systems/cooking';
import { basket, dishName, isFish, isForage } from '@/systems/inventory';
import { share } from '@/systems/companion';
import { pauseClock } from '@/systems/day';
import { applyDebugOnce } from '@/core/presets';
import { Button, Card, IconButton, fmt, iconObj, panel, shadowPanel, txtObj } from '@/ui';
import { pressable, setHitSize } from '@/ui/Button';

const COOKWARE_ART: Record<CookwareId, string> = { kettle: 'cook_kettle', clay_pot: 'cook_pot', skillet: 'cook_tawa', steamer: 'cook_steamer' };
const COOK_SFX: Record<CookwareId, SfxId> = { kettle: 'kettle', clay_pot: 'bubble', skillet: 'sizzle', steamer: 'bubble' };

function nameOf(id: IngredientId): string {
  if (isFish(id)) return FISH[id].name;
  if (isForage(id)) return FORAGE[id].name;
  return PANTRY[id as keyof typeof PANTRY].name;
}

function icon(scene: Phaser.Scene, id: string): string {
  const k = `item_${id}`;
  return scene.textures.exists(k) ? k : 'icon.star';
}

interface CookData {
  companionNear?: boolean;
  shot?: 'result';
}

export default class Cooking extends Phaser.Scene {
  private unpause: (() => void) | null = null;
  private cookware: CookwareId | null = null;
  private pot: IngredientId[] = [];
  private stage!: Phaser.GameObjects.Container;
  private ware: Phaser.GameObjects.Image | null = null;
  private slots: Phaser.GameObjects.Container[] = [];
  private tray!: Phaser.GameObjects.Container;
  private trayPage = 0;
  private hint!: Phaser.GameObjects.Text;
  private picker: Phaser.GameObjects.Container | null = null;
  private phase: 'pick' | 'fill' | 'cooking' | 'result' = 'pick';
  private stirAngle = 0;
  private lastAngle: number | null = null;
  private holdT = 0;
  private spoon: Phaser.GameObjects.Image | null = null;
  private stirRing: Phaser.GameObjects.Graphics | null = null;
  private result: Phaser.GameObjects.Container | null = null;
  private companionNear = false;
  private steamEm: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;
  private dragId: IngredientId | null = null;

  constructor() {
    super({ key: SCENES.cooking });
  }

  create(data: CookData = {}): void {
    applyDebugOnce();
    setupCamera(this);
    this.unpause = pauseClock();
    bus.emit('overlay:open', { key: SCENES.cooking });
    this.companionNear = !!data.companionNear;
    this.pot = [];
    this.phase = 'pick';
    this.slots = [];
    this.result = null;
    this.picker = null;
    this.trayPage = 0;
    const l = layout();

    // Scrim: warm dark wash over the camp.
    const scrim = this.add.rectangle(0, 0, l.w, l.h, hexToInt(mix(P.ink, '#2F3558', 0.5)), 0.82).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    scrim.on('pointerdown', () => undefined);
    this.stage = this.add.container(l.w / 2, 0).setDepth(DEPTH.overlay + 1);

    // Fire close-up.
    const fy = l.h - 150;
    const glow = this.add.image(0, fy - 70, 'cook_fireGlow').setScale(1.3 / ART_SCALE).setBlendMode(Phaser.BlendModes.ADD).setTint(hexToInt(P.ember)).setAlpha(0.55);
    const logs = this.add.image(0, fy - 14, 'cook_logs').setScale(1 / ART_SCALE);
    const flames = [
      this.add.image(0, fy - 40, 'cook_flameA').setScale(0.85 / ART_SCALE).setTint(hexToInt(P.ember)).setAlpha(0.9).setOrigin(0.5, 0.95),
      this.add.image(-10, fy - 38, 'cook_flameB').setScale(0.85 / ART_SCALE).setTint(hexToInt(mix(P.ember, P.glow, 0.5))).setOrigin(0.5, 0.95),
      this.add.image(6, fy - 36, 'cook_flameC').setScale(0.85 / ART_SCALE).setTint(hexToInt(mix(P.glow, P.butter, 0.4))).setOrigin(0.5, 0.95),
    ];
    flames.forEach((f, i) => {
      f.setScale(f.scaleX * 0.78);
      if (!reduceMotion()) {
        this.tweens.add({ targets: f, scaleY: f.scaleY * 1.12, scaleX: f.scaleX * 0.93, duration: 260 + i * 70, yoyo: true, repeat: -1, ease: EASE.loop });
        this.tweens.add({ targets: f, angle: { from: -3, to: 3 }, duration: 520 + i * 110, yoyo: true, repeat: -1, ease: EASE.loop });
      }
    });
    const stones = this.add.image(0, fy + 20, 'cook_stones').setScale(1 / ART_SCALE).setTint(hexToInt(mix(P.cream, P.peach, 0.35)));
    logs.setTint(hexToInt(mix(P.cream, P.peach, 0.3)));
    this.stage.add([glow, logs, ...flames, stones]);
    const em = embers(this, l.w / 2, fy - 60, DEPTH.overlay + 2);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => em.destroy());

    // Title + hint.
    this.hint = txtObj(this, 0, l.safe.top + 60, '', 'h2', { color: P.cream, size: 30 });
    this.stage.add(this.hint);
    const close = new IconButton(this, l.w / 2 - l.safe.right - 54, l.safe.top + 54, { icon: 'icon.close', size: 64, variant: 'cream', onTap: () => this.close() });
    this.stage.add(close);

    this.tray = this.add.container(0, l.h - l.safe.bottom - 70).setDepth(DEPTH.overlay + 3);
    this.stage.add(this.tray);

    registerDebug('cookingState', () => ({ cookware: this.cookware, pot: [...this.pot], phase: this.phase }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unpause?.();
      this.steamEm?.destroy();
    });

    const owned = ownedCookware();
    if (!owned.length) {
      this.hint.setText(STR.cooking.noCookware);
      this.hint.setWordWrapWidth(Math.min(700, l.w - 160));
      this.stage.add(new Button(this, 0, l.safe.top + 150, { label: STR.cooking.back, variant: 'secondary', onTap: () => this.close() }));
      markReady(this, 600);
      return;
    }
    if (owned.length === 1) this.selectCookware(owned[0]);
    else this.showPicker(owned);
    this.buildTray();

    if (data.shot === 'result' || anyParam('shot') === 'cook') this.time.delayedCall(200, () => this.shotResult());
    markReady(this, data.shot ? 1600 : 700);
  }

  // ---------------------------------------------------------------------------
  // Cookware
  // ---------------------------------------------------------------------------

  private showPicker(owned: CookwareId[]): void {
    const l = layout();
    this.picker?.destroy();
    const c = this.add.container(0, l.safe.top + 130);
    const w = 150;
    owned.forEach((id, i) => {
      const x = (i - (owned.length - 1) / 2) * (w + 16);
      const chip = this.add.container(x, 0);
      const selected = this.cookware === id;
      chip.add([shadowPanel(this, 'pill', w, 64, 0, 4, 0.14), panel(this, selected ? 'ui.card.butter' : 'ui.pill', w, 64)]);
      chip.add(iconObj(this, -w / 2 + 34, 0, icon(this, id), 44));
      chip.add(txtObj(this, 18, 1, GEAR[id].name.replace('Copper ', '').replace('Iron ', '').replace('Chiya ', ''), 'small', { size: 18 }));
      setHitSize(chip, w, 70);
      pressable(this, chip, { onTap: () => this.selectCookware(id) });
      if (selected) chip.y -= 6;
      c.add(chip);
    });
    this.stage.add(c);
    this.picker = c;
  }

  private selectCookware(id: CookwareId): void {
    if (this.phase === 'cooking' || this.phase === 'result') return;
    const l = layout();
    // Return anything already in the pot.
    this.pot = [];
    this.cookware = id;
    this.ware?.destroy();
    const wy = l.h - 250;
    this.ware = this.add.image(0, wy, COOKWARE_ART[id]).setScale(1 / ART_SCALE).setOrigin(0.5, 0.92);
    this.stage.add(this.ware);
    popIn(this, this.ware, 0, 380);
    playSfx('pop');
    this.buildSlots();
    this.phase = 'fill';
    this.updateHint();
    const owned = ownedCookware();
    if (owned.length > 1) this.showPicker(owned);
  }

  private potCenter(): { x: number; y: number } {
    const l = layout();
    return { x: l.w / 2, y: l.h - 330 };
  }

  private buildSlots(): void {
    this.slots.forEach((s) => s.destroy());
    this.slots = [];
    const l = layout();
    const y = l.h - 470;
    for (let i = 0; i < COOKING.maxIngredients; i++) {
      const c = this.add.container((i - 1) * 86, y);
      c.add(this.add.image(0, 0, 'cook_slot').setScale(1 / ART_SCALE));
      setHitSize(c, 76, 76);
      pressable(this, c, { onTap: () => this.removeFromPot(i), sfx: null });
      this.slots.push(c);
      this.stage.add(c);
    }
    this.refreshSlots();
  }

  private refreshSlots(): void {
    this.slots.forEach((c, i) => {
      while (c.length > 1) c.removeAt(1, true);
      const id = this.pot[i];
      if (id) c.add(iconObj(this, 0, 0, icon(this, id), 56));
    });
  }

  private removeFromPot(i: number): void {
    if (this.phase !== 'fill' || !this.pot[i]) return;
    this.pot.splice(i, 1);
    playSfx('pop', { pitch: 0.8 });
    this.refreshSlots();
    this.buildTray();
    this.updateHint();
  }

  private updateHint(): void {
    if (this.phase === 'fill') this.hint.setText(this.pot.length === 0 ? STR.cooking.hintDrag : reduceMotion() ? STR.cooking.hintHold : STR.cooking.hintStir);
    else if (this.phase === 'pick') this.hint.setText(STR.cooking.pick);
    else this.hint.setText('');
  }

  // ---------------------------------------------------------------------------
  // Basket tray (paged)
  // ---------------------------------------------------------------------------

  private available(): { id: IngredientId; n: number }[] {
    const used = new Map<IngredientId, number>();
    for (const id of this.pot) used.set(id, (used.get(id) ?? 0) + 1);
    return basket()
      .map((b) => ({ id: b.id, n: b.n - (used.get(b.id) ?? 0) }))
      .filter((b) => b.n > 0);
  }

  private buildTray(): void {
    this.tray.removeAll(true);
    const l = layout();
    const W = Math.min(l.w - 60, 1100);
    const H = 120;
    this.tray.add([shadowPanel(this, 'card', W, H, 0, 4, 0.15), panel(this, 'ui.card.cream', W, H)]);
    this.tray.add(txtObj(this, -W / 2 + 70, -H / 2 - 24, STR.cooking.basket, 'hand', { size: 28, color: P.cream }));
    const items = this.available();
    if (!items.length) {
      this.tray.add(txtObj(this, 0, 2, STR.cooking.empty, 'body', { size: 22 }));
      return;
    }
    const tileW = 96;
    const perPage = Math.max(3, Math.floor((W - 140) / tileW));
    const pages = Math.ceil(items.length / perPage);
    this.trayPage = Math.min(this.trayPage, pages - 1);
    const pageItems = items.slice(this.trayPage * perPage, this.trayPage * perPage + perPage);
    const startX = -((pageItems.length - 1) * tileW) / 2;
    pageItems.forEach((it, i) => {
      const tile = this.add.container(startX + i * tileW, 0);
      tile.add(panel(this, 'ui.well', tileW - 10, 100));
      const img = iconObj(this, 0, -14, icon(this, it.id), 54);
      tile.add(img);
      tile.add(txtObj(this, 0, 32, nameOf(it.id).split(' ').slice(-1)[0], 'small', { size: 14 }));
      if (it.n > 1) tile.add(txtObj(this, tileW / 2 - 24, -36, `x${it.n}`, 'small', { size: 15 }));
      setHitSize(tile, tileW - 6, 104);
      tile.on('pointerdown', (p: Phaser.Input.Pointer) => this.startDrag(it.id, p));
      tile.setData('label', nameOf(it.id));
      this.tray.add(tile);
    });
    if (pages > 1) {
      const prev = new IconButton(this, -W / 2 + 40, 0, { icon: 'icon.arrowLeft', size: 56, variant: 'cream', disabled: this.trayPage === 0, onTap: () => { this.trayPage--; this.buildTray(); } });
      const next = new IconButton(this, W / 2 - 40, 0, { icon: 'icon.arrowRight', size: 56, variant: 'cream', disabled: this.trayPage >= pages - 1, onTap: () => { this.trayPage++; this.buildTray(); } });
      this.tray.add([prev, next]);
    }
  }

  private startDrag(id: IngredientId, p: Phaser.Input.Pointer): void {
    if (this.phase !== 'fill') return;
    if (this.pot.length >= COOKING.maxIngredients) {
      this.slots.forEach((s) => wobble(this, s as unknown as Phaser.GameObjects.Image));
      playSfx('nope');
      return;
    }
    this.dragId = id;
    this.dragGhost = this.add.image(p.x / layout().zoom, p.y / layout().zoom, icon(this, id)).setDepth(DEPTH.overlay + 10);
    const k = 72 / (this.dragGhost.frame.realWidth / ART_SCALE);
    this.dragGhost.setScale((k * 1.1) / ART_SCALE);
    playSfx('pop', { vol: 0.5 });
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const z = layout().zoom;
    if (this.dragGhost) {
      this.dragGhost.setPosition(p.x / z, p.y / z);
      return;
    }
    if (this.phase !== 'fill' || this.pot.length === 0 || !p.isDown) return;
    // Stirring: accumulate angle around the pot centre.
    const c = this.potCenter();
    const dx = p.x / z - c.x;
    const dy = p.y / z - c.y;
    if (Math.hypot(dx, dy) > 260) {
      this.lastAngle = null;
      return;
    }
    const a = Math.atan2(dy, dx);
    if (this.lastAngle !== null) {
      let d = a - this.lastAngle;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.stirAngle += Math.abs(d);
      this.showSpoon(p.x / z, p.y / z);
      if (Math.abs(d) > 0.25) playSfx('stir', { vol: 0.25 });
      if (this.stirAngle >= Math.PI * 2 * COOKING.stirCircles) this.startCooking();
    }
    this.lastAngle = a;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    this.lastAngle = null;
    if (this.dragGhost && this.dragId) {
      const z = layout().zoom;
      const c = this.potCenter();
      const inPot = Math.abs(p.x / z - c.x) < 200 && p.y / z > c.y - 260 && p.y / z < c.y + 160;
      const ghost = this.dragGhost;
      const id = this.dragId;
      this.dragGhost = null;
      this.dragId = null;
      if (inPot && this.pot.length < COOKING.maxIngredients) {
        this.pot.push(id);
        this.tweens.add({ targets: ghost, x: c.x, y: c.y + 40, scale: ghost.scale * 0.5, alpha: 0.2, duration: 220, ease: EASE.in, onComplete: () => ghost.destroy() });
        playSfx('plip');
        if (this.ware) squash(this, this.ware, 0.7);
        sparkleBurst(this, c.x, c.y + 20, { count: 5, depth: DEPTH.overlay + 4 });
        this.refreshSlots();
        this.buildTray();
        this.updateHint();
      } else {
        this.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 0.6, duration: 200, onComplete: () => ghost.destroy() });
      }
    }
  }

  private showSpoon(x: number, y: number): void {
    if (!this.spoon) this.spoon = this.add.image(x, y, 'cook_spoon').setScale(1 / ART_SCALE).setOrigin(0.5, 0.85).setDepth(DEPTH.overlay + 6).setAngle(-20);
    this.spoon.setPosition(x, y);
  }

  override update(_t: number, delta: number): void {
    // Hold-to-stir (Reduce motion).
    if (this.phase === 'fill' && this.pot.length > 0 && reduceMotion()) {
      const p = this.input.activePointer;
      const z = layout().zoom;
      const c = this.potCenter();
      const over = p.isDown && Math.abs(p.x / z - c.x) < 200 && Math.abs(p.y / z - c.y) < 200 && !this.dragGhost;
      if (over) {
        this.holdT += delta / 1000;
        this.drawHoldRing(this.holdT / COOKING.holdSeconds);
        if (this.holdT >= COOKING.holdSeconds) this.startCooking();
      } else if (this.holdT > 0) {
        this.holdT = 0;
        this.drawHoldRing(0);
      }
    }
  }

  private drawHoldRing(f: number): void {
    if (!this.stirRing) this.stirRing = this.add.graphics().setDepth(DEPTH.overlay + 6);
    const c = this.potCenter();
    this.stirRing.clear();
    if (f <= 0) return;
    this.stirRing.lineStyle(8, hexToInt(P.glow), 0.9);
    this.stirRing.beginPath();
    this.stirRing.arc(c.x, c.y, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f));
    this.stirRing.strokePath();
  }

  // ---------------------------------------------------------------------------
  // Cook
  // ---------------------------------------------------------------------------

  private startCooking(): void {
    if (this.phase !== 'fill' || !this.cookware) return;
    this.phase = 'cooking';
    this.stirAngle = 0;
    this.holdT = 0;
    this.drawHoldRing(0);
    this.spoon?.destroy();
    this.spoon = null;
    this.updateHint();
    const c = this.potCenter();
    playSfx(COOK_SFX[this.cookware]);
    this.steamEm = steam(this, c.x, c.y - 80, DEPTH.overlay + 5, 1.6);
    const bubbles: Phaser.GameObjects.Image[] = [];
    const bubbleTimer = this.time.addEvent({
      delay: reduceMotion() ? 400 : 130,
      loop: true,
      callback: () => {
        const b = this.add.image(c.x + Phaser.Math.Between(-70, 70), c.y - 60, 'cook_bubble').setScale(0.6 / ART_SCALE).setDepth(DEPTH.overlay + 5);
        bubbles.push(b);
        this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(30, 70), scale: 1 / ART_SCALE, alpha: 0, duration: 700, onComplete: () => b.destroy() });
      },
    });
    if (this.ware && !reduceMotion()) this.tweens.add({ targets: this.ware, angle: { from: -2, to: 2 }, duration: 160, yoyo: true, repeat: 7 });
    this.time.delayedCall(COOKING.cookSeconds * 1000, () => {
      bubbleTimer.remove();
      this.steamEm?.stop();
      const res = cook(this.cookware!, [...this.pot]);
      this.pot = [];
      this.refreshSlots();
      if (res) this.showResult(res);
      else {
        this.phase = 'fill';
        this.updateHint();
        this.buildTray();
      }
    });
  }

  private showResult(res: CookResult): void {
    this.phase = 'result';
    this.updateHint();
    const l = layout();
    const c = this.add.container(l.w / 2, l.h / 2 - 20).setDepth(DEPTH.overlay + 8);
    this.result = c;
    const W = 460;
    const H = 430;
    const card = new Card(this, 0, 0, { w: W, h: H, ribbon: res.isNew ? STR.cooking.newRecipe : undefined, tint: res.recipe ? 'cream' : 'lavender' });
    const plate = this.add.image(0, -H / 2 + 172, 'cook_plate').setScale(1 / ART_SCALE);
    const dish = iconObj(this, 0, -H / 2 + 128, icon(this, res.dish.id), 130);
    const name = txtObj(this, 0, -H / 2 + 238, res.recipe ? res.name : STR.cooking.mush, 'h2', { align: 'center', wrap: W - 60 });
    const flav = txtObj(this, 0, -H / 2 + 286, res.recipe ? res.recipe.flavor : MUSH.flavor, 'body', { size: 21, align: 'center', wrap: W - 70, color: mix(P.ink, P.cream, 0.25) });
    c.add([card, plate, dish, name, flav]);
    const btns: { label: string; v: 'primary' | 'secondary' | 'warm'; fn: () => void }[] = [
      { label: STR.cooking.eat, v: 'primary', fn: () => this.finishDish(res.dish, 'eat') },
      { label: STR.cooking.save, v: 'secondary', fn: () => this.finishDish(res.dish, 'save') },
    ];
    if (this.companionNear && res.dish.id !== 'moon_dumplings') btns.push({ label: STR.cooking.share, v: 'warm', fn: () => this.finishDish(res.dish, 'share') });
    const bw = btns.length === 3 ? 130 : 160;
    btns.forEach((b, i) => {
      const x = (i - (btns.length - 1) / 2) * (bw + 12);
      c.add(new Button(this, x, H / 2 - 52, { label: b.label, variant: b.v, w: b.label.length > 8 ? bw + 20 : bw, textKind: b.label.length > 8 ? 'label' : 'button', onTap: b.fn }));
    });
    popIn(this, c, 0, 520);
    sparkleBurst(this, l.w / 2, l.h / 2 - 90, { count: res.isNew ? 22 : 12, depth: DEPTH.overlay + 9, spread: 1.5 });
    playSfx(res.isNew ? 'fanfare' : 'pop');
    if (res.isNew) {
      bus.emit('toast', { text: fmt(STR.toasts.newRecipe, { dish: res.name }) });
      bus.emit('hud:bounce', { target: 'journal' });
    }
    if (!res.recipe && !reduceMotion()) this.tweens.add({ targets: dish, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: 3 });
  }

  private finishDish(d: DishItem, how: 'eat' | 'save' | 'share'): void {
    const l = layout();
    if (how === 'eat') {
      eat(d);
      playSfx('pop', { pitch: 1.2 });
      heartBurst(this, l.w / 2, l.h / 2 - 60, 4, DEPTH.overlay + 9);
    } else if (how === 'save') {
      saveDish(d);
      playSfx('basket');
      bus.emit('hud:bounce', { target: 'backpack' });
    } else {
      const r = share();
      heartBurst(this, l.w / 2, l.h / 2 - 60, 6, DEPTH.overlay + 9);
      bus.emit('toast', { text: r === 'befriended' ? STR.companion.stay : fmt(STR.companion.nibbled, { dish: dishName(d.id) }) });
      playSfx('squeak');
    }
    const c = this.result;
    this.result = null;
    if (c) this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 220, onComplete: () => c.destroy() });
    this.phase = 'fill';
    this.updateHint();
    this.buildTray();
    // Nothing left to cook with: close after a beat.
    if (!this.available().length) this.time.delayedCall(700, () => this.close());
  }

  private shotResult(): void {
    // Screenshot: show a fresh Honey Chiya result.
    const s = S();
    s.gear.kettle = true;
    s.pantry.tea = (s.pantry.tea ?? 0) + 1;
    s.pantry.honey = (s.pantry.honey ?? 0) + 1;
    delete s.journal.recipes.honey_tea;
    this.selectCookware('kettle');
    const res = cook('kettle', ['tea', 'honey']);
    if (res) this.showResult(res);
  }

  private close(): void {
    this.unpause?.();
    this.unpause = null;
    bus.emit('overlay:close', { key: SCENES.cooking });
    this.scene.stop();
  }
}

void A;
