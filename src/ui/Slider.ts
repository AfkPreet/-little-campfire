/**
 * Slider 0..1 (settings: Music, Sounds, Ambience). A sunken paper track, a
 * butter fill and a chunky cream knob. Drag anywhere on the track or tap to
 * jump; the hit area is a full MIN_TOUCH tall.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { bus } from '@/core/bus';
import { reduceMotion } from '@/core/settings';
import { EASE, squash } from '@/fx/juice';
import { artObj } from '@/art/kit';
import { KNOB_D, SLICES, UI_INK, iconObj, panel, resizePanel, type Panel } from '@/art/ui';
import { TEXT_NUDGE, localPoint } from './Button';
import { txtObj } from './text';

export interface SliderOpts {
  label?: string;
  /** Optional icon before the label (e.g. 'icon.music', 'icon.speaker'). */
  icon?: string;
  /** Initial value 0..1. */
  value?: number;
  /** Track width in logical px (default 300). */
  width?: number;
  /** Fires continuously while dragging. */
  onChange?: (v: number) => void;
  /** Fires once when the finger lifts. */
  onCommit?: (v: number) => void;
}

const TRACK_H = 18;

export class Slider extends Phaser.GameObjects.Container {
  private v: number;
  private tw: number;
  private o: SliderOpts;
  private fill: Panel;
  private knob: Phaser.GameObjects.Container;
  private dragging = false;
  private pointerId = -1;
  private lastTick = 0;
  private proxy = { s: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, opts: SliderOpts) {
    super(scene, x, y);
    this.o = opts;
    this.v = Phaser.Math.Clamp(opts.value ?? 0.5, 0, 1);
    this.tw = opts.width ?? 300;
    const tw = this.tw;

    if (opts.label) {
      let lx = -tw / 2 - 2;
      if (opts.icon) {
        this.add(iconObj(scene, lx + 15, -36, opts.icon, 30));
        lx += 36;
      }
      this.add(txtObj(scene, lx, -36 + TEXT_NUDGE, opts.label, 'label', { color: UI_INK, align: 'left' }));
    }

    this.add(panel(scene, 'ui.track', tw, TRACK_H));
    this.fill = panel(scene, 'ui.trackFill', SLICES.trackFill.l * 2, TRACK_H);
    this.add(this.fill);

    this.knob = new Phaser.GameObjects.Container(scene, 0, 0);
    const k = KNOB_D;
    this.knob.add([
      artObj(scene, 0, 5, 'ui.shadow.knob').setAlpha(0.2),
      artObj(scene, 0, 3, 'ui.knobLip'),
      artObj(scene, 0, 0, 'ui.knob'),
    ]);
    this.knob.add(artObj(scene, 0, 0, 'ui.grip'));
    this.knob.setSize(k, k);
    this.add(this.knob);

    this.setSize(tw + k, Math.max(MIN_TOUCH, k + 16));
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation();
      this.dragging = true;
      this.pointerId = p.id;
      squash(scene, this.knob, 0.6, 1, 1);
      bus.emit('sfx', { id: 'squish', vol: 0.6 });
      this.fromPointer(p, true);
    });
    const move = (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.id === this.pointerId) this.fromPointer(p, false);
    };
    const up = (p: Phaser.Input.Pointer) => {
      if (!this.dragging || p.id !== this.pointerId) return;
      this.dragging = false;
      this.pointerId = -1;
      squash(scene, this.knob, 0.4, 1, 1);
      this.o.onCommit?.(this.v);
    };
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
      scene.input.off('pointerupoutside', up);
    });

    this.layoutValue(false);
    scene.add.existing(this);
  }

  get value(): number {
    return this.v;
  }

  /** Set the value without firing callbacks. */
  setValue(v: number, animate = false): this {
    this.v = Phaser.Math.Clamp(v, 0, 1);
    this.layoutValue(animate);
    return this;
  }

  private fromPointer(p: Phaser.Input.Pointer, tap: boolean): void {
    const lp = localPoint(this, p);
    const v = Phaser.Math.Clamp((lp.x + this.tw / 2) / this.tw, 0, 1);
    if (Math.abs(v - this.v) < 0.0005) return;
    this.v = v;
    this.layoutValue(tap && !reduceMotion());
    this.o.onChange?.(this.v);
    // A soft tick every 10% while dragging (audio may map it or ignore it).
    const step = Math.round(v * 10);
    if (step !== this.lastTick) {
      this.lastTick = step;
      if (!tap) bus.emit('sfx', { id: 'tick', vol: 0.25 });
    }
  }

  private layoutValue(animate: boolean): void {
    this.scene.tweens.killTweensOf(this.proxy);
    if (animate) {
      this.scene.tweens.add({ targets: this.proxy, s: this.v, duration: 200, ease: EASE.out, onUpdate: () => this.apply(this.proxy.s) });
    } else {
      this.proxy.s = this.v;
      this.apply(this.v);
    }
  }

  private apply(v: number): void {
    const tw = this.tw;
    const minFill = SLICES.trackFill.l * 2;
    const fw = Math.max(minFill, v * tw + 8);
    resizePanel(this.fill, fw, TRACK_H);
    this.fill.setVisible(v > 0.01);
    this.fill.x = -tw / 2 + fw / 2;
    this.knob.x = -tw / 2 + v * tw;
  }
}
