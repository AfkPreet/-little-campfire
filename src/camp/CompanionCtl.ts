/**
 * Kopila once befriended (spec section 5 Companion; WORLD 5.3): follows Tuki
 * on its hind legs, sits on the dock edge while Tuki fishes (crown flick on a
 * bite), sleeps by the fire as a bud-ball, wiggles when Tuki eats, and does a
 * tiny happy roll at blissful. The Camp scene owns the Kopila rig; this
 * controller only chooses its mode.
 */
import { bus } from '@/core/bus';
import { S } from '@/core/state';
import { CAMP } from '@/data/camp';
import { tierOf } from '@/systems/contentment';
import type { Kopila } from '@/chars/Kopila';
import type { CampCtx } from './ctx';
import { registerCampController } from './registry';

class CompanionCtl {
  private offs: (() => void)[] = [];
  private oneShot = 0;
  private lastMode = '';

  constructor(private ctx: CampCtx) {
    this.offs.push(ctx.onUpdate((_t, d) => this.update(d)));
    this.offs.push(
      bus.on('contentment:changed', (e) => {
        const k = this.kopila();
        if (!k) return;
        if (e.source === 'eat') this.play(k, 'wiggle', 1.6);
        if (e.tierChanged && tierOf(e.value) === 'blissful') this.play(k, 'roll', 1.4);
      }),
    );
    this.offs.push(
      bus.on('camp:activity', (e) => {
        if (e.activity === 'bite') this.kopila()?.flickCrown();
      }),
    );
  }

  private kopila(): Kopila | null {
    return (this.ctx.scene as unknown as { kopila: Kopila | null }).kopila ?? null;
  }

  private play(k: Kopila, mode: 'wiggle' | 'roll', secs: number): void {
    k.setMode(mode);
    this.lastMode = mode;
    this.oneShot = secs;
  }

  private update(delta: number): void {
    const k = this.kopila();
    if (!k || !S().companion.befriended) return;
    if (this.oneShot > 0) {
      this.oneShot -= delta / 1000;
      return;
    }
    const a = this.ctx.activity;
    let mode: 'follow' | 'sitDock' | 'sleepFire' = 'follow';
    if (a === 'fish' && this.ctx.hero.x > CAMP.dock.x0) mode = 'sitDock';
    else if ((a === 'sit' || a === 'sleep') && Math.abs(this.ctx.hero.x - CAMP.fire.x) < 160) mode = 'sleepFire';
    if (mode !== this.lastMode) {
      this.lastMode = mode;
      k.setMode(mode);
      if (mode === 'sitDock') k.walkTo(CAMP.fishFrom.dock.x - 52);
      if (mode === 'sleepFire') k.walkTo(CAMP.fire.x + 64);
    }
  }

  destroy(): void {
    this.offs.forEach((f) => f());
  }
}

registerCampController((ctx) => new CompanionCtl(ctx));
