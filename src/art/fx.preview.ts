import type Phaser from 'phaser';
import { art } from './kit';
import { P, hexToInt } from '@/palette';

export default function preview(scene: Phaser.Scene): void {
  const keys = ['glow', 'soft', 'dot', 'sparkle', 'star', 'heart', 'ring', 'puff', 'mistBlob', 'petal', 'note', 'drop'];
  keys.forEach((k, i) => {
    const img = art(scene, 120 + (i % 6) * 150, 160 + Math.floor(i / 6) * 220, k);
    img.setTint(hexToInt(i % 2 ? P.ember : P.lavender));
  });
}
