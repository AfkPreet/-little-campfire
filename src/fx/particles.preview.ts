import type Phaser from 'phaser';
import { layout } from '@/core/layout';
import { Fireflies, Rain, embers, sparkleBurst, steam, heartBurst, ripple } from './particles';

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  const rain = new Rain(scene, l.w, l.h);
  rain.set(1, true);
  const ff = new Fireflies(scene, { x0: 100, x1: l.w - 100, y0: 300, y1: 560 }, 30);
  ff.setAmount(1, true);
  embers(scene, 300, 600);
  steam(scene, 600, 560);
  scene.time.addEvent({ delay: 700, loop: true, callback: () => sparkleBurst(scene, 800, 300) });
  scene.time.addEvent({ delay: 900, loop: true, callback: () => heartBurst(scene, 450, 400) });
  scene.time.addEvent({ delay: 500, loop: true, callback: () => ripple(scene, 700, 650) });
  scene.events.on('update', (t: number, d: number) => {
    rain.update(d / 1000);
    ff.update(t, d);
  });
}
