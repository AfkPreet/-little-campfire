/**
 * Crisp text: every Text renders at the camera zoom so it is sharp on Retina.
 * Use these instead of scene.add.text so fonts, colours and Large text stay
 * consistent.
 */
import Phaser from 'phaser';
import { FONT_HAND, FONT_UI } from '@/config';
import { layout } from '@/core/layout';
import { textScale } from '@/core/settings';
import { P } from '@/palette';

export type TextKind = 'title' | 'h1' | 'h2' | 'body' | 'small' | 'button' | 'hand' | 'handBig' | 'label';

const SIZES: Record<TextKind, { size: number; weight: number; font: string; line?: number }> = {
  title: { size: 76, weight: 700, font: FONT_UI },
  h1: { size: 40, weight: 700, font: FONT_UI },
  h2: { size: 30, weight: 600, font: FONT_UI },
  body: { size: 24, weight: 400, font: FONT_UI },
  small: { size: 19, weight: 600, font: FONT_UI },
  button: { size: 26, weight: 600, font: FONT_UI },
  label: { size: 21, weight: 600, font: FONT_UI },
  hand: { size: 28, weight: 400, font: FONT_HAND },
  handBig: { size: 44, weight: 400, font: FONT_HAND },
};

export interface TextOpts {
  color?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  stroke?: string;
  strokeWidth?: number;
  /** Override size in logical px. */
  size?: number;
  lineSpacing?: number;
  /** Ignore the Large text setting (for decorative text). */
  fixed?: boolean;
}

export function textStyle(kind: TextKind, o: TextOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const s = SIZES[kind];
  const size = Math.round((o.size ?? s.size) * (o.fixed ? 1 : textScale()));
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: s.font,
    fontStyle: s.font === FONT_UI ? String(s.weight) : 'normal',
    fontSize: `${size}px`,
    color: o.color ?? P.ink,
    align: o.align ?? 'left',
    resolution: Math.max(1, layout().zoom),
    padding: { x: 2, y: 4 },
  };
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.stroke) {
    style.stroke = o.stroke;
    style.strokeThickness = o.strokeWidth ?? 6;
  }
  if (o.lineSpacing !== undefined) style.lineSpacing = o.lineSpacing;
  return style;
}

/** Add crisp text. Origin defaults to centre. */
export function txt(scene: Phaser.Scene, x: number, y: number, str: string, kind: TextKind = 'body', o: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, textStyle(kind, o));
  t.setOrigin(o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5, 0.5);
  return t;
}

/** Create (not add) crisp text for containers. */
export function txtObj(scene: Phaser.Scene, x: number, y: number, str: string, kind: TextKind = 'body', o: TextOpts = {}): Phaser.GameObjects.Text {
  const t = new Phaser.GameObjects.Text(scene, x, y, str, textStyle(kind, o));
  t.setOrigin(o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5, 0.5);
  return t;
}

/** Fill a template like "Caught a {fish}!" */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
