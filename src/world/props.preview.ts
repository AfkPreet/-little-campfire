/**
 * Dev preview for the camp props (tents, fire, forage spots, Moon Scale,
 * placed decor).
 *   ?scene=preview&what=props&show=sheet  (default) every prop/state, labelled
 *   ?show=pitch   a Monsoon Dome being pitched: spot -> flat -> 4 pegs -> spring (loops)
 *   &light=day|night|dusk|golden|rain|rainNight|dawn|mist   LIGHT_PRESETS for everything
 *   &zoom=1       sheet at real size (default: fit the whole sheet); &cx=&cy= centre point
 */
import Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { layout } from '@/core/layout';
import { CAMP } from '@/data/camp';
import type { DecorId, ForageSpotId, TentId } from '@/data/ids';
import { LIGHT_PRESETS, type ResolvedLight } from '@/fx/lighting';
import { P, hexToInt, mix } from '@/palette';
import { txt } from '@/ui/text';
import { CampfireProp, DecorProp, ForageSpotProp, type Lightable, ScaleSparkle, TentProp } from './props';

type PresetKey = keyof typeof LIGHT_PRESETS;

function lightFromParam(): ResolvedLight {
  const k = (anyParam('light') ?? 'day') as PresetKey;
  return (LIGHT_PRESETS[k] ?? LIGHT_PRESETS.day)();
}

function backdrop(scene: Phaser.Scene, l: ResolvedLight, w: number, h: number, rows: number[]): void {
  const g = scene.add.graphics().setDepth(1);
  g.fillGradientStyle(l.skyTop, l.skyTop, l.horizon, l.horizon, 1);
  g.fillRect(-200, -200, w + 400, h + 400);
  for (const y of rows) {
    // A sage/moss ground strip under each row (walk line at y).
    const top = hexToInt(mix(mix(P.sage, P.cream, 0.2), l.hex.ground, 0.55));
    const bot = hexToInt(mix(P.moss, l.hex.ground, 0.6));
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(-200, y - 14, w + 400, 60);
  }
}

function label(scene: Phaser.Scene, x: number, y: number, s: string, night: boolean): void {
  txt(scene, x, y, s, 'small', { color: night ? mix(P.cream, P.lavender, 0.2) : mix(P.ink, P.cream, 0.2), size: 15 }).setDepth(150);
}

function fitCamera(scene: Phaser.Scene, vw: number, vh: number): void {
  const l = layout();
  const cam = scene.cameras.main;
  const z = Number(anyParam('zoom') ?? 0);
  const k = z > 0 ? z : Math.min(l.w / vw, 720 / vh);
  cam.setZoom(l.zoom * k);
  const cx = Number(anyParam('cx') ?? vw / 2);
  const cy = Number(anyParam('cy') ?? vh / 2);
  // Camera origin is (0, 0): scroll so (cx, cy) is centred.
  cam.setScroll(cx - l.w / k / 2, cy - 720 / k / 2);
}

function sheet(scene: Phaser.Scene, l: ResolvedLight, all: Lightable[]): void {
  const VW = 1720;
  const VH = 1080;
  const R1 = 250; // pitched tents, fire, scale
  const R2 = 440; // spots + flats
  const R3 = 650; // forage
  const R4 = 1000; // ground decor (hang decor above it)
  const night = l.night > 0.5;
  backdrop(scene, l, VW, VH, [R1, R2, R3, R4]);
  fitCamera(scene, VW, VH);

  // Fire first so the others pick up its warmth.
  const fire = new CampfireProp(scene, 860, R1);
  all.push(fire);
  label(scene, 860, R1 + 34, 'Campfire', night);

  const pitched: [TentId, number, string][] = [
    ['leaf_tent', 110, 'Fern Tent'],
    ['dome_tent', 350, 'Monsoon Dome'],
    ['cabin_kit', 630, 'Tin-Roof Cabin'],
  ];
  const tents: TentProp[] = [];
  for (const [type, x, name] of pitched) {
    const t = new TentProp(scene, x, R1);
    t.setState('pitched', type);
    tents.push(t);
    all.push(t);
    label(scene, x, R1 + 34, name, night);
  }
  const doorGlow = Math.max(l.night, l.rain * 0.7);
  for (const t of tents) t.setDoorGlow(doorGlow);

  const sc = new ScaleSparkle(scene, 1010, R1);
  all.push(sc);
  label(scene, 1010, R1 + 34, 'Moon Scale', night);

  // Hammock between two simple posts (the real trunks are the landscape's).
  const posts = scene.add.graphics();
  posts.fillStyle(hexToInt(mix(P.bark, l.hex.actor, 0.3)), 1);
  for (const px of [1180 - 75, 1180 + 75]) posts.fillRoundedRect(px - 9, R1 - 110, 18, 124, 8);
  const ham = new DecorProp(scene, 'hammock', 1180, R1 - 65);
  all.push(ham);
  label(scene, 1180, R1 + 34, 'Shawl Hammock', night);

  // Tent hang points in use: Laltin + Chime on the Fern Tent, Bunting + Kuhiro's Lantern on the Dome, Junkiri on the Cabin.
  const hangOn = (t: TentProp, i: number, id: DecorId) => {
    const p = t.hangPoint(i);
    all.push(new DecorProp(scene, id, p.x, p.y));
  };
  hangOn(tents[0], 0, 'paper_lantern');
  hangOn(tents[0], 1, 'wind_chime');
  hangOn(tents[1], 0, 'guardian_lantern');
  hangOn(tents[1], 2, 'bunting');
  {
    const a = tents[2].hangPoint(0);
    const b = tents[2].hangPoint(2);
    all.push(new DecorProp(scene, 'string_lights', a.x, a.y, { to: b }));
  }
  // Small preview geranium + pirka by the fire.
  all.push(new DecorProp(scene, 'floor_cushion', 790, R1 + 6));

  // Row 2: spot + flat for each type.
  const r2: [TentId, string][] = [
    ['leaf_tent', 'Fern'],
    ['dome_tent', 'Dome'],
    ['cabin_kit', 'Cabin'],
  ];
  r2.forEach(([type, name], i) => {
    const xs = 150 + i * 540;
    const s = new TentProp(scene, xs, R2);
    s.setState('spot', type);
    const f = new TentProp(scene, xs + 270, R2);
    f.setState('flat', type);
    f.tapPeg(0);
    f.tapPeg(3);
    all.push(s, f);
    label(scene, xs, R2 + 34, `${name}: spot`, night);
    label(scene, xs + 270, R2 + 34, `${name}: flat, 2 pegs in`, night);
  });

  // Row 3: forage spots ready / picked.
  const forage: [ForageSpotId, 'ready' | 'picked' | 'bud' | 'open', boolean, string][] = [
    ['nut_tree', 'ready', false, 'Katus'],
    ['nut_tree', 'picked', false, 'picked'],
    ['herb_patch', 'ready', false, 'Sisnu'],
    ['herb_patch', 'picked', false, 'picked'],
    ['berry_a', 'ready', false, 'Ainselu'],
    ['berry_a', 'picked', false, 'picked'],
    ['log_a', 'ready', false, 'Mossy log'],
    ['log_a', 'ready', true, 'after rain'],
    ['log_a', 'picked', false, 'picked'],
    ['moon_spot', 'bud', false, 'Moon Gurans bud'],
    ['moon_spot', 'open', false, 'open'],
  ];
  forage.forEach(([id, st, rain, name], i) => {
    const x = 90 + i * 150;
    const p = new ForageSpotProp(scene, id, x, R3);
    p.setState(st, rain);
    all.push(p);
    label(scene, x, R3 + 34, name, night);
  });

  // Row 4: ground decor on the walk line, hang decor from a branch above.
  const ground: [DecorId, number, string][] = [
    ['potted_flower', 90, 'Geranium Tin'],
    ['floor_cushion', 210, 'Pirka Stool'],
    ['woven_rug', 360, 'Radi Rug'],
    ['bookshelf', 520, 'Tea-Chest Shelf'],
    ['telescope', 650, 'Brass Star-Scope'],
  ];
  for (const [id, x, name] of ground) {
    all.push(new DecorProp(scene, id, x, R4));
    label(scene, x, R4 + 34, name, night);
  }
  const BY = 790;
  const branch = scene.add.graphics();
  branch.lineStyle(9, hexToInt(mix(P.bark, l.hex.actor, 0.3)), 1);
  branch.beginPath();
  branch.moveTo(760, BY - 4);
  branch.lineTo(1700, BY + 4);
  branch.strokePath();
  const hang: [DecorId, number, string][] = [
    ['paper_lantern', 820, 'Little Laltin'],
    ['bunting', 950, 'Wool Bunting'],
    ['wind_chime', 1080, 'Bamboo Chime'],
    ['guardian_lantern', 1180, "Kuhiro's Lantern"],
  ];
  for (const [id, x, name] of hang) {
    all.push(new DecorProp(scene, id, x, BY));
    label(scene, x, BY + 110, name, night);
  }
  all.push(new DecorProp(scene, 'string_lights', 1290, BY, { to: { x: 1630, y: BY + 2 } }));
  label(scene, 1460, BY + 110, 'Junkiri Lights', night);
  // A ghost copy (decor-mode drag preview).
  const ghost = new DecorProp(scene, 'potted_flower', 1500, R4);
  ghost.setGhost(true);
  all.push(ghost);
  label(scene, 1500, R4 + 34, 'ghost', night);

  // Highlight demo on a few.
  scene.time.delayedCall(300, () => {
    fire.setHighlight(true);
    tents[0].setHighlight(true);
  });
  void CAMP;
}

function pitch(scene: Phaser.Scene, l: ResolvedLight, all: Lightable[]): void {
  const VW = 900;
  const VH = 560;
  const GY = 400;
  backdrop(scene, l, VW, VH, [GY]);
  fitCamera(scene, VW, VH);
  const fire = new CampfireProp(scene, 160, GY);
  const t = new TentProp(scene, 520, GY);
  all.push(fire, t);
  const wait = (ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));
  const loop = async (): Promise<void> => {
    for (;;) {
      t.setState('spot', 'dome_tent');
      t.setHighlight(true);
      await wait(1200);
      t.setHighlight(false);
      t.setState('flat', 'dome_tent');
      await wait(700);
      for (let k = 0; k < 4; k++) {
        t.tapPeg(k);
        await wait(450);
      }
      await t.springUp();
      t.setDoorGlow(Math.max(0.5, l.night));
      await wait(2200);
      t.setType('cabin_kit');
      await wait(1800);
      t.setDoorGlow(0);
      t.setState('hidden');
      await wait(500);
    }
  };
  void loop();
}

export default function preview(scene: Phaser.Scene): void {
  const l = lightFromParam();
  const all: Lightable[] = [];
  const show = anyParam('show') ?? 'sheet';
  if (show === 'pitch') pitch(scene, l, all);
  else sheet(scene, l, all);
  for (const p of all) p.setLight(l);
  scene.events.on('update', (time: number, delta: number) => {
    for (const p of all) p.update(time, delta);
  });
}
