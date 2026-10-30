/**
 * Rounded paper card (radius 20) with a soft ink-tinted shadow (blur 12,
 * y 4, alpha 0.15), faint paper grain, an optional title and an optional
 * ribbon ("NEW!"). Children are positioned relative to the card centre; use
 * `top` / `contentTop` to lay content out from the top edge.
 */
import Phaser from 'phaser';
import { artObj } from '@/art/kit';
import { UI_INK, addGrain, panel, shadowPanel, type CardTint, type Panel } from '@/art/ui';
import { P, mix, shade } from '@/palette';
import { TEXT_NUDGE } from './Button';
import { txtObj, type TextKind } from './text';

export interface CardOpts {
  w: number;
  h: number;
  title?: string;
  titleKind?: TextKind;
  /** Ribbon text across the top-right corner, e.g. "NEW!". */
  ribbon?: string;
  tint?: CardTint;
  /** Default true. */
  shadow?: boolean;
  /** Default true. */
  grain?: boolean;
  /** Shadow strength (default 0.15 per spec). */
  shadowAlpha?: number;
}

export class Card extends Phaser.GameObjects.Container {
  /** Card width / height (logical px). */
  readonly cw: number;
  readonly ch: number;
  readonly paper: Panel;
  readonly shadow?: Panel;
  title?: Phaser.GameObjects.Text;
  ribbon?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: CardOpts) {
    super(scene, x, y);
    this.cw = opts.w;
    this.ch = opts.h;
    const tint = opts.tint ?? 'cream';
    if (opts.shadow !== false) {
      this.shadow = shadowPanel(scene, 'card', opts.w, opts.h, 0, 4, opts.shadowAlpha ?? 0.15);
      this.add(this.shadow);
    }
    this.paper = panel(scene, `ui.card.${tint}`, opts.w, opts.h);
    this.add(this.paper);
    if (opts.grain !== false) addGrain(scene, this, opts.w, opts.h, tint === 'cream' ? 0.9 : 1);
    if (opts.title) this.setTitle(opts.title, opts.titleKind);
    if (opts.ribbon) this.setRibbon(opts.ribbon);
    scene.add.existing(this);
  }

  /** Top edge in local coordinates. */
  get top(): number {
    return -this.ch / 2;
  }

  /** First free y below the title (local). */
  get contentTop(): number {
    return this.title ? this.top + 72 : this.top + 24;
  }

  setTitle(text: string, kind: TextKind = 'h2'): this {
    if (!this.title) {
      this.title = txtObj(this.scene, 0, this.top + 36 + TEXT_NUDGE, text, kind, { color: UI_INK });
      this.add(this.title);
    } else this.title.setText(text);
    return this;
  }

  /** A ribbon tucked over the top-right corner, slightly tilted. */
  setRibbon(text: string | null): this {
    this.ribbon?.destroy();
    this.ribbon = undefined;
    if (!text) return this;
    const scene = this.scene;
    const c = new Phaser.GameObjects.Container(scene, this.cw / 2 - 34, this.top + 8);
    const bg = artObj(scene, 0, 0, 'icon.ribbon');
    const band = mix(P.rose, P.ember, 0.22);
    const label = txtObj(scene, 0, -2.5 + TEXT_NUDGE, text, 'small', {
      color: P.cream,
      size: 18,
      stroke: shade(band, 0.3),
      strokeWidth: 4,
      fixed: true,
    });
    label.setFontStyle('700');
    c.add([bg, label]);
    c.setAngle(14);
    this.add(c);
    this.ribbon = c;
    return this;
  }
}
