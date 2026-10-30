/**
 * Pill switch with a label (settings: Reduce motion, Large text). State is
 * shown by knob position AND a glyph on the knob (check vs hollow ring), and
 * the track colour, never colour alone. The whole row is the touch target.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { ART_SCALE } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE, squash } from '@/fx/juice';
import { artObj } from '@/art/kit';
import { TOGGLE_H, TOGGLE_W, UI_INK, iconObj } from '@/art/ui';
import { TEXT_NUDGE, pressable } from './Button';
import { txtObj } from './text';

export interface ToggleOpts {
  label: string;
  /** Optional icon before the label. */
  icon?: string;
  value?: boolean;
  /** Row width (default 320). The switch sits at the right end. */
  width?: number;
  onChange?: (v: boolean) => void;
}

export class Toggle extends Phaser.GameObjects.Container {
  private v: boolean;
  private o: ToggleOpts;
  private rw: number;
  private trackOn: Phaser.GameObjects.Image;
  private trackOff: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Container;
  private check: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private sx: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ToggleOpts) {
    super(scene, x, y);
    this.o = opts;
    this.v = !!opts.value;
    this.rw = opts.width ?? 320;
    const rw = this.rw;
    let lx = -rw / 2;
    if (opts.icon) {
      this.add(iconObj(scene, lx + 15, 0, opts.icon, 30));
      lx += 38;
    }
    this.add(txtObj(scene, lx, TEXT_NUDGE, opts.label, 'label', { color: UI_INK, align: 'left' }));

    this.sx = rw / 2 - TOGGLE_W / 2;
    this.trackOff = artObj(scene, this.sx, 0, 'ui.toggle.off');
    this.trackOn = artObj(scene, this.sx, 0, 'ui.toggle.on');
    this.add([this.trackOff, this.trackOn]);

    this.knob = new Phaser.GameObjects.Container(scene, 0, 0);
    this.check = iconObj(scene, 0, 0, 'icon.check', 26);
    this.ring = artObj(scene, 0, 0, 'ui.offRing');
    this.knob.add([
      artObj(scene, 0, 4, 'ui.shadow.knob').setAlpha(0.2).setScale(0.86 / ART_SCALE),
      artObj(scene, 0, 2.5, 'ui.knobLip').setScale(0.86 / ART_SCALE),
      artObj(scene, 0, 0, 'ui.knob').setScale(0.86 / ART_SCALE),
      this.ring,
      this.check,
    ]);
    this.add(this.knob);

    this.setSize(rw + 8, Math.max(MIN_TOUCH, TOGGLE_H + 12));
    this.setInteractive({ useHandCursor: true });
    pressable(scene, this, {
      onTap: () => this.setValue(!this.v, true, true),
      juiceTarget: this.knob,
      squashAmount: 0.7,
    });
    this.apply(false);
    scene.add.existing(this);
  }

  get value(): boolean {
    return this.v;
  }

  setValue(v: boolean, animate = false, fire = false): this {
    const changed = v !== this.v;
    this.v = v;
    this.apply(animate);
    if (changed && fire) this.o.onChange?.(v);
    return this;
  }

  private knobX(): number {
    const travel = TOGGLE_W / 2 - TOGGLE_H / 2;
    return this.sx + (this.v ? travel : -travel);
  }

  private apply(animate: boolean): void {
    const x = this.knobX();
    const rm = reduceMotion();
    const dur = animate ? (rm ? 120 : 340) : 0;
    this.scene.tweens.killTweensOf([this.trackOn, this.check, this.ring]);
    if (dur) {
      this.scene.tweens.add({ targets: this.knob, x, duration: dur, ease: rm ? EASE.out : 'Back.easeOut', easeParams: [1.6] });
      this.scene.tweens.add({ targets: this.trackOn, alpha: this.v ? 1 : 0, duration: dur * 0.7 });
      this.scene.tweens.add({ targets: this.check, alpha: this.v ? 1 : 0, duration: dur * 0.6 });
      this.scene.tweens.add({ targets: this.ring, alpha: this.v ? 0 : 1, duration: dur * 0.6 });
      if (!rm) squash(this.scene, this.knob, 0.7, 1, 1);
    } else {
      this.knob.x = x;
      this.trackOn.setAlpha(this.v ? 1 : 0);
      this.check.setAlpha(this.v ? 1 : 0);
      this.ring.setAlpha(this.v ? 0 : 1);
    }
  }
}
