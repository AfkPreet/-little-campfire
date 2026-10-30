/**
 * Landscape preview: ?scene=preview&what=landscape
 *   &light=dawn|day|golden|dusk|night|rain|rainNight|mist   (LIGHT_PRESETS)
 *   &x=<camera scrollX>   (default 900)
 *   &grid=1               (3x2 thumbnails of dawn, day, golden, dusk, night, rain)
 *   &open=<0..1>          (setSkyOpen, finale test)
 */
import Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { layout } from '@/core/layout';
import { CAMP } from '@/data/camp';
import { DEPTH } from '@/config';
import { LIGHT_PRESETS } from '@/fx/lighting';
import { P, hexToInt } from '@/palette';
import { Landscape } from './Landscape';

type PresetKey = keyof typeof LIGHT_PRESETS;

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  if (anyParam('grid') === '1') {
    grid(scene);
    return;
  }
  const key = (anyParam('light') ?? 'day') as PresetKey;
  const light = (LIGHT_PRESETS[key] ?? LIGHT_PRESETS.day)();
  const land = new Landscape(scene, { worldW: CAMP.worldW });
  const cam = scene.cameras.main;
  const x = Number(anyParam('x') ?? 900);
  cam.scrollX = Math.max(0, Math.min(CAMP.worldW - l.w, x));
  land.applyLight(light);
  land.setSkyOpen(Number(anyParam('open') ?? 0));
  // Vignette as the camp's light director adds it.
  scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.vignette).setDisplaySize(l.w, l.h).setAlpha(light.vignette);
  scene.events.on('update', (t: number, d: number) => {
    land.applyLight(light);
    land.update(t, d);
  });
  scene.events.once('shutdown', () => land.destroy());
}

function grid(scene: Phaser.Scene): void {
  const l = layout();
  scene.add.rectangle(0, 0, l.w, l.h, hexToInt(P.cream)).setOrigin(0).setDepth(-1);
  const keys: PresetKey[] = ['dawn', 'day', 'golden', 'dusk', 'night', 'rain'];
  const cols = 3;
  const gap = 14;
  const vw = 1340;
  const cw = (l.w - gap * (cols + 1)) / cols;
  const k = cw / vw;
  const ch = 720 * k;
  const top = (l.h - (ch * 2 + gap)) / 2;
  const lands: { land: Landscape; light: ReturnType<(typeof LIGHT_PRESETS)['day']> }[] = [];
  keys.forEach((key, i) => {
    const c = scene.add.container(gap + (i % cols) * (cw + gap), top + Math.floor(i / cols) * (ch + gap));
    c.setScale(k);
    const mask = scene.make.graphics({}, false);
    mask.fillStyle(0xffffff).fillRect(c.x, c.y, cw, ch);
    c.setMask(mask.createGeometryMask());
    const land = new Landscape(scene, { container: c, viewW: vw, viewX: 760 });
    const light = LIGHT_PRESETS[key]();
    land.applyLight(light);
    lands.push({ land, light });
  });
  scene.events.on('update', (t: number, d: number) => {
    for (const e of lands) e.land.update(t, d);
  });
}
