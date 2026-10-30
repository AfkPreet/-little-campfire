/**
 * Fishing (spec section 5): tap the water near the dock or shore to cast;
 * 3-10 s wait with 0-2 harmless nibbles; on the bite tap anywhere within the
 * window (1.4 s, 1.9 s with a Rattan/Firefly rod); auto-reel 1.2 s; catch card
 * (Keep / Let go). A miss just swims away. Bait toggle beside the rod.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { bus } from '@/core/bus';
import { registerDebug } from '@/core/debug';
import { layout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { S } from '@/core/state';
import { CAMP } from '@/data/camp';
import { STR } from '@/data/dialogue';
import { FISH, FISHING } from '@/data/fish';
import type { FishId } from '@/data/ids';
import { WORLD } from '@/data/world';
import { playSfx, duckMusic } from '@/audio/engine';
import { heartBurst, ripple, sparkleBurst } from '@/fx/particles';
import { keepFish, landCatch, releaseFish, rollFish, startCast, takeRodHint, type Cast, type Catch } from '@/systems/fishing';
import { CatchCard } from '@/ui/CatchCard';
import { fmt, panel, shadowPanel, txtObj } from '@/ui';
import { pressable, setHitSize } from '@/ui/Button';
import { A, P, hexToInt } from '@/palette';
import { ART_SCALE } from '@/core/layout';
import type { CampCtx } from './ctx';
import { registerCampController, registerShot } from './registry';

type Phase = 'off' | 'ready' | 'casting' | 'waiting' | 'bite' | 'reeling' | 'card';
type Spot = 'dock' | 'shore';

export class Fishing {
  private phase: Phase = 'off';
  private spot: Spot = 'dock';
  private bobber: Phaser.GameObjects.Image | null = null;
  private bobberGlow: Phaser.GameObjects.Image | null = null;
  private line: Phaser.GameObjects.Image | null = null;
  private bang: Phaser.GameObjects.Image | null = null;
  private baitUi: Phaser.GameObjects.Container | null = null;
  private baitText: Phaser.GameObjects.Text | null = null;
  private cast: Cast | null = null;
  private t = 0;
  private nibbleIdx = 0;
  private bobX = 0;
  private bobY = 0;
  private biteDeadline = 0;
  private offs: (() => void)[] = [];
  private shotFreeze = false;

  constructor(private ctx: CampCtx) {
    const offBus = bus.on('camp:activity', (e) => this.onActivity(e.activity));
    this.offs.push(offBus);
    this.offs.push(ctx.onUpdate((time, delta) => this.update(time, delta)));
    // Dock interactable for keyboard / tap-on-dock.
    ctx.inter.add({
      id: 'dock',
      standX: () => CAMP.fishFrom.dock.x,
      hit: () => new Phaser.Geom.Rectangle(CAMP.dock.x1 - 120, CAMP.dock.y - 60, 140, 80),
      actions: () => (this.phase === 'off' ? [STR.actions.fish] : []),
      act: () => this.begin('dock', CAMP.fishFrom.dock.x + 180),
      near: 160,
    });
    registerDebug('fishCast', () => this.begin('dock', CAMP.fishFrom.dock.x + 160));
  }

  destroy(): void {
    this.offs.forEach((f) => f());
    this.cleanupVisuals();
    this.ctx.setTapInterceptor(null);
  }

  private onActivity(a: string): void {
    if (a.startsWith('waterTap:')) {
      const [x] = a.slice(9).split(',').map(Number);
      const spot: Spot = x >= CAMP.dock.x0 + 80 ? 'dock' : 'shore';
      this.begin(spot, x);
    } else if (a === 'leaveFishing' && this.phase !== 'off' && this.phase !== 'card') {
      this.stop();
    }
  }

  /** Walk to the spot (if needed) and cast toward world x. */
  begin(spot: Spot, targetX: number): void {
    const s = S();
    if (!s.rod) {
      bus.emit('toast', { text: STR.camp.noRod });
      playSfx('nope');
      return;
    }
    if (this.phase === 'card' || this.phase === 'reeling' || this.phase === 'casting') return;
    if (this.phase === 'bite') return;
    const from = CAMP.fishFrom[spot];
    const atSpot = this.phase !== 'off' && this.spot === spot && Math.abs(this.ctx.hero.x - from.x) < 8;
    this.spot = spot;
    const range = CAMP.castRange[spot];
    const tx = Phaser.Math.Clamp(targetX, from.x + range.min, from.x + range.max);
    if (atSpot) {
      this.reelInQuiet();
      this.doCast(tx);
      return;
    }
    this.cleanupVisuals();
    void this.ctx.walkTo(from.x).then((ok) => {
      if (!ok) return;
      this.enter();
      this.doCast(tx);
    });
  }

  private enter(): void {
    this.phase = 'ready';
    this.ctx.activity = 'fish';
    this.ctx.hero.face(1);
    this.ctx.hero.setPose('fish');
    this.ctx.focus(CAMP.fishFrom[this.spot].x + 160);
    this.showBaitUi();
  }

  private stop(): void {
    this.phase = 'off';
    this.cleanupVisuals();
    this.ctx.setTapInterceptor(null);
    this.ctx.focus(null);
    if (this.ctx.activity === 'fish') this.ctx.activity = 'idle';
  }

  private cleanupVisuals(): void {
    this.bobber?.destroy();
    this.bobberGlow?.destroy();
    this.line?.destroy();
    this.bang?.destroy();
    this.baitUi?.destroy();
    this.bobber = this.bobberGlow = this.line = this.bang = null;
    this.baitUi = null;
    this.baitText = null;
  }

  private reelInQuiet(): void {
    this.bobber?.destroy();
    this.bobberGlow?.destroy();
    this.line?.destroy();
    this.bobber = this.bobberGlow = this.line = null;
  }

  // ---------------------------------------------------------------------------
  // Cast
  // ---------------------------------------------------------------------------

  private doCast(tx: number): void {
    const sc = this.ctx.scene;
    const hero = this.ctx.hero;
    const c = startCast();
    if (!c) return;
    this.cast = c;
    this.phase = 'casting';
    this.updateBaitText();
    hero.setPose('cast');
    playSfx('whoosh');
    const ty = CAMP.waterY + 16 + Math.min(30, (tx - CAMP.fishFrom[this.spot].x) / 12);
    this.bobX = tx;
    this.bobY = ty;
    const tip = hero.rodTip();
    this.bobber = sc.add.image(tip.x, tip.y, 'fish_bobber').setScale(1 / ART_SCALE).setDepth(DEPTH.props + 4).setOrigin(0.5, 0.4);
    if (S().p >= 0.85 || S().rod === 'moonlight_rod') {
      this.bobberGlow = sc.add.image(tip.x, tip.y, 'fish_bobberGlow').setScale(1 / ART_SCALE).setDepth(DEPTH.props + 3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    }
    this.line = sc.add.image(tip.x, tip.y, 'px').setOrigin(0, 0.5).setTint(hexToInt(P.cream)).setAlpha(0.75).setDepth(DEPTH.props + 3);
    const o = { t: 0 };
    const sx = tip.x;
    const sy = tip.y;
    sc.time.delayedCall(260, () => {
      sc.tweens.add({
        targets: o,
        t: 1,
        duration: reduceMotion() ? 300 : 620,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const t = o.t;
          const mx = (sx + tx) / 2;
          const my = Math.min(sy, ty) - 120;
          const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * tx;
          const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ty;
          this.bobber?.setPosition(x, y);
        },
        onComplete: () => {
          playSfx('plip');
          ripple(sc, tx, ty + 4, { rings: 2, size: 0.8, depth: DEPTH.water + 1 });
          hero.setPose('fish');
          this.phase = 'waiting';
          this.t = 0;
          this.nibbleIdx = 0;
          this.ctx.setTapInterceptor((wx, wy) => this.onTap(wx, wy));
          if (takeRodHint()) bus.emit('toast', { text: STR.fishing.rodHint });
        },
      });
    });
  }

  private onTap(wx: number, wy: number): boolean {
    if (this.phase === 'bite') {
      this.hook();
      return true;
    }
    if (this.phase === 'waiting' || this.phase === 'ready') {
      // Tap water again: recast there. Anything else: leave fishing.
      if (wx >= CAMP.waterX && wy > CAMP.lakeHorizon + 20) {
        this.begin(wx >= CAMP.dock.x0 + 80 ? 'dock' : 'shore', wx);
        return true;
      }
      this.stop();
      return false;
    }
    return this.phase === 'reeling' || this.phase === 'card' || this.phase === 'casting';
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  private update(time: number, delta: number): void {
    if (this.phase === 'off') return;
    const dt = Math.min(delta, 50) / 1000;
    const sc = this.ctx.scene;
    // Line follows rod tip -> bobber.
    if (this.line && this.bobber) {
      const tip = this.ctx.hero.rodTip();
      const dx = this.bobber.x - tip.x;
      const dy = this.bobber.y - 6 - tip.y;
      this.line.setPosition(tip.x, tip.y);
      this.line.setRotation(Math.atan2(dy, dx));
      this.line.setDisplaySize(Math.hypot(dx, dy), 1.4);
      this.bobberGlow?.setPosition(this.bobber.x, this.bobber.y);
    }
    if (this.phase === 'waiting' && this.cast && this.bobber) {
      this.t += dt;
      // Gentle bob.
      if (!reduceMotion()) this.bobber.y = this.bobY + Math.sin(time / 420) * 1.6;
      const c = this.cast;
      if (this.nibbleIdx < c.nibbles.length && this.t >= c.nibbles[this.nibbleIdx]) {
        this.nibbleIdx++;
        this.nibble();
      }
      if (this.t >= c.wait) this.bite();
    }
    if (this.phase === 'bite' && !this.shotFreeze && sc.time.now > this.biteDeadline) this.miss();
  }

  private nibble(): void {
    const sc = this.ctx.scene;
    if (!this.bobber) return;
    playSfx('plip', { vol: 0.35, pitch: 1.3 });
    sc.tweens.add({ targets: this.bobber, y: this.bobY + 4, duration: 90, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    ripple(sc, this.bobX, this.bobY + 4, { rings: 1, size: 0.5, depth: DEPTH.water + 1 });
  }

  private bite(): void {
    const sc = this.ctx.scene;
    this.phase = 'bite';
    this.biteDeadline = sc.time.now + (this.cast?.window ?? 1.4) * 1000;
    playSfx('bite');
    if (this.bobber) sc.tweens.add({ targets: this.bobber, y: this.bobY + 9, duration: 120, ease: 'Sine.easeOut' });
    ripple(sc, this.bobX, this.bobY + 4, { rings: 3, size: 1.3, depth: DEPTH.water + 1, tint: P.glow });
    this.ctx.hero.surprised();
    const head = { x: this.ctx.hero.x + 10, y: this.ctx.hero.y - 136 };
    this.bang = sc.add.image(head.x, head.y, 'fish_bang').setScale(0.2 / ART_SCALE).setDepth(DEPTH.ui - 6);
    sc.tweens.add({ targets: this.bang, scale: 1 / ART_SCALE, duration: 260, ease: 'Back.easeOut', easeParams: [3] });
  }

  private hook(): void {
    const sc = this.ctx.scene;
    this.phase = 'reeling';
    this.ctx.setTapInterceptor(() => true);
    this.bang?.destroy();
    this.bang = null;
    const c: Catch = rollFish(this.cast?.bait ?? 'none');
    landCatch(c);
    this.ctx.hero.setPose('reel');
    playSfx('reel');
    if (this.bobber) {
      const tip = this.ctx.hero.rodTip();
      sc.tweens.add({ targets: this.bobber, x: tip.x + 30, y: CAMP.waterY + 6, duration: FISHING.reelSeconds * 1000, ease: 'Sine.easeIn' });
    }
    sc.time.delayedCall(FISHING.reelSeconds * 1000, () => {
      playSfx('splash');
      sparkleBurst(sc, this.ctx.hero.x + 40, CAMP.waterY - 10, { count: 12, depth: DEPTH.fx });
      this.reelInQuiet();
      this.showCard(c);
    });
  }

  private miss(): void {
    const sc = this.ctx.scene;
    this.phase = 'ready';
    this.bang?.destroy();
    this.bang = null;
    const flick = sc.add.image(this.bobX + 10, this.bobY + 10, 'fish_flick').setScale(1 / ART_SCALE).setAlpha(0).setDepth(DEPTH.water + 2);
    sc.tweens.add({ targets: flick, alpha: 0.55, x: flick.x + 50, duration: 320, yoyo: true, onComplete: () => flick.destroy() });
    ripple(sc, this.bobX + 30, this.bobY + 6, { rings: 2, size: 0.9, depth: DEPTH.water + 1 });
    playSfx('splash', { vol: 0.4 });
    bus.emit('toast', { text: STR.toasts.slipped });
    this.ctx.hero.setPose('fish');
    this.reelInQuiet();
  }

  private showCard(c: Catch): void {
    const sc = this.ctx.scene;
    this.phase = 'card';
    playSfx('fanfare');
    duckMusic(0.3, 2200);
    this.ctx.hero.setPose('hold');
    const key = `item_${c.id}`;
    this.ctx.hero.setHeldItem(sc.textures.exists(key) ? key : null);
    new CatchCard(sc, {
      ...c,
      onKeep: () => {
        keepFish(c);
        bus.emit('toast', { text: fmt(STR.toasts.caught, { fish: FISH[c.id].name, size: c.cm.toFixed(1) }), icon: sc.textures.exists(key) ? key : undefined });
        bus.emit('hud:bounce', { target: 'backpack' });
        playSfx('basket');
        this.afterCard();
      },
      onLetGo: () => {
        releaseFish(c);
        heartBurst(sc, this.ctx.hero.x + 120, CAMP.waterY + 10, 5, DEPTH.fx);
        if (c.golden) sparkleBurst(sc, this.ctx.hero.x + 120, CAMP.waterY, { count: 18, color: A.mahseer, depth: DEPTH.fx, spread: 1.6 });
        ripple(sc, this.ctx.hero.x + 120, CAMP.waterY + 12, { rings: 2, depth: DEPTH.water + 1 });
        playSfx('hearts');
        this.afterCard();
      },
    });
  }

  private afterCard(): void {
    this.ctx.hero.setHeldItem(null);
    this.ctx.hero.setPose('fish');
    this.phase = 'ready';
    this.ctx.setTapInterceptor((wx, wy) => this.onTap(wx, wy));
  }

  // ---------------------------------------------------------------------------
  // Bait toggle
  // ---------------------------------------------------------------------------

  private showBaitUi(): void {
    this.baitUi?.destroy();
    const s = S();
    if (s.bait.wiggly <= 0 && s.bait.sparkle <= 0) return;
    const sc = this.ctx.scene;
    const l = layout();
    const c = sc.add.container(l.w / 2, l.h - l.safe.bottom - 56).setScrollFactor(0).setDepth(DEPTH.ui);
    const w = 260;
    c.add([shadowPanel(sc, 'pill', w, 56, 0, 4, 0.13), panel(sc, 'ui.pill', w, 56)]);
    this.baitText = txtObj(sc, 0, 1, '', 'label', { size: 22 });
    c.add(this.baitText);
    setHitSize(c, w, 64);
    pressable(sc, c, {
      onTap: () => {
        const order: ('none' | 'wiggly' | 'sparkle')[] = ['none', 'wiggly', 'sparkle'];
        let i = order.indexOf(S().baitSelected);
        for (let k = 0; k < 3; k++) {
          i = (i + 1) % 3;
          const b = order[i];
          if (b === 'none' || S().bait[b] > 0) break;
        }
        S().baitSelected = order[i];
        this.updateBaitText();
      },
    });
    this.baitUi = c;
    this.updateBaitText();
  }

  private updateBaitText(): void {
    if (!this.baitText) return;
    const s = S();
    const b = s.baitSelected;
    const label = b === 'none' ? WORLD.bait.none : `${WORLD.bait[b]} x${s.bait[b]}`;
    this.baitText.setText(`${STR.fishing.bait}: ${label}`);
  }

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  /** Freeze in the bite state (for ?shot=bite). */
  shotBite(): void {
    const sc = this.ctx.scene;
    this.ctx.hero.x = CAMP.fishFrom.dock.x;
    this.enter();
    this.spot = 'dock';
    this.cast = { wait: 0.1, nibbles: [], window: 99, bait: 'none' };
    const tip = this.ctx.hero.rodTip();
    this.bobX = CAMP.fishFrom.dock.x + 170;
    this.bobY = CAMP.waterY + 26;
    this.bobber = sc.add.image(this.bobX, this.bobY, 'fish_bobber').setScale(1 / ART_SCALE).setDepth(DEPTH.props + 4).setOrigin(0.5, 0.4);
    this.line = sc.add.image(tip.x, tip.y, 'px').setOrigin(0, 0.5).setTint(hexToInt(P.cream)).setAlpha(0.75).setDepth(DEPTH.props + 3);
    this.shotFreeze = true;
    this.phase = 'waiting';
    this.t = 0;
  }

  shotCatch(id: FishId = 'blushing_trout'): void {
    this.ctx.hero.x = CAMP.fishFrom.dock.x;
    this.enter();
    const c: Catch = { id, cm: 26.4, isNew: true, stars: FISH[id].rarity === 'common' ? 1 : FISH[id].rarity === 'uncommon' ? 2 : 3, golden: false };
    this.showCard(c);
  }
}

let current: Fishing | null = null;
registerCampController((ctx) => {
  current = new Fishing(ctx);
  return current;
});
registerShot('bite', () => current?.shotBite());
registerShot('catch', () => current?.shotCatch());
