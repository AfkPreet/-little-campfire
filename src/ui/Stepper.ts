/**
 * Quantity stepper (shop Sell tab): [-] value [+] with min/max. At a bound
 * the matching button turns soft-disabled and answers taps with a wobble and
 * a gentle "nope".
 */
import Phaser from 'phaser';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';
import { UI_INK, panel } from '@/art/ui';
import { TEXT_NUDGE } from './Button';
import { IconButton } from './IconButton';
import { txtObj } from './text';

export interface StepperOpts {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (v: number) => void;
  /** Width of the value well (default 76). */
  valueW?: number;
  /** Button diameter (default 56). */
  size?: number;
  /** Format the value for display (default String). */
  format?: (v: number) => string;
}

export class Stepper extends Phaser.GameObjects.Container {
  private v: number;
  private o: StepperOpts;
  private minus: IconButton;
  private plus: IconButton;
  private text: Phaser.GameObjects.Text;
  /** Total width. */
  readonly sw: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: StepperOpts) {
    super(scene, x, y);
    this.o = opts;
    const min = opts.min ?? 0;
    const max = opts.max ?? 99;
    this.v = Phaser.Math.Clamp(opts.value ?? min, min, max);
    const size = opts.size ?? 56;
    const vw = opts.valueW ?? 76;
    const gap = 10;
    this.sw = size * 2 + vw + gap * 2;
    const bx = vw / 2 + gap + size / 2;
    this.add(panel(scene, 'ui.well', vw, size - 4, 0, 0));
    this.text = txtObj(scene, 0, TEXT_NUDGE, '', 'h2', { color: UI_INK });
    this.add(this.text);
    this.minus = new IconButton(scene, -bx, 0, { icon: 'icon.minus', size, iconScale: 0.56, onTap: () => this.bump(-1) });
    this.plus = new IconButton(scene, bx, 0, { icon: 'icon.plus', size, iconScale: 0.56, onTap: () => this.bump(1) });
    this.add([this.minus, this.plus]);
    this.refresh(false);
    scene.add.existing(this);
  }

  get value(): number {
    return this.v;
  }

  setValue(v: number, fire = false): this {
    const nv = Phaser.Math.Clamp(Math.round(v), this.o.min ?? 0, this.o.max ?? 99);
    const changed = nv !== this.v;
    this.v = nv;
    this.refresh(changed);
    if (changed && fire) this.o.onChange?.(nv);
    return this;
  }

  /** Change the bounds (e.g. when the owned count changes). */
  setRange(min: number, max: number): this {
    this.o.min = min;
    this.o.max = max;
    return this.setValue(this.v);
  }

  private bump(dir: 1 | -1): void {
    this.setValue(this.v + dir * (this.o.step ?? 1), true);
  }

  private refresh(pop: boolean): void {
    const min = this.o.min ?? 0;
    const max = this.o.max ?? 99;
    this.text.setText((this.o.format ?? String)(this.v));
    this.minus.setDisabled(this.v <= min);
    this.plus.setDisabled(this.v >= max);
    if (pop && !reduceMotion()) {
      this.scene.tweens.killTweensOf(this.text);
      this.text.setScale(1.25);
      this.scene.tweens.add({ targets: this.text, scale: 1, duration: 280, ease: EASE.pop, easeParams: [2.5] });
    }
  }
}
