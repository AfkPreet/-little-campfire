/**
 * Renders the app icons from Tuki's portrait (same art code as the game) and
 * exposes them as data URLs on window.__icons for scripts/icons.mjs.
 */
import type Phaser from 'phaser';
import { A, P } from '@/palette';
import { glowDisc } from './kit';

export default async function preview(scene: Phaser.Scene): Promise<void> {
  const { drawHeroPortrait } = await import('@/art/hero');
  const out: Record<number, string> = {};
  for (const size of [32, 180, 192, 512]) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    // Dusk sky to lake gradient with a warm glow, like the title screen.
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#8E86B5');
    g.addColorStop(0.62, '#E9A9A6');
    g.addColorStop(1, A['lake-jade']);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    glowDisc(ctx, size / 2, size * 0.62, size * 0.5, P.glow, 0.45);
    ctx.save();
    const inset = size * 0.08;
    ctx.translate(inset, inset * 1.4);
    drawHeroPortrait(ctx, size - inset * 2, { tilt: 0, expression: 'happy' });
    ctx.restore();
    out[size] = c.toDataURL('image/png');
  }
  (window as unknown as { __icons: Record<number, string> }).__icons = out;
  const img = scene.add.image(0, 0, '__WHITE');
  img.setVisible(false);
}
