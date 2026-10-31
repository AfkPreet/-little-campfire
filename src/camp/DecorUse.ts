/**
 * Using placed decor (spec section 6 Decor): the Pirka Stool is a seat by the
 * fire, the Tea-Chest Shelf is for reading at night and the Shawl Hammock for
 * napping — the shelf and hammock count as sitting by the fire.
 */
import Phaser from 'phaser';
import { bus } from '@/core/bus';
import { S } from '@/core/state';
import { STR } from '@/data/dialogue';
import { snapPoints } from '@/systems/camp';
import { CAMP } from '@/data/camp';
import type { DecorId } from '@/data/ids';
import type { CampCtx } from './ctx';
import { registerCampController } from './registry';

const USABLE: Partial<Record<DecorId, { action: string; pose: 'sit' | 'read' | 'nap'; activity: 'sit' | 'read' | 'nap'; nightOnly?: boolean }>> = {
  floor_cushion: { action: STR.actions.sit, pose: 'sit', activity: 'sit' },
  bookshelf: { action: STR.actions.read, pose: 'read', activity: 'read', nightOnly: true },
  hammock: { action: STR.actions.nap, pose: 'nap', activity: 'nap' },
};

class DecorUse {
  private ids: string[] = [];
  private off: () => void;

  constructor(private ctx: CampCtx) {
    this.refresh();
    this.off = bus.on('inventory:changed', () => this.refresh());
  }

  refresh(): void {
    for (const id of this.ids) this.ctx.inter.remove(id);
    this.ids = [];
    const pts = snapPoints();
    for (const p of S().camp.placed) {
      const use = USABLE[p.id];
      if (!use) continue;
      const sp = pts.find((x) => x.id === p.point);
      if (!sp) continue;
      const id = `decor:${p.point}`;
      const x = p.id === 'hammock' ? CAMP.twoTree.x : sp.x;
      const y = p.id === 'hammock' ? CAMP.twoTree.y : sp.y;
      this.ids.push(id);
      this.ctx.inter.add({
        id,
        standX: () => x,
        hit: () => new Phaser.Geom.Rectangle(x - 46, y - (p.id === 'hammock' ? 40 : 70), 92, 80),
        actions: () => (use.nightOnly && S().p < 1 ? [] : [use.action]),
        act: () => {
          const hero = this.ctx.hero;
          hero.x = x;
          if (p.id === 'hammock') hero.y = y + 30;
          hero.face(x < CAMP.fire.x ? 1 : -1);
          hero.setPose(use.pose);
          this.ctx.activity = use.activity;
        },
        near: 160,
      });
    }
  }

  destroy(): void {
    this.off();
    for (const id of this.ids) this.ctx.inter.remove(id);
  }
}

registerCampController((ctx) => new DecorUse(ctx));
