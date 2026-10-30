import type Phaser from 'phaser';
import { art } from './kit';
import { layout } from '@/core/layout';

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  art(scene, l.w / 2, l.h / 2, 'logo_main');
}
