/**
 * Title (spec section 7): logo, "a tiny camping trip", Begin your trip,
 * Continue (only with a save), Settings; footer "Best with sound on · v0.1".
 * The background is the live camp at dusk: fire, fireflies, Tuki dozing.
 */
import Phaser from 'phaser';
import { directLaunch } from '@/core/debug';
import { DEPTH, SCENES } from '@/config';
import { anyParam, markReady } from '@/core/debug';
import { continueTrip, openOverlay, startTrip } from '@/core/flow';
import { layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { hasSave, load } from '@/core/state';
import { art } from '@/art/kit';
import { Hero } from '@/chars/Hero';
import { CAMP } from '@/data/camp';
import { STR } from '@/data/dialogue';
import { WORLD } from '@/data/world';
import { lightAt } from '@/fx/lighting';
import { Fireflies } from '@/fx/particles';
import { setAmbience, setMusicMood } from '@/audio/engine';
import { Landscape } from '@/world/Landscape';
import { CampfireProp, TentProp } from '@/world/props';
import { Button, Dialog, txt } from '@/ui';
import { P, hexToInt, mix } from '@/palette';

const TITLE_P = 0.93;

export default class Title extends Phaser.Scene {
  private landscape!: Landscape;
  private fire!: CampfireProp;
  private tent!: TentProp;
  private hero!: Hero;
  private flies!: Fireflies;

  constructor() {
    super({ key: SCENES.title });
  }

  create(): void {
    applyDebugOnce();
    setupCamera(this);
    const l = layout();
    const light = lightAt(TITLE_P);

    this.landscape = new Landscape(this, { worldW: CAMP.worldW, variant: 'title' });
    this.fire = new CampfireProp(this, CAMP.fire.x, CAMP.groundY);
    this.tent = new TentProp(this, CAMP.tentSpots[1].x, CAMP.groundY);
    this.tent.setState('pitched', 'dome_tent');
    this.hero = new Hero(this, CAMP.fire.x - 72, CAMP.groundY);
    this.hero.setDepth(DEPTH.actors);
    this.hero.face(1);
    this.hero.setPose('sit');
    this.hero.setExpression('sleepy');
    this.flies = new Fireflies(this, { x0: CAMP.fire.x - 700, x1: CAMP.fire.x + 900, y0: 360, y1: 560 }, 26, DEPTH.fx + 2);
    this.flies.setAmount(0.8, true);
    for (const t of [this.landscape, this.fire, this.tent]) t.setLight(light as never);
    this.landscape.applyLight(light);
    this.fire.setLight(light);
    this.tent.setLight(light);
    this.tent.setDoorGlow(0.8);
    this.hero.setLightTint(hexToInt(mix(light.hex.actor, P.glow, 0.35)));
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.vignette).setDisplaySize(l.w, l.h).setAlpha(light.vignette + 0.08);

    // Park the camera so the fire sits a little right of centre, below the logo.
    const cam = this.cameras.main;
    cam.scrollX = Phaser.Math.Clamp(CAMP.fire.x - l.w * 0.56, 0, CAMP.worldW - l.w);

    // Logo + subtitle.
    const logo = art(this, l.w / 2, l.safe.top + 150, 'logo_main').setScrollFactor(0).setDepth(DEPTH.ui);
    const k = Math.min(1, (l.w - 80) / 760, 0.95);
    logo.setScale(logo.scaleX * k);
    const sub = txt(this, l.w / 2, l.safe.top + 150 + 150 * k + 14, WORLD.subtitle, 'handBig', { color: P.cream, size: 38, stroke: mix(P.ink, '#2F3558', 0.4), strokeWidth: 6 })
      .setScrollFactor(0)
      .setDepth(DEPTH.ui);
    if (!reduceMotion()) this.tweens.add({ targets: logo, y: logo.y - 6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Buttons.
    const save = hasSave() ? load() : null;
    const by = l.h - l.safe.bottom - 78;
    const btns: Button[] = [];
    const begin = new Button(this, 0, 0, { label: STR.title.begin, variant: 'primary', w: 300, onTap: () => this.begin(!!save) });
    btns.push(begin);
    if (save) btns.unshift(new Button(this, 0, 0, { label: STR.title.continue, variant: 'warm', w: 300, onTap: () => continueTrip() }));
    const settings = new Button(this, 0, 0, { label: STR.title.settings, variant: 'secondary', w: 220, onTap: () => openOverlay(SCENES.settings) });
    btns.push(settings);
    const gap = 18;
    const widths = btns.map((b) => b.bw);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (btns.length - 1);
    let x = l.w / 2 - total / 2;
    btns.forEach((b, i) => {
      b.setPosition(x + widths[i] / 2, by);
      b.setScrollFactor(0).setDepth(DEPTH.ui);
      x += widths[i] + gap;
    });
    const footer = txt(this, l.w / 2, l.h - l.safe.bottom - 22, STR.title.footer, 'small', { color: mix(P.cream, P.lavender, 0.3), size: 18 })
      .setScrollFactor(0)
      .setDepth(DEPTH.ui);
    // `?shot=social` (npm run icons): the share card is the scene without its controls.
    if (anyParam('shot') === 'social') {
      btns.forEach((b) => b.setVisible(false));
      footer.setVisible(false);
    }
    void sub;

    setAmbience({ scene: 'title', p: TITLE_P, raining: false, inTent: false, nearFire: 0.8, nearWater: 0.2 });
    setMusicMood('night');
    if (!directLaunch()) cam.fadeIn(reduceMotion() ? 200 : 900, 47, 53, 88);
    markReady(this, 1200);
  }

  private begin(hasExisting: boolean): void {
    if (!hasExisting) {
      startTrip();
      return;
    }
    Dialog.open(this, {
      title: STR.settings.newTripConfirm,
      confirm: STR.settings.startOver,
      cancel: STR.settings.keepCamping,
      depth: DEPTH.overlay,
      onConfirm: () => startTrip(),
    });
  }

  override update(time: number, delta: number): void {
    this.landscape.update(time, delta);
    this.fire.update(time, delta);
    this.tent.update(time, delta);
    this.hero.tick(time, delta);
    this.flies.update(time, delta);
  }
}
