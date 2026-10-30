/**
 * Intro (spec section 7): storybook pages, tap to turn, "Skip" top-right.
 * "Tuki has been saving up for a little camping trip." / "Seven days. A quiet
 * place by the water. Nothing to do but be cozy." / "First, a stop at the shop..."
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { markReady } from '@/core/debug';
import { go } from '@/core/flow';
import { layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { S, save } from '@/core/state';
import { art } from '@/art/kit';
import { Hero } from '@/chars/Hero';
import { STR } from '@/data/dialogue';
import { lightAt } from '@/fx/lighting';
import { sparkleBurst } from '@/fx/particles';
import { playSfx, setAmbience, setMusicMood } from '@/audio/engine';
import { Landscape } from '@/world/Landscape';
import { Button, Card, txtObj } from '@/ui';
import { A, P, hexToInt, mix } from '@/palette';

export default class Intro extends Phaser.Scene {
  private page = 0;
  private book: Phaser.GameObjects.Container | null = null;
  private turning = false;
  private extras: { tick?: (t: number, d: number) => void; destroy: () => void }[] = [];

  constructor() {
    super({ key: SCENES.intro });
  }

  create(): void {
    applyDebugOnce();
    setupCamera(this);
    this.page = 0;
    this.turning = false;
    const l = layout();
    // Soft dawn wash behind the book.
    const bg = this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(l.w, l.h);
    const li = lightAt(0.04);
    bg.setTint(li.skyTop, li.skyTop, li.horizon, li.horizon);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(l.w, l.h).setAlpha(0.2);
    const skip = new Button(this, l.w - l.safe.right - 90, l.safe.top + 50, { label: STR.skip, variant: 'quiet', w: 140, onTap: () => this.finish() });
    skip.setDepth(DEPTH.ui);
    const zone = this.add.zone(0, 0, l.w, l.h).setOrigin(0).setInteractive().setDepth(-1);
    zone.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
    this.showPage(0, false);
    setAmbience({ scene: 'intro', p: 0.05, raining: false, inTent: false, nearFire: 0, nearWater: 0 });
    setMusicMood('day');
    this.cameras.main.fadeIn(reduceMotion() ? 200 : 600, 47, 53, 88);
    markReady(this, 900);
  }

  private next(): void {
    if (this.turning) return;
    if (this.page >= STR.intro.length - 1) {
      this.finish();
      return;
    }
    this.showPage(this.page + 1, true);
  }

  private showPage(i: number, animate: boolean): void {
    this.page = i;
    const l = layout();
    const W = Math.min(820, l.w - 120);
    const H = Math.min(560, l.h - 120);
    const old = this.book;
    const oldExtras = this.extras;
    this.extras = [];
    const c = this.add.container(l.w / 2 + (animate ? l.w : 0), l.h / 2 + 10);
    const card = new Card(this, 0, 0, { w: W, h: H, tint: 'cream' });
    c.add(card);
    // Illustration window.
    const iw = W - 80;
    const ih = H - 190;
    const ill = this.add.container(0, -H / 2 + 40 + ih / 2);
    const frame = this.add.graphics();
    frame.fillStyle(hexToInt(mix(A.lokta, P.cream, 0.4)), 1).fillRoundedRect(-iw / 2, -ih / 2, iw, ih, 18);
    ill.add(frame);
    this.illustrate(i, ill, iw, ih);
    const mask = this.make.graphics({}, false);
    c.add(ill);
    const border = this.add.graphics();
    border.lineStyle(3, hexToInt(mix(A['cream-line'], P.bark, 0.3)), 1).strokeRoundedRect(-iw / 2, -ih / 2 + (-H / 2 + 40 + ih / 2), iw, ih, 18);
    c.add(border);
    const text = txtObj(this, 0, H / 2 - 74, STR.intro[i], 'hand', { size: 34, align: 'center', wrap: W - 90 });
    c.add(text);
    // Page dots.
    for (let k = 0; k < STR.intro.length; k++) {
      const d = this.add.image((k - (STR.intro.length - 1) / 2) * 22, H / 2 - 24, 'dot').setScale(k === i ? 0.9 : 0.6).setTint(hexToInt(k === i ? A['gurans-deep'] : A['cream-line']));
      c.add(d);
    }
    // Mask the illustration to its rounded window (in world space each frame).
    const updateMask = () => {
      mask.clear();
      mask.fillStyle(0xffffff).fillRoundedRect(c.x - iw / 2, c.y - H / 2 + 40, iw, ih, 18);
    };
    updateMask();
    ill.setMask(mask.createGeometryMask());
    this.extras.push({ tick: () => updateMask(), destroy: () => mask.destroy() });
    this.book = c;
    if (animate) {
      this.turning = true;
      playSfx('page');
      this.tweens.add({
        targets: c,
        x: l.w / 2,
        duration: reduceMotion() ? 200 : 520,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.turning = false;
        },
      });
      if (old) {
        this.tweens.add({
          targets: old,
          x: old.x - l.w,
          angle: reduceMotion() ? 0 : -6,
          duration: reduceMotion() ? 200 : 520,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            old.destroy();
            oldExtras.forEach((e) => e.destroy());
          },
        });
      }
    }
  }

  private illustrate(i: number, ill: Phaser.GameObjects.Container, iw: number, ih: number): void {
    if (i === 0) {
      // Tuki saving coins into a little clay gullak (piggy tin).
      const sky = this.add.image(-iw / 2, -ih / 2, 'px').setOrigin(0).setDisplaySize(iw, ih);
      const li = lightAt(0.3);
      sky.setTint(hexToInt(mix(li.hex.skyTop, P.cream, 0.4)), hexToInt(mix(li.hex.skyTop, P.cream, 0.4)), hexToInt(mix(li.hex.horizon, P.cream, 0.3)), hexToInt(mix(li.hex.horizon, P.cream, 0.3)));
      ill.add(sky);
      const floor = this.add.graphics();
      floor.fillStyle(hexToInt(mix(A['shop-wood'], P.cream, 0.3)), 1).fillRect(-iw / 2, ih / 2 - 70, iw, 70);
      ill.add(floor);
      const hero = new Hero(this, -40, ih / 2 - 40);
      hero.setPose('hold');
      hero.setHeldItem(this.textures.exists('item_coin') ? 'item_coin' : 'icon.coin');
      hero.setExpression('happy');
      this.children.remove(hero);
      ill.add(hero);
      const tin = art(this, 90, ih / 2 - 64, this.textures.exists('item_coin') ? 'item_coin' : 'icon.coin');
      this.children.remove(tin);
      tin.setScale(tin.scaleX * 1.6);
      ill.add(tin);
      this.extras.push({ tick: (t, d) => hero.tick(t, d), destroy: () => hero.destroy() });
      this.time.addEvent({ delay: 900, repeat: 3, callback: () => sparkleBurst(this, ill.parentContainer ? ill.parentContainer.x + 90 : 0, ill.parentContainer ? ill.parentContainer.y - 20 : 0, { count: 6, depth: DEPTH.ui }) });
    } else {
      // A landscape thumbnail: the lake at dawn (page 2) or the path to the shop (page 3).
      const holder = this.add.container(0, 0);
      const land = new Landscape(this, { container: holder });
      const p = i === 1 ? 0.05 : 0.3;
      land.applyLight(lightAt(p));
      const k = Math.max(iw / 1300, ih / 720);
      holder.setScale(k);
      holder.x = i === 1 ? -iw / 2 - 1500 * k : -iw / 2 - 0 * k;
      holder.y = -ih / 2 - (720 * k - ih) * 0.6;
      ill.add(holder);
      this.extras.push({ tick: (t, d) => land.update(t, d), destroy: () => land.destroy() });
      if (i === 2) {
        const hero = new Hero(this, 0, 0);
        this.children.remove(hero);
        holder.add(hero);
        hero.setPosition(420, 585);
        hero.face(-1);
        hero.walkTo(260);
        this.extras.push({ tick: (t, d) => hero.tick(t, d), destroy: () => hero.destroy() });
      }
    }
  }

  override update(time: number, delta: number): void {
    for (const e of this.extras) e.tick?.(time, delta);
  }

  private finish(): void {
    S().flags.introSeen = true;
    save('intro');
    go(SCENES.shop);
  }
}
