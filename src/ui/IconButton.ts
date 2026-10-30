/**
 * Round icon button (backpack, journal, settings, close, arrows...). A paper
 * disc on a lip with a soft ink shadow; squishes like every other button.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { ART_SCALE } from '@/core/layout';
import { artObj } from '@/art/kit';
import { ROUND_D, UI_INK_SOFT, iconObj, type FaceTint } from '@/art/ui';
import { pressable, setHitSize } from './Button';
import { txtObj } from './text';

export interface IconButtonOpts {
  /** Icon texture key, e.g. 'icon.backpack'. */
  icon: string;
  /** Overall diameter in logical px (default 64, min MIN_TOUCH). */
  size?: number;
  /** Face colour (default cream). */
  variant?: FaceTint;
  /** Icon size as a fraction of the button (default 0.62). */
  iconScale?: number;
  /** Optional small caption under the button. */
  caption?: string;
  disabled?: boolean;
  onTap?: () => void;
  onDisabledTap?: () => void;
}

const LIP = 4;

export class IconButton extends Phaser.GameObjects.Container {
  readonly size: number;
  private o: IconButtonOpts;
  private face!: Phaser.GameObjects.Image;
  private lip!: Phaser.GameObjects.Image;
  private icon!: Phaser.GameObjects.Image;
  private faceY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: IconButtonOpts) {
    super(scene, x, y);
    this.o = { ...opts };
    this.size = Math.max(MIN_TOUCH, opts.size ?? 64);
    this.build();
    pressable(scene, this, {
      onTap: () => this.o.onTap?.(),
      isDisabled: () => !!this.o.disabled,
      onDisabledTap: () => this.o.onDisabledTap?.(),
      onPress: (down) => {
        const dy = down ? LIP - 1 : 0;
        this.face.y = this.faceY + dy;
        this.icon.y = this.faceY + dy;
      },
    });
    scene.add.existing(this);
  }

  get disabled(): boolean {
    return !!this.o.disabled;
  }

  setDisabled(d: boolean): this {
    if (!!this.o.disabled === d) return this;
    this.o.disabled = d;
    this.build();
    return this;
  }

  setIcon(key: string): this {
    this.o.icon = key;
    this.build();
    return this;
  }

  private build(): void {
    const scene = this.scene;
    this.removeAll(true);
    const d = this.size - LIP;
    const k = d / ROUND_D;
    const tint: FaceTint = this.o.disabled ? 'off' : (this.o.variant ?? 'cream');
    this.faceY = -LIP / 2;
    const shadow = artObj(scene, 0, this.faceY + LIP + 3, 'ui.shadow.round').setScale(k / ART_SCALE).setAlpha(this.o.disabled ? 0.1 : 0.2);
    this.lip = artObj(scene, 0, this.faceY + LIP, `ui.roundLip.${tint}`).setScale(k / ART_SCALE);
    this.face = artObj(scene, 0, this.faceY, `ui.round.${tint}`).setScale(k / ART_SCALE);
    this.icon = iconObj(scene, 0, this.faceY, this.o.icon, this.size * (this.o.iconScale ?? 0.62));
    if (this.o.disabled) this.icon.setAlpha(0.45);
    this.add([shadow, this.lip, this.face, this.icon]);
    let hitH = this.size + 6;
    if (this.o.caption) {
      const cap = txtObj(scene, 0, this.size / 2 + 14, this.o.caption, 'small', { color: UI_INK_SOFT });
      this.add(cap);
      hitH += 24;
    }
    setHitSize(this, this.size + 6, hitH);
    if (this.o.caption && this.input) {
      // Shift the hit area down so it covers the caption too.
      (this.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 12, this.width, hitH);
    }
  }
}
