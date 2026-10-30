/**
 * Tuki preview: ?scene=preview&what=hero&show=sheet|walk|quirk|big
 *   sheet: expressions, poses, walk strip, rain, tiers, lighting, real size.
 *   walk:  Tuki hop-walking back and forth (dry + rain).
 *   quirk: the haymaker looping at every tier.
 *   big:   one large Tuki (&pose=&expr=&rain=1&tier=&light=night|golden&scale=3).
 */
import Phaser from 'phaser';
import { Hero, type HeroPose, type Tier } from './Hero';
import { EXPRESSIONS, type Expression } from './rig';
import { anyParam } from '@/core/debug';
import { layout } from '@/core/layout';
import { LIGHT_PRESETS } from '@/fx/lighting';
import { txt } from '@/ui/text';
import { A, LIGHT, P, hexToInt, mix, shade } from '@/palette';

const POSE_LIST: HeroPose[] = ['stand', 'sit', 'sleep', 'fish', 'cast', 'reel', 'eat', 'pick', 'read', 'nap', 'rest', 'hold'];
const TIERS: Tier[] = ['cozy', 'content', 'glowing', 'blissful'];

function sky(scene: Phaser.Scene, w: number, h: number): void {
  const g = scene.add.graphics();
  const top = hexToInt(LIGHT.day.skyTop);
  const bot = hexToInt(LIGHT.day.horizon);
  g.fillGradientStyle(top, top, bot, bot, 1);
  g.fillRect(0, 0, w, h);
}

function ground(scene: Phaser.Scene, x0: number, x1: number, y: number): void {
  const g = scene.add.graphics();
  g.fillStyle(hexToInt(mix(P.sage, P.cream, 0.35)), 0.55);
  g.fillRoundedRect(x0, y - 2, x1 - x0, 12, 6);
  g.lineStyle(2, hexToInt(mix(P.moss, P.sage, 0.4)), 0.45);
  g.lineBetween(x0 + 6, y - 1, x1 - 6, y - 1);
}

function label(scene: Phaser.Scene, x: number, y: number, s: string): void {
  txt(scene, x, y, s, 'small', { size: 13, color: mix(P.ink, P.lavender, 0.25), fixed: true });
}

function card(scene: Phaser.Scene, x: number, y: number, w: number, h: number, colTop: string, colBot: string): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(hexToInt(colTop), hexToInt(colTop), hexToInt(colBot), hexToInt(colBot), 1);
  g.fillRoundedRect(x, y, w, h, 16);
}

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  const W = l.w;
  const H = l.h;
  const show = anyParam('show') ?? 'sheet';
  const heroes: Hero[] = [];
  sky(scene, W, H);
  scene.events.on('update', (time: number, delta: number) => {
    for (const h of heroes) h.tick(time, delta);
  });

  const make = (x: number, y: number, s = 1): Hero => {
    const h = new Hero(scene, x, y);
    h.setScale(s);
    h.autoQuirk = false;
    heroes.push(h);
    return h;
  };

  if (show === 'big') {
    const s = Number(anyParam('scale') ?? 3);
    const lightName = anyParam('light');
    if (lightName === 'night' || lightName === 'golden') {
      const L = LIGHT_PRESETS[lightName]();
      card(scene, 0, 0, W, H, L.hex.skyTop, L.hex.horizon);
    }
    const y = H * 0.5 + 52 * s;
    ground(scene, W * 0.2, W * 0.8, y);
    const h = make(W * 0.5, y, s);
    h.setPose((anyParam('pose') as HeroPose) ?? 'stand');
    h.setExpression((anyParam('expr') as Expression) ?? 'neutral');
    h.setTier((anyParam('tier') as Tier) ?? 'glowing');
    if (anyParam('rain') === '1') h.setRain(true);
    if (anyParam('scaleglow') === '1') h.setScaleGlow(true);
    if (anyParam('face') === 'left') h.face(-1);
    if (anyParam('held')) h.setHeldItem(anyParam('held'));
    else if (h.pose === 'hold' || h.pose === 'eat') h.setHeldItem('hero_item_gurans');
    if (lightName === 'night' || lightName === 'golden') h.setLightTint(LIGHT_PRESETS[lightName]().actor);
    if (anyParam('quirk') === '1') h.haymaker();
    if (anyParam('perk') === '1') h.perkTowardLake();
    return;
  }

  if (show === 'walk') {
    ground(scene, 20, W - 20, 330);
    ground(scene, 20, W - 20, 600);
    const a = make(160, 330, 1.6);
    const b = make(W - 160, 600, 1.6);
    b.setRain(true);
    b.setTier('blissful');
    a.setTier('content');
    const loop = (h: Hero, x0: number, x1: number) => {
      const go = (to: number) => h.walkTo(to, () => scene.time.delayedCall(500, () => go(to === x1 ? x0 : x1)));
      go(x1);
    };
    loop(a, 160, W - 160);
    loop(b, W - 160, 160);
    return;
  }

  if (show === 'quirk') {
    const gap = W / 5;
    TIERS.forEach((t, i) => {
      const x = gap * (i + 1);
      ground(scene, x - 90, x + 90, 470);
      const h = make(x, 470, 1.8);
      h.setTier(t);
      h.setExpression(t === 'blissful' ? 'blissful' : t === 'cozy' ? 'neutral' : 'happy');
      label(scene, x, 500, t);
      const run = () => {
        h.emptyDoko().setDokoCount(Math.max(0, h.itemCap - 1));
        h.haymaker();
        scene.time.delayedCall(3600, run);
      };
      scene.time.delayedCall(300 + i * 120, run);
    });
    return;
  }

  // ---- sheet ----
  const s = 0.78;
  const rowY = [148, 318, 488, 662];
  // Row 1: expressions + lighting copies.
  const ex0 = 64;
  const exGap = Math.min(104, (W - 340) / 6);
  EXPRESSIONS.forEach((e, i) => {
    const x = ex0 + i * exGap;
    const h = make(x, rowY[0], s);
    h.setExpression(e);
    h.setTier('content');
    label(scene, x, rowY[0] + 16, e);
  });
  ground(scene, 20, ex0 + 5.5 * exGap + 40, rowY[0]);
  const lightCopy = (x: number, name: 'night' | 'golden' | 'rainNight') => {
    const L = LIGHT_PRESETS[name]();
    card(scene, x - 52, rowY[0] - 128, 104, 160, L.hex.skyTop, L.hex.horizon);
    const h = make(x, rowY[0], s);
    h.setTier('glowing');
    if (name === 'rainNight') {
      h.setRain(true);
      h.setScaleGlow(true);
    }
    h.setLightTint(L.actor);
    label(scene, x, rowY[0] + 16, name);
  };
  lightCopy(W - 282, 'golden');
  lightCopy(W - 170, 'night');
  lightCopy(W - 58, 'rainNight');

  // Row 2: poses.
  const pGap = (W - 40) / POSE_LIST.length;
  POSE_LIST.forEach((p, i) => {
    const x = 20 + pGap * (i + 0.5);
    const h = make(x, rowY[1], s);
    h.setTier('glowing');
    h.setPose(p);
    if (p === 'hold' || p === 'eat') h.setHeldItem('hero_item_gurans');
    if (p === 'read') h.setExpression('neutral');
    label(scene, x, rowY[1] + 16, p);
    // keep one-shots looping so the sheet shows them mid-motion
    if (p === 'cast' || p === 'reel' || p === 'pick') {
      const again = () => {
        h.setPose(p);
        scene.time.delayedCall(p === 'reel' ? 1500 : 1100, again);
      };
      scene.time.delayedCall(200, again);
    }
  });
  ground(scene, 20, W - 20, rowY[1]);

  // Row 3: walk strip (6 hop phases) + rain.
  const wGap = 82;
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * wGap;
    const h = make(x, rowY[2], s);
    h.setTier('content');
    h.previewHop = i / 6;
    label(scene, x, rowY[2] + 16, `hop ${i}`);
  }
  ground(scene, 20, 60 + 5.5 * wGap, rowY[2]);
  const rx = 60 + 6 * wGap + 40;
  const rainPoses: [HeroPose, string][] = [
    ['stand', 'rain'],
    ['fish', 'rain fish'],
    ['sit', 'rain sit'],
  ];
  rainPoses.forEach(([p, name], i) => {
    const x = rx + i * 96;
    const h = make(x, rowY[2], s);
    h.setTier('glowing');
    h.setPose(p);
    h.setRain(true);
    label(scene, x, rowY[2] + 16, name);
  });
  ground(scene, rx - 50, rx + 2 * 96 + 50, rowY[2]);
  // Animated walker in the remaining space.
  const wx0 = rx + 3 * 96 + 10;
  if (W - wx0 > 160) {
    const h = make(wx0 + 40, rowY[2], s);
    h.setTier('content');
    const go = (to: number) => h.walkTo(to, () => scene.time.delayedCall(300, () => go(to === W - 50 ? wx0 + 40 : W - 50)));
    go(W - 50);
    ground(scene, wx0, W - 20, rowY[2]);
    label(scene, (wx0 + W) / 2, rowY[2] + 16, 'walk');
  }

  // Row 4: tiers, Moon Scale glow, perk, real size + marker.
  TIERS.forEach((t, i) => {
    const x = 64 + i * 100;
    const h = make(x, rowY[3], s);
    h.setTier(t);
    if (t === 'blissful') h.setExpression('blissful');
    label(scene, x, rowY[3] + 16, t);
  });
  const sx = 64 + 4 * 100;
  const sg = make(sx, rowY[3], s);
  sg.setTier('content');
  sg.setScaleGlow(true);
  label(scene, sx, rowY[3] + 16, 'moon scale');
  const pk = make(sx + 100, rowY[3], s);
  pk.setTier('glowing');
  const perk = () => {
    pk.perkTowardLake();
    scene.time.delayedCall(2600, perk);
  };
  scene.time.delayedCall(200, perk);
  label(scene, sx + 100, rowY[3] + 16, 'perk');
  const lx = sx + 100 + 96;
  const left = make(lx, rowY[3], s);
  left.setTier('glowing');
  left.face(-1);
  label(scene, lx, rowY[3] + 16, 'facing left');
  ground(scene, 20, lx + 50, rowY[3]);

  // Real camp size with a 104 px height marker.
  const mx = W - 190;
  const g = scene.add.graphics();
  g.lineStyle(2, hexToInt(shade(A['gurans'], 0.1)), 0.9);
  g.lineBetween(mx - 70, rowY[3], mx - 70, rowY[3] - 104);
  g.lineBetween(mx - 78, rowY[3], mx - 62, rowY[3]);
  g.lineBetween(mx - 78, rowY[3] - 104, mx - 62, rowY[3] - 104);
  txt(scene, mx - 74, rowY[3] - 112, '104', 'small', { size: 12, color: A['gurans-deep'], fixed: true });
  ground(scene, mx - 90, W - 20, rowY[3]);
  const real = make(mx, rowY[3], 1);
  real.setTier('glowing');
  real.setExpression('happy');
  real.autoQuirk = true;
  const real2 = make(mx + 120, rowY[3], 1);
  real2.setTier('cozy');
  real2.setPose('sit');
  label(scene, mx + 60, rowY[3] + 16, 'real size');
}
