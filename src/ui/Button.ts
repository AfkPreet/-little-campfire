/**
 * Chunky paper button (spec section 8 "UI kit"): squishes on press
 * (0.85 / 1.15 then settles), the face sinks onto its lip, touch and mouse
 * behave identically, and the hit area is never smaller than MIN_TOUCH.
 * Disabled buttons give a gentle wobble and a soft "nope" instead of a buzzer.
 *
 * Also exports `pressable()`, the shared press behaviour every tappable UI
 * component uses.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { bus } from '@/core/bus';
import { reduceMotion } from '@/core/settings';
import { squash, wobble } from '@/fx/juice';
import {
  UI_INK,
  UI_INK_FAINT,
  UI_INK_SOFT,
  iconObj,
  panel,
  shadowPanel,
  type FaceTint,
  type Panel,
} from '@/art/ui';
import { txtObj, type TextKind } from './text';

/** Baloo 2 sits a hair high in its line box; nudge labels down by this much. */
export const TEXT_NUDGE = 1.5;

// ---------------------------------------------------------------------------
// Shared press behaviour
// ---------------------------------------------------------------------------

export interface PressOpts {
  onTap?: () => void;
  /** Return true to treat the target as disabled (wobble + "nope", no tap). */
  isDisabled?: () => boolean;
  onDisabledTap?: () => void;
  /** Visual press state (sink a face, show a highlight...). */
  onPress?: (down: boolean) => void;
  /** Squash strength on release (1 = spec 0.85 / 1.15). */
  squashAmount?: number;
  /** Sound id emitted on press; null for silence. */
  sfx?: string | null;
  /** Scale target for the squash/wobble (defaults to the target itself). */
  juiceTarget?: Phaser.GameObjects.Container;
}

type EventData = Phaser.Types.Input.EventData;

/**
 * Make an interactive Container behave like a button. The target must already
 * have a size and be interactive (setSize + setInteractive).
 */
export function pressable(scene: Phaser.Scene, target: Phaser.GameObjects.Container, o: PressOpts): void {
  const jt = o.juiceTarget ?? target;
  let pressed = false;
  let pointerId = -1;
  let wobbling = false;

  const baseScale = (): [number, number] => {
    const bx = jt.getData('baseScaleX') as number | undefined;
    const by = jt.getData('baseScaleY') as number | undefined;
    if (bx !== undefined && by !== undefined) return [bx, by];
    jt.setData('baseScaleX', jt.scaleX);
    jt.setData('baseScaleY', jt.scaleY);
    return [jt.scaleX, jt.scaleY];
  };

  const nope = () => {
    bus.emit('sfx', { id: 'nope' });
    if (!wobbling) {
      wobbling = true;
      jt.setData('wobbleX', jt.x);
      wobble(scene, jt);
      scene.time.delayedCall(460, () => (wobbling = false));
    }
    o.onDisabledTap?.();
  };

  const cancel = () => {
    if (!pressed) return;
    pressed = false;
    pointerId = -1;
    o.onPress?.(false);
    const [bx, by] = baseScale();
    scene.tweens.killTweensOf(jt);
    scene.tweens.add({ targets: jt, scaleX: bx, scaleY: by, duration: 160, ease: 'Sine.easeOut' });
  };

  target.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: EventData) => {
    ev?.stopPropagation();
    if (pressed) return;
    if (o.isDisabled?.()) {
      nope();
      return;
    }
    pressed = true;
    pointerId = p.id;
    const [bx, by] = baseScale();
    if (!wobbling) {
      scene.tweens.killTweensOf(jt);
      jt.setScale(jt.scaleX, jt.scaleY);
    }
    if (!reduceMotion()) {
      scene.tweens.add({ targets: jt, scaleX: bx * 1.05, scaleY: by * 0.93, duration: 70, ease: 'Sine.easeOut' });
    }
    o.onPress?.(true);
    if (o.sfx !== null) bus.emit('sfx', { id: o.sfx ?? 'squish' });
  });

  target.on('pointerup', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: EventData) => {
    ev?.stopPropagation();
    if (!pressed || p.id !== pointerId) return;
    pressed = false;
    pointerId = -1;
    o.onPress?.(false);
    const [bx, by] = baseScale();
    squash(scene, jt, o.squashAmount ?? 1, bx, by);
    o.onTap?.();
  });

  target.on('pointerout', (p: Phaser.Input.Pointer) => {
    if (pressed && p.id === pointerId) cancel();
  });

  const onSceneUp = (p: Phaser.Input.Pointer) => {
    if (pressed && p.id === pointerId) cancel();
  };
  scene.input.on('pointerup', onSceneUp);
  scene.input.on('pointerupoutside', onSceneUp);
  target.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off('pointerup', onSceneUp);
    scene.input.off('pointerupoutside', onSceneUp);
    scene.tweens.killTweensOf(jt);
  });
}

/** Give a container a centred hit area of at least MIN_TOUCH on each side. */
export function setHitSize(c: Phaser.GameObjects.Container, w: number, h: number): void {
  const hw = Math.max(MIN_TOUCH, w);
  const hh = Math.max(MIN_TOUCH, h);
  c.setSize(hw, hh);
  if (c.input) {
    (c.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, hw, hh);
  } else {
    c.setInteractive({ useHandCursor: true });
  }
}

/** A pointer's position in a container's local space (handles nesting, zoom, scroll factor). */
export function localPoint(c: Phaser.GameObjects.Container, p: Phaser.Input.Pointer): Phaser.Math.Vector2 {
  const cam = c.scene.cameras.main;
  const wp = cam.getWorldPoint(p.x, p.y);
  // Objects with scrollFactor < 1 are drawn offset by the camera scroll.
  let sfx = c.scrollFactorX;
  let sfy = c.scrollFactorY;
  let parent = c.parentContainer;
  while (parent) {
    sfx = parent.scrollFactorX;
    sfy = parent.scrollFactorY;
    parent = parent.parentContainer;
  }
  const wx = wp.x - cam.scrollX * (1 - sfx);
  const wy = wp.y - cam.scrollY * (1 - sfy);
  const m = c.getWorldTransformMatrix();
  return m.applyInverse(wx, wy, new Phaser.Math.Vector2());
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'warm' | 'secondary' | 'sage' | 'lavender' | 'quiet';

export interface ButtonOpts {
  label: string;
  /** Optional icon texture key (e.g. 'icon.coin'). */
  icon?: string;
  iconSide?: 'left' | 'right';
  /** Icon display size in logical px (default 30). */
  iconSize?: number;
  /** primary = butter, warm = peach, secondary = cream, quiet = text-like. */
  variant?: ButtonVariant;
  /** Fixed width; otherwise sized to the label. */
  w?: number;
  /** Total height including the lip (default 64, never below MIN_TOUCH). */
  h?: number;
  minW?: number;
  disabled?: boolean;
  onTap?: () => void;
  /** Called when tapped while disabled (after the wobble + "nope"). */
  onDisabledTap?: () => void;
  textKind?: TextKind;
}

const VARIANT_FACE: Record<Exclude<ButtonVariant, 'quiet'>, FaceTint> = {
  primary: 'butter',
  warm: 'peach',
  secondary: 'cream',
  sage: 'sage',
  lavender: 'lavender',
};

const LIP = 5;
const PAD_X = 28;
const ICON_GAP = 10;

export class Button extends Phaser.GameObjects.Container {
  /** Visual width/height (logical px). */
  bw = 0;
  bh = 0;
  private o: ButtonOpts;
  private moving: Phaser.GameObjects.Components.Transform[] = [];
  private movingBase: number[] = [];
  private pressHi?: Panel;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOpts) {
    super(scene, x, y);
    this.o = { ...opts };
    this.build();
    pressable(scene, this, {
      onTap: () => this.o.onTap?.(),
      isDisabled: () => !!this.o.disabled,
      onDisabledTap: () => this.o.onDisabledTap?.(),
      onPress: (down) => this.setSunk(down),
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

  setLabel(label: string, icon = this.o.icon): this {
    this.o.label = label;
    this.o.icon = icon;
    this.build();
    return this;
  }

  setVariant(v: ButtonVariant): this {
    this.o.variant = v;
    this.build();
    return this;
  }

  setOnTap(fn: () => void): this {
    this.o.onTap = fn;
    return this;
  }

  private build(): void {
    const scene = this.scene;
    const o = this.o;
    this.removeAll(true);
    this.moving = [];
    this.pressHi = undefined;
    const variant = o.variant ?? 'primary';
    const quiet = variant === 'quiet';
    const H = Math.max(MIN_TOUCH, o.h ?? 64);
    const lip = quiet ? 0 : LIP;
    const faceH = H - lip;
    const faceY = -lip / 2;

    const label = txtObj(scene, 0, 0, o.label, o.textKind ?? 'button', {
      color: o.disabled ? UI_INK_FAINT : quiet ? UI_INK_SOFT : UI_INK,
    });
    const iconSize = o.iconSize ?? 30;
    const icon = o.icon ? iconObj(scene, 0, 0, o.icon, iconSize) : undefined;
    if (icon && o.disabled) icon.setAlpha(0.5);
    const contentW = label.width - 4 + (icon ? iconSize + ICON_GAP : 0);
    const W = Math.round(o.w ?? Math.max(o.minW ?? (quiet ? 96 : 132), contentW + PAD_X * 2));
    this.bw = W;
    this.bh = H;

    let underline: Phaser.GameObjects.Image | undefined;
    if (!quiet) {
      const tint: FaceTint = o.disabled ? 'off' : VARIANT_FACE[variant];
      this.add(shadowPanel(scene, 'btn', W, faceH, 0, faceY + lip + 3, o.disabled ? 0.1 : 0.2));
      this.add(panel(scene, `ui.lip.${tint}`, W, faceH, 0, faceY + lip));
      const face = panel(scene, `ui.face.${tint}`, W, faceH, 0, faceY);
      this.add(face);
      this.moving.push(face);
    } else {
      // Quiet: a soft paper pill appears only while pressed.
      this.pressHi = panel(scene, 'ui.face.cream', W, faceH, 0, faceY);
      this.pressHi.setAlpha(0);
      this.add(this.pressHi);
      underline = new Phaser.GameObjects.Image(scene, 0, 0, 'px');
      underline.setTint(Phaser.Display.Color.HexStringToColor(UI_INK_SOFT).color).setAlpha(0.28);
      underline.setDisplaySize(Math.min(W - 24, contentW), 2.4);
      this.add(underline);
      this.moving.push(underline);
    }

    // Content row (icon + label), centred on the face.
    const cy = faceY + TEXT_NUDGE;
    let x = -contentW / 2;
    const side = o.iconSide ?? 'left';
    if (icon && side === 'left') {
      icon.setPosition(x + iconSize / 2, faceY);
      x += iconSize + ICON_GAP;
    }
    label.setPosition(x + (label.width - 4) / 2, cy);
    x += label.width - 4 + ICON_GAP;
    if (icon && side === 'right') icon.setPosition(x + iconSize / 2, faceY);
    if (icon) {
      this.add(icon);
      this.moving.push(icon);
    }
    this.add(label);
    this.moving.push(label);
    underline?.setPosition(label.x, cy + label.height / 2 - 9);
    this.movingBase = this.moving.map((m) => m.y);
    setHitSize(this, W + 8, H + 8);
  }

  private setSunk(down: boolean): void {
    const dy = down ? Math.max(2, LIP - 1) : 0;
    if (this.pressHi) {
      this.scene.tweens.add({ targets: this.pressHi, alpha: down ? 0.85 : 0, duration: down ? 60 : 220 });
      return;
    }
    this.moving.forEach((m, i) => (m.y = this.movingBase[i] + dy));
  }
}
