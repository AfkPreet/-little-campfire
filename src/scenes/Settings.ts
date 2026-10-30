/**
 * Settings overlay (spec section 7): Music / Sounds / Ambience sliders,
 * Reduce motion and Large text toggles, Start a new trip and Erase everything
 * (each with its confirm).
 */
import Phaser from 'phaser';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { layout, setupCamera } from '@/core/layout';
import { settingsGet, settingsSet } from '@/core/settings';
import { eraseSave } from '@/core/state';
import { startTrip } from '@/core/flow';
import { STR } from '@/data/dialogue';
import { P, hexToInt } from '@/palette';
import { pauseClock } from '@/systems/day';
import { Button, Card, Dialog, IconButton, Slider, Toggle } from '@/ui';
import { markReady } from '@/core/debug';

export default class Settings extends Phaser.Scene {
  private unpause: (() => void) | null = null;

  constructor() {
    super({ key: SCENES.settings });
  }

  create(): void {
    setupCamera(this);
    this.unpause = pauseClock();
    bus.emit('overlay:open', { key: SCENES.settings });
    const l = layout();
    const st = settingsGet();
    const scrim = this.add.rectangle(0, 0, l.w, l.h, hexToInt(P.ink), 0.34).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    scrim.on('pointerdown', () => this.close());
    const W = Math.min(620, l.w - 60);
    const H = Math.min(590, l.h - 30);
    const c = this.add.container(l.w / 2, l.h / 2).setDepth(DEPTH.overlay + 1);
    const card = new Card(this, 0, 0, { w: W, h: H, title: STR.settings.title });
    const blocker = this.add.zone(0, 0, W, H).setInteractive();
    c.add([blocker, card]);
    c.add(new IconButton(this, W / 2 - 36, -H / 2 + 36, { icon: 'icon.close', size: 56, variant: 'cream', onTap: () => this.close() }));

    const sw = Math.min(380, W - 120);
    let y = -H / 2 + 120;
    const sliders: [string, string, keyof typeof st][] = [
      [STR.settings.music, 'icon.music', 'music'],
      [STR.settings.sounds, 'icon.speaker', 'sounds'],
      [STR.settings.ambience, 'icon.speaker', 'ambience'],
    ];
    for (const [label, icon, key] of sliders) {
      c.add(
        new Slider(this, 0, y, {
          label,
          icon,
          width: sw,
          value: st[key] as number,
          onChange: (v) => settingsSet({ [key]: v }),
        }),
      );
      y += 84;
    }
    c.add(new Toggle(this, 0, y, { label: STR.settings.reduceMotion, width: sw + 40, value: st.reduceMotion, onChange: (v) => settingsSet({ reduceMotion: v }) }));
    y += 66;
    c.add(new Toggle(this, 0, y, { label: STR.settings.largeText, width: sw + 40, value: st.largeText, onChange: (v) => settingsSet({ largeText: v }) }));
    y += 84;
    c.add(
      new Button(this, -W / 4 + 10, y, {
        label: STR.settings.newTrip,
        variant: 'secondary',
        textKind: 'label',
        w: W / 2 - 40,
        onTap: () =>
          Dialog.open(this, {
            title: STR.settings.newTripConfirm,
            confirm: STR.settings.startOver,
            cancel: STR.settings.keepCamping,
            depth: DEPTH.overlay + 10,
            onConfirm: () => {
              this.close();
              startTrip();
            },
          }),
      }),
    );
    c.add(
      new Button(this, W / 4 - 10, y, {
        label: STR.settings.erase,
        variant: 'lavender',
        textKind: 'label',
        w: W / 2 - 40,
        onTap: () =>
          Dialog.open(this, {
            title: STR.settings.erase,
            body: STR.settings.eraseConfirm,
            confirm: STR.settings.eraseYes,
            cancel: STR.settings.cancel,
            depth: DEPTH.overlay + 10,
            onConfirm: () => {
              eraseSave();
              try {
                localStorage.clear();
              } catch {
                /* ignore */
              }
              location.reload();
            },
          }),
      }),
    );
    c.setScale(0.92).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
    this.input.keyboard?.once('keydown-ESC', () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unpause?.());
    markReady(this, 500);
  }

  private close(): void {
    this.unpause?.();
    this.unpause = null;
    bus.emit('overlay:close', { key: SCENES.settings });
    this.scene.stop();
  }
}
