/**
 * Decor mode (spec section 5 "Shelter and decor"): drag items from the
 * backpack tray to snap points. Hang points sit on the tent and branches,
 * ground points ring the clearing, the hammock needs the two-tree point, and
 * string lights span two hang points. Tap a placed item to move or store it.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { bus } from '@/core/bus';
import { ART_SCALE, layout } from '@/core/layout';
import { S } from '@/core/state';
import { STR } from '@/data/dialogue';
import { DECOR } from '@/data/decor';
import { DECOR_IDS, type DecorId } from '@/data/ids';
import { playSfx } from '@/audio/engine';
import { sparkleBurst } from '@/fx/particles';
import { freePointsFor, place, snapPoints, store, type SnapPoint } from '@/systems/camp';
import { Button, iconObj, panel, shadowPanel, txtObj } from '@/ui';
import { setHitSize } from '@/ui/Button';
import { P, hexToInt } from '@/palette';
import { DecorProp } from '@/world/props';
import type { CampCtx } from './ctx';
import { registerCampController } from './registry';

export class DecorMode {
  private active = false;
  private ui: Phaser.GameObjects.Container | null = null;
  private dots: Phaser.GameObjects.Image[] = [];
  private ghost: DecorProp | null = null;
  private ghostId: DecorId | null = null;
  private hover: SnapPoint | null = null;
  private panStart: { x: number; scroll: number } | null = null;
  private offs: (() => void)[] = [];

  constructor(private ctx: CampCtx) {
    this.offs.push(bus.on('camp:activity', (e) => {
      if (e.activity === 'decorate') this.enter();
    }));
    const sc = ctx.scene;
    const move = (p: Phaser.Input.Pointer) => this.onMove(p);
    const up = (p: Phaser.Input.Pointer) => this.onUp(p);
    sc.input.on('pointermove', move);
    sc.input.on('pointerup', up);
    this.offs.push(() => {
      sc.input.off('pointermove', move);
      sc.input.off('pointerup', up);
    });
  }

  destroy(): void {
    this.offs.forEach((f) => f());
    this.exit(true);
  }

  private enter(): void {
    if (this.active || !S().camp.pitched) return;
    this.active = true;
    this.ctx.activity = 'decor';
    this.ctx.closeBubbles();
    const t = this.ctx.tent();
    this.ctx.focus(t ? t.x + 80 : null);
    this.ctx.setTapInterceptor((wx, wy) => this.onTap(wx, wy));
    bus.emit('hud:hint', { text: STR.camp.decorHint });
    this.buildUi();
    playSfx('page');
  }

  private exit(silent = false): void {
    if (!this.active) return;
    this.active = false;
    this.ui?.destroy();
    this.ui = null;
    this.clearDots();
    this.ghost?.destroy();
    this.ghost = null;
    this.ctx.setTapInterceptor(null);
    this.ctx.focus(null);
    if (!silent) {
      this.ctx.activity = 'idle';
      bus.emit('hud:hint', { text: null });
      playSfx('pop');
    }
  }

  private buildUi(): void {
    this.ui?.destroy();
    const sc = this.ctx.scene;
    const l = layout();
    const c = sc.add.container(l.w / 2, l.h - l.safe.bottom - 72).setScrollFactor(0).setDepth(DEPTH.ui + 2);
    const items = DECOR_IDS.filter((id) => (S().decor[id] ?? 0) > 0);
    const tileW = 100;
    const W = Math.max(360, Math.min(l.w - 280, items.length * tileW + 60));
    c.add([shadowPanel(sc, 'card', W, 120, 0, 4, 0.15), panel(sc, 'ui.card.cream', W, 120)]);
    if (!items.length) c.add(txtObj(sc, 0, 0, STR.backpack.empty, 'body', { size: 22 }));
    items.slice(0, Math.floor((W - 40) / tileW)).forEach((id, i) => {
      const x = -((Math.min(items.length, Math.floor((W - 40) / tileW)) - 1) * tileW) / 2 + i * tileW;
      const tile = sc.add.container(x, 0);
      tile.add(panel(sc, 'ui.well', tileW - 10, 100));
      const key = sc.textures.exists(`item_${id}`) ? `item_${id}` : 'icon.star';
      tile.add(iconObj(sc, 0, -12, key, 54));
      tile.add(txtObj(sc, 0, 32, DECOR[id].name.split(' ').slice(-1)[0], 'small', { size: 14 }));
      setHitSize(tile, tileW - 6, 104);
      tile.on('pointerdown', (p: Phaser.Input.Pointer) => this.startDrag(id, p));
      c.add(tile);
    });
    const done = new Button(sc, W / 2 + 90, 0, { label: STR.actions.done, variant: 'primary', w: 140, onTap: () => this.exit() });
    c.add(done);
    this.ui = c;
  }

  private worldPoint(p: Phaser.Input.Pointer): { x: number; y: number } {
    const wp = this.ctx.scene.cameras.main.getWorldPoint(p.x, p.y);
    return { x: wp.x, y: wp.y };
  }

  private startDrag(id: DecorId, p: Phaser.Input.Pointer): void {
    const free = freePointsFor(id);
    if (!free.length) {
      playSfx('nope');
      return;
    }
    const w = this.worldPoint(p);
    this.ghostId = id;
    this.ghost = new DecorProp(this.ctx.scene, id, w.x, w.y);
    this.ghost.setGhost(true);
    this.showDots(free);
    playSfx('pop', { vol: 0.5 });
  }

  private showDots(points: SnapPoint[]): void {
    this.clearDots();
    const sc = this.ctx.scene;
    for (const pt of points) {
      const d = sc.add.image(pt.x, pt.y, 'glowSmall').setScale(1.4 / ART_SCALE).setTint(hexToInt(P.glow)).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx);
      sc.tweens.add({ targets: d, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.dots.push(d);
    }
  }

  private clearDots(): void {
    this.dots.forEach((d) => d.destroy());
    this.dots = [];
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.active) return;
    if (this.ghost && this.ghostId) {
      const w = this.worldPoint(p);
      const free = freePointsFor(this.ghostId);
      let best: SnapPoint | null = null;
      let bd = 90;
      for (const pt of free) {
        const d = Math.hypot(pt.x - w.x, pt.y - w.y);
        if (d < bd) {
          bd = d;
          best = pt;
        }
      }
      this.hover = best;
      this.rebuildGhostAt(best ? best : w);
      return;
    }
    if (this.panStart && p.isDown) {
      const cam = this.ctx.scene.cameras.main;
      const dx = (p.x - this.panStart.x) / layout().zoom;
      this.ctx.focus(this.panStart.scroll - dx + layout().w * 0.45);
      void cam;
    }
  }

  private rebuildGhostAt(pt: { x: number; y: number; ends?: [string, string] }): void {
    if (!this.ghostId) return;
    const all = snapPoints();
    let to: { x: number; y: number } | undefined;
    let x = pt.x;
    let y = pt.y;
    if (pt.ends) {
      const a = all.find((q) => q.id === pt.ends![0]);
      const b = all.find((q) => q.id === pt.ends![1]);
      if (a && b) {
        x = a.x;
        y = a.y;
        to = { x: b.x, y: b.y };
      }
    }
    this.ghost?.destroy();
    this.ghost = new DecorProp(this.ctx.scene, this.ghostId, x, y, to ? { to } : undefined);
    this.ghost.setGhost(true);
  }

  private onUp(_p: Phaser.Input.Pointer): void {
    this.panStart = null;
    if (!this.active || !this.ghost || !this.ghostId) return;
    const id = this.ghostId;
    const pt = this.hover;
    this.ghost.destroy();
    this.ghost = null;
    this.ghostId = null;
    this.hover = null;
    this.clearDots();
    if (pt && place(id, pt.id)) {
      this.ctx.rebuildDecor();
      playSfx('tok');
      sparkleBurst(this.ctx.scene, pt.x, pt.y, { count: 12, depth: DEPTH.fx });
      bus.emit('hud:bounce', { target: 'lamp' });
    }
    this.buildUi();
  }

  private onTap(wx: number, wy: number): boolean {
    const point = this.ctx.decorHit(wx, wy);
    if (point) {
      const placed = S().camp.placed.find((x) => x.point === point);
      if (!placed) return true;
      this.ctx.bubbles(wx, wy - 40, [
        {
          label: STR.actions.move,
          onTap: () => {
            store(point);
            this.ctx.rebuildDecor();
            this.buildUi();
            const fake = { x: 0, y: 0 } as Phaser.Input.Pointer;
            const cam = this.ctx.scene.cameras.main;
            (fake as { x: number; y: number }).x = (wx - cam.scrollX) * layout().zoom;
            (fake as { x: number; y: number }).y = (wy - cam.scrollY) * layout().zoom;
            this.startDrag(placed.id, fake);
          },
        },
        {
          label: STR.actions.store,
          onTap: () => {
            store(point);
            this.ctx.rebuildDecor();
            this.buildUi();
            playSfx('basket');
          },
        },
      ]);
      return true;
    }
    // Empty space: start a camera pan.
    const cam = this.ctx.scene.cameras.main;
    this.panStart = { x: this.ctx.scene.input.activePointer.x, scroll: cam.scrollX };
    return true;
  }
}

registerCampController((ctx) => new DecorMode(ctx));
