/**
 * Rare-moment visuals (spec sections 5-6): the systems fire 'moment' (chime,
 * banner, stamp, +8); this controller plays what you see in the sky.
 */
import { bus } from '@/core/bus';
import { CAMP } from '@/data/camp';
import { layout } from '@/core/layout';
import { playRainbow, playShootingStar, showMoonbow } from '@/world/skyMoments';
import type { CampCtx } from './ctx';
import { registerCampController, registerShot } from './registry';

class MomentsCtl {
  private off: () => void;
  private moonbow: { fadeOut(ms?: number): void } | null = null;

  constructor(private ctx: CampCtx) {
    this.off = bus.on('moment', (e) => this.play(e.id));
  }

  play(id: string): void {
    const sc = this.ctx.scene;
    const l = layout();
    switch (id) {
      case 'shooting_star':
        void playShootingStar(sc, { x: l.w * 0.62, y: 90 });
        break;
      case 'rainbow':
        void playRainbow(sc, { centerX: l.w * 0.6 });
        break;
      case 'moonbow':
        if (!this.moonbow) {
          this.moonbow = showMoonbow(sc, { centerX: l.w * 0.6, hold: true });
          sc.time.delayedCall(40000, () => {
            this.moonbow?.fadeOut(4000);
            this.moonbow = null;
          });
        }
        break;
      case 'firefly_swirl':
        this.ctx.light.fireflies.swirl(CAMP.fire.x, CAMP.groundY - 150);
        break;
      default:
        break;
    }
  }

  destroy(): void {
    this.off();
  }
}

let current: MomentsCtl | null = null;
registerCampController((ctx) => {
  current = new MomentsCtl(ctx);
  return current;
});
registerShot('star', () => current?.play('shooting_star'));
registerShot('rainbow', () => current?.play('rainbow'));
