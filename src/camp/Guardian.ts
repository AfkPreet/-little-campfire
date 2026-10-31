/**
 * The guardian in the water (spec section 5 Mystery; WORLD 5.4): the
 * first-night glow far out on the lake, the guardian-night ear perk, the
 * dock offering and the ~45 s finale (skippable on replays).
 */
import { pinToScreen } from '@/ui/pin';
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { bus } from '@/core/bus';
import { registerDebug } from '@/core/debug';
import { layout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { S, save } from '@/core/state';
import { CAMP } from '@/data/camp';
import { MYSTERY } from '@/data/mystery';
import { STR } from '@/data/dialogue';
import { playSfx } from '@/audio/engine';
import { ripple, sparkleBurst, sparkleTrail } from '@/fx/particles';
import { GlowSighting, Kuhiro, UnderGlow } from '@/chars/Kuhiro';
import { cloudPartingPlume, highlightGurans, showMoonbow } from '@/world/skyMoments';
import { completeFinale, glowSeen, offeringReady, shouldShowGlow } from '@/systems/mystery';
import { triggerMoment } from '@/systems/moments';
import { Button } from '@/ui';
import type { CampCtx } from './ctx';
import { registerCampController, registerShot } from './registry';

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(reduceMotion() ? ms * 0.6 : ms, () => r()));

export class Guardian {
  private kuhiro: Kuhiro | null = null;
  private glow: UnderGlow | null = null;
  private offs: (() => void)[] = [];
  private perkT = 30;
  private running = false;
  private skipped = false;
  private skipBtn: Button | null = null;

  constructor(private ctx: CampCtx) {
    this.offs.push(bus.on('camp:activity', (e) => {
      if (e.activity === 'glowSighting') void this.sighting();
    }));
    this.offs.push(ctx.onUpdate((t, d) => this.update(t, d)));
    ctx.inter.add({
      id: 'offering',
      standX: () => CAMP.fishFrom.dock.x - 10,
      hit: () => new Phaser.Geom.Rectangle(CAMP.dock.x1 - 150, CAMP.dock.y - 110, 170, 130),
      enabled: () => offeringReady().ok && !this.running,
      actions: () => (offeringReady().ok && !this.running ? [MYSTERY.offering] : []),
      act: () => void this.finale(),
      priority: 5,
      near: 220,
      bubbleAt: () => ({ x: CAMP.dock.x1 - 60, y: CAMP.dock.y - 130 }),
    });
    registerDebug('finale', () => void this.finale());
  }

  destroy(): void {
    this.offs.forEach((f) => f());
    this.kuhiro?.destroy();
    this.glow?.destroy();
    this.skipBtn?.destroy();
  }

  private update(time: number, delta: number): void {
    this.kuhiro?.tick(time, delta);
    const s = S();
    // Guardian-night tell: rainy night, glowing, legend heard.
    if (!this.running && s.p >= 1 && s.weather.raining && s.contentment.value >= MYSTERY.finaleContentment && s.mystery.step >= 3 && s.mystery.step < 5) {
      this.perkT -= delta / 1000;
      if (this.perkT <= 0 && this.ctx.activity === 'idle') {
        this.perkT = 25 + Math.random() * 15;
        this.ctx.hero.perkTowardLake();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Clue 1: the first-night glow
  // ---------------------------------------------------------------------------

  private async sighting(): Promise<void> {
    if (!shouldShowGlow()) return;
    const g = new GlowSighting(this.ctx.scene);
    await g.play(CAMP.glow.x, CAMP.glow.y);
    if (shouldShowGlow()) glowSeen();
  }

  // ---------------------------------------------------------------------------
  // Finale
  // ---------------------------------------------------------------------------

  private ensureKuhiro(): Kuhiro {
    if (!this.kuhiro) {
      this.kuhiro = new Kuhiro(this.ctx.scene, CAMP.guardian.x, CAMP.waterY);
      this.kuhiro.setDepth(DEPTH.water + 2);
      this.ctx.light.add(this.kuhiro);
    }
    return this.kuhiro;
  }

  async finale(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.skipped = false;
    const ctx = this.ctx;
    const sc = ctx.scene;
    const hero = ctx.hero;
    const replay = S().journal.clues[4];
    ctx.setBusy(true);
    ctx.closeBubbles();
    ctx.activity = 'finale';
    ctx.focus(CAMP.dock.x1 + 40);
    if (replay) this.showSkip();

    // 0-5 s: set the momos down at the dock end and sit; rain thins to 40%.
    const at = CAMP.dock.x1 - 30;
    await ctx.walkTo(CAMP.fishFrom.dock.x - 40);
    hero.face(1);
    hero.setPose('sit');
    ctx.light.rainScale = 0.4;
    const momoKey = sc.textures.exists('item_moon_dumplings') ? 'item_moon_dumplings' : 'logo_momo';
    const momos = sc.add.image(at, CAMP.dock.y - 14, momoKey).setDepth(DEPTH.props + 6);
    momos.setScale(56 / momos.frame.realWidth);
    sparkleBurst(sc, at, CAMP.dock.y - 20, { count: 8, color: '#DCE8F5', depth: DEPTH.fx });
    playSfx('pop');
    if (await this.beat(5000)) return this.endFinale(momos);

    // 5-11 s: the glow wells up; the lake lights from below; ears perk.
    this.glow = new UnderGlow(sc, CAMP.dock.x1 + 60, CAMP.waterY);
    this.glow.set(0.5, 4500);
    for (let i = 0; i < 3; i++) sc.time.delayedCall(i * 1400, () => ripple(sc, CAMP.dock.x1 + 70, CAMP.waterY + 14, { rings: 2, size: 1.6, depth: DEPTH.water + 1, tint: '#CFE6E2' }));
    sc.time.delayedCall(2500, () => hero.perkTowardLake());
    if (await this.beat(6000)) return this.endFinale(momos);

    // 11-17 s: Kuhiro rises.
    const k = this.ensureKuhiro();
    playSfx('splash', { vol: 0.5 });
    await k.rise(5000);
    if (await this.beat(1000)) return this.endFinale(momos);

    // 17-21 s: slow blink, and Tuki blinks back.
    await k.slowBlink();
    await hero.slowBlink();
    if (await this.beat(600)) return this.endFinale(momos);

    // 21-25 s: it nuzzles the dock; the planks bob, Tuki wobbles.
    const nuzzle = k.nuzzle();
    sc.time.delayedCall(900, () => {
      hero.squash(1.08, 0.9, 140);
      playSfx('tok', { vol: 0.4, pitch: 0.6 });
    });
    await nuzzle;
    if (await this.beat(800)) return this.endFinale(momos);

    // 25-30 s: the momos float to its mouth on a sparkle trail; happy rumble; freckles light.
    const mouth = k.mouthPoint();
    const trail = sparkleTrail(sc, momos, DEPTH.fx);
    await new Promise<void>((r) => sc.tweens.add({ targets: momos, x: mouth.x, y: mouth.y, scale: momos.scale * 0.5, duration: 1600, ease: 'Sine.easeInOut', onComplete: () => r() }));
    trail.stop();
    momos.setVisible(false);
    playSfx('rumble');
    await k.eat();
    await k.lightFreckles();
    if (await this.beat(400)) return this.endFinale(momos);

    // 30-37 s: one great plume of mist parts the clouds: stars, the Gurans, a moonbow.
    const plume = k.plumePoint();
    void k.breathePlume();
    void cloudPartingPlume(sc, plume.x, plume.y);
    const o = { a: 0 };
    sc.tweens.add({ targets: o, a: 1, duration: 4000, ease: 'Sine.easeInOut', onUpdate: () => ctx.landscape.setSkyOpen(o.a) });
    await wait(sc, 2600);
    const g = ctx.landscape.guransAnchor();
    const l = layout();
    void highlightGurans(sc, g.x * (g.x <= 1 ? l.w : 1), g.y);
    showMoonbow(sc, { hold: true });
    ctx.light.fireflies.swirl(CAMP.dock.x0, CAMP.groundY - 160);
    if (await this.beat(4000)) return this.endFinale(momos);

    // 37-42 s: one freckle-light drifts to the Moon Scale in Tuki's doko; it becomes Kuhiro's Lantern.
    await k.releaseFreckle(hero.x - 28 * hero.facing, hero.y - 70);
    sparkleBurst(sc, hero.x - 20, hero.y - 80, { count: 18, color: '#FFD59A', depth: DEPTH.fx, spread: 1.4 });
    playSfx('chime');
    hero.setScaleGlow(false);
    await k.slowBlink();
    triggerMoment('moonbow');
    if (await this.beat(1500)) return this.endFinale(momos);

    // 42-45 s: it sinks in widening rings; the glow fades; the moonbow and stars stay.
    this.glow.set(0, 2500);
    await k.sink(3000);
    this.endFinale(momos);
  }

  /** Wait between beats; returns true if the player skipped. */
  private async beat(ms: number): Promise<boolean> {
    await wait(this.ctx.scene, ms);
    return this.skipped;
  }

  private showSkip(): void {
    const l = layout();
    this.skipBtn = new Button(this.ctx.scene, l.w - l.safe.right - 90, l.safe.top + 120, { label: STR.skip, variant: 'quiet', w: 140, onTap: () => (this.skipped = true) });
    pinToScreen(this.skipBtn).setDepth(DEPTH.ui + 3);
  }

  private endFinale(momos: Phaser.GameObjects.Image): void {
    const ctx = this.ctx;
    momos.destroy();
    this.skipBtn?.destroy();
    this.skipBtn = null;
    if (this.skipped) {
      ctx.landscape.setSkyOpen(1);
      showMoonbow(ctx.scene, { hold: true });
      this.kuhiro?.setVisible(false);
      this.glow?.set(0, 500);
      if (!S().journal.moments.moonbow) triggerMoment('moonbow');
    }
    completeFinale();
    ctx.hero.setScaleGlow(false);
    ctx.light.rainScale = 1;
    ctx.focus(null);
    ctx.activity = 'idle';
    ctx.hero.setPose('stand');
    ctx.setBusy(false);
    this.running = false;
    bus.emit('toast', { text: MYSTERY.toastJournal });
    bus.emit('hud:bounce', { target: 'journal' });
    save('finale');
  }

  /** Screenshot: jump straight to the risen, freckles-lit, sky-open moment. */
  async shotFinale(): Promise<void> {
    const ctx = this.ctx;
    const sc = ctx.scene;
    ctx.hero.x = CAMP.fishFrom.dock.x - 40;
    ctx.hero.y = CAMP.dock.y;
    ctx.hero.face(1);
    ctx.hero.setPose('sit');
    ctx.focus(CAMP.dock.x1 + 40);
    ctx.light.rainScale = 0.4;
    this.glow = new UnderGlow(sc, CAMP.dock.x1 + 60, CAMP.waterY);
    this.glow.set(0.5, 10);
    const k = this.ensureKuhiro();
    await k.rise(10);
    void k.lightFreckles();
    ctx.landscape.setSkyOpen(1);
    showMoonbow(sc, { hold: true });
    const g = ctx.landscape.guransAnchor();
    void highlightGurans(sc, g.x * (g.x <= 1 ? layout().w : 1), g.y);
  }
}

let current: Guardian | null = null;
registerCampController((ctx) => {
  current = new Guardian(ctx);
  return current;
});
registerShot('finale', () => void current?.shotFinale());
