/**
 * Day summary card (spec section 7): "Day {n} done", the Contentment bloom
 * (a gurans flower that opens as far as the day's peak), up to 3 highlight
 * lines, then "Sweet dreams...". Tap anywhere (or wait) to continue.
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { layout, setupCamera } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { STR } from '@/data/dialogue';
import { A, P, hexToInt, mix, shade } from '@/palette';
import { pauseClock, type SleepSummary } from '@/systems/day';
import { playSfx } from '@/audio/engine';
import { Card, txtObj, fmt } from '@/ui';
import { markReady } from '@/core/debug';

export default class Summary extends Phaser.Scene {
  private done = false;
  private unpause: (() => void) | null = null;

  constructor() {
    super({ key: SCENES.summary });
  }

  create(data: { summary: SleepSummary; auto?: boolean }): void {
    setupCamera(this);
    this.done = false;
    this.unpause = pauseClock();
    const l = layout();
    const sum = data.summary;
    const scrim = this.add.rectangle(0, 0, l.w, l.h, hexToInt(mix(P.ink, '#2F3558', 0.6)), 0.92).setOrigin(0).setDepth(DEPTH.overlay);
    scrim.setInteractive();
    const W = Math.min(560, l.w - 80);
    const H = Math.min(560, l.h - 80);
    const c = this.add.container(l.w / 2, l.h / 2).setDepth(DEPTH.overlay + 1);
    const card = new Card(this, 0, 0, { w: W, h: H, tint: 'cream' });
    const title = txtObj(this, 0, -H / 2 + 58, fmt(STR.summary.title, { n: sum.day }), 'h1');
    c.add([card, title]);

    // Contentment bloom.
    const bloom = this.add.container(0, -H / 2 + 190);
    const peak = Math.max(0, Math.min(100, sum.log.peak));
    const g = this.add.graphics();
    const open = 0.35 + 0.65 * (peak / 100);
    const petals = 5;
    const petalCol = hexToInt(mix(A.gurans, P.cream, 0.25 - 0.2 * (peak / 100)));
    const line = hexToInt(shade(A.gurans, 0.25));
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const r = 46 * open;
      g.fillStyle(petalCol, 1);
      g.lineStyle(3, line, 1);
      g.fillEllipse(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 1.05, r * 0.86);
      g.strokeEllipse(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 1.05, r * 0.86);
    }
    g.fillStyle(hexToInt(P.butter), 1);
    g.fillCircle(0, 0, 14 * open + 4);
    g.lineStyle(2.5, hexToInt(shade(P.butter, 0.3)), 1);
    g.strokeCircle(0, 0, 14 * open + 4);
    // Normal blend: added onto the cream card the halo clamped to pure white.
    const glow = this.add.image(0, 0, 'glow').setTint(hexToInt(P.glow)).setAlpha(0.3 + 0.4 * (peak / 100)).setScale(0.6 + 0.5 * open);
    bloom.add([glow, g]);
    c.add(bloom);
    bloom.setScale(0.2);
    this.tweens.add({ targets: bloom, scale: 1, duration: reduceMotion() ? 200 : 900, ease: 'Back.easeOut', delay: 200 });
    if (!reduceMotion()) this.tweens.add({ targets: bloom, angle: 8, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Highlights.
    sum.lines.forEach((line2, i) => {
      const t = txtObj(this, 0, -H / 2 + 310 + i * 46, line2, 'body', { size: 26 });
      t.setAlpha(0);
      c.add(t);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 6, duration: 400, delay: 600 + i * 300 });
    });
    const sweet = txtObj(this, 0, H / 2 - 54, STR.summary.sweet, 'handBig', { size: 40 });
    sweet.setAlpha(0);
    c.add(sweet);
    this.tweens.add({ targets: sweet, alpha: 1, duration: 800, delay: 600 + sum.lines.length * 300 + 300 });

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 500 });
    playSfx('chime', { vol: 0.5 });

    const finish = () => {
      if (this.done) return;
      this.done = true;
      this.tweens.add({
        targets: [c, scrim],
        alpha: 0,
        duration: data.auto ? 100 : 600,
        onComplete: () => {
          this.unpause?.();
          bus.emit('overlay:close', { key: SCENES.summary });
          this.scene.stop();
        },
      });
    };
    this.time.delayedCall(data.auto ? 400 : 1800, () => scrim.once('pointerdown', finish));
    this.time.delayedCall(data.auto ? 600 : 9000, finish);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unpause?.());
    markReady(this, 800);
  }
}
