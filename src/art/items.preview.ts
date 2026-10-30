/**
 * Item icon preview: ?scene=preview&what=items&show=sheet|big|tiny
 * sheet: every icon at 64 px in labelled groups; big: a selection at 128 px
 * (override with &ids=a,b,c); tiny: everything at 40 px for legibility.
 */
import type Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { layout } from '@/core/layout';
import { A, P, mix, hexToInt } from '@/palette';
import { txt } from '@/ui/text';
import { art } from './kit';
import { ICON_GROUPS, ALL_ICON_IDS, iconKey } from './items';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import { GEAR, PANTRY } from '@/data/items';
import { DECOR } from '@/data/decor';
import { RECIPES, MUSH } from '@/data/recipes';

const SPECIAL: Record<string, string> = { moon_scale: 'Moon Scale', coin: 'Rupee Coin', doko: 'Doko' };

function nameOf(id: string): string {
  const tables: Record<string, { name: string }>[] = [
    FISH as Record<string, { name: string }>,
    FORAGE as Record<string, { name: string }>,
    GEAR as Record<string, { name: string }>,
    PANTRY as Record<string, { name: string }>,
    DECOR as Record<string, { name: string }>,
    RECIPES as Record<string, { name: string }>,
  ];
  for (const t of tables) if (t[id]) return t[id].name;
  if (id === 'mystery_mush') return MUSH.name;
  return SPECIAL[id] ?? id;
}

function icon(scene: Phaser.Scene, x: number, y: number, id: string, size: number): void {
  art(scene, x, y, iconKey(id)).setDisplaySize(size, size);
}

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  scene.add.rectangle(0, 0, l.w, l.h, hexToInt(A['lokta'])).setOrigin(0);
  const show = anyParam('show') ?? 'sheet';
  const ink = mix(P.ink, P.cream, 0.2);

  if (show === 'big') {
    const ids = (anyParam('ids') ?? 'golden_whisker,petal_koi,night_glowfin,bubble_carp,pebble_minnow,moon_dumplings,mystery_mush,honey_tea,campfire_stew,pancakes,moon_blossom,coin,moon_scale,doko,steamer').split(',');
    const cols = Math.min(5, ids.length);
    const cw = 150;
    const x0 = l.w / 2 - ((cols - 1) * cw) / 2;
    ids.forEach((id, i) => {
      const x = x0 + (i % cols) * cw;
      const y = 90 + Math.floor(i / cols) * 168;
      icon(scene, x, y, id, 128);
      txt(scene, x, y + 74, nameOf(id), 'small', { size: 14, fixed: true, color: ink });
    });
    return;
  }

  if (show === 'tiny') {
    const cols = Math.floor((l.w - 32) / 50);
    ALL_ICON_IDS.forEach((id, i) => {
      const x = 16 + 25 + (i % cols) * 50;
      const y = 40 + Math.floor(i / cols) * 54;
      icon(scene, x, y, id, 40);
    });
    // Also a row on the parchment card tone and a dusk tone.
    const y2 = 40 + (Math.floor((ALL_ICON_IDS.length - 1) / cols) + 1) * 54 + 20;
    scene.add.rectangle(0, y2 - 6, l.w, 120, hexToInt(mix(A['shop-wood'], P.cream, 0.3))).setOrigin(0);
    ['coin', 'doko', 'moon_scale', 'pebble_minnow', 'golden_whisker', 'berries', 'rice', 'kettle', 'moon_dumplings', 'mystery_mush', 'paper_lantern', 'bamboo_rod'].forEach((id, i) => {
      icon(scene, 41 + i * 50, y2 + 24, id, 40);
      icon(scene, 41 + i * 50, y2 + 80, id, 28);
    });
    return;
  }

  // sheet: groups flow into rows of 64 px cells.
  const cw = 78;
  const cols = Math.floor((l.w - 24) / cw);
  let col = 0;
  let row = 0;
  const rowH = 104;
  const y0 = 14;
  for (const g of ICON_GROUPS) {
    if (col + Math.min(g.ids.length, 3) > cols) {
      col = 0;
      row++;
    }
    const startX = 12 + col * cw;
    txt(scene, startX + 4, y0 + row * rowH + 6, g.group.toUpperCase(), 'small', { size: 11, fixed: true, align: 'left', color: mix(P.rose, P.ink, 0.35) });
    g.ids.forEach((id) => {
      if (col >= cols) {
        col = 0;
        row++;
      }
      const x = 12 + col * cw + cw / 2;
      const y = y0 + row * rowH + 50;
      icon(scene, x, y, id, 64);
      txt(scene, x, y + 40, nameOf(id), 'small', { size: 10.5, fixed: true, color: ink, wrap: cw - 4, align: 'center' }).setOrigin(0.5, 0);
      col++;
    });
    col += 0.25;
    col = Math.ceil(col);
  }
}
