/**
 * Sound check (?scene=preview&what=audio): one button per sound effect, each
 * music mood and a set of ambience presets, so the whole audio system can be
 * auditioned by touch on an iPad. The first tap anywhere wakes the audio.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { layout } from '@/core/layout';
import { squash, wobble } from '@/fx/juice';
import { P, hexToInt, shade, tint } from '@/palette';
import { txt, txtObj } from '@/ui/text';
import {
  type AmbienceCtx,
  type MusicMood,
  type SfxId,
  SFX_IDS,
  audioLevel,
  audioState,
  getLeadVoice,
  playSfx,
  setAmbience,
  setLeadVoice,
  setMusicMood,
  windGust,
  duckMusic,
} from './engine';

const LABELS: Partial<Record<SfxId, string>> = {
  step: 'Step',
  plip: 'Plip',
  splash: 'Splash',
  bite: 'Bite',
  reel: 'Reel',
  fanfare: 'Fanfare',
  pop: 'Pop',
  basket: 'Basket',
  tok: 'Peg tok',
  spring: 'Tent spring',
  page: 'Page flip',
  squish: 'Squish',
  sizzle: 'Sizzle',
  bubble: 'Bubbling',
  kettle: 'Kettle',
  chime: 'Discovery',
  tinkle: 'Wind chime',
  squeak: 'Squeak',
  nope: 'Nope',
  coin: 'Coin',
  whoosh: 'Cast swish',
  stir: 'Stir',
  rumble: 'Rumble',
  hearts: 'Hearts',
  sparkle: 'Sparkle',
};

const base = { raining: false, inTent: false, nearFire: 0, nearWater: 0 };
const AMBIENCE: [string, AmbienceCtx][] = [
  ['Dawn camp', { ...base, scene: 'camp', p: 0.04, nearFire: 0.2, nearWater: 0.3 }],
  ['Day camp', { ...base, scene: 'camp', p: 0.3 }],
  ['Golden hour', { ...base, scene: 'camp', p: 0.74, nearFire: 0.3 }],
  ['Dusk', { ...base, scene: 'camp', p: 0.9, nearFire: 0.6 }],
  ['Night fire', { ...base, scene: 'camp', p: 1, nearFire: 1 }],
  ['By the lake', { ...base, scene: 'camp', p: 1, nearWater: 1 }],
  ['Rain', { ...base, scene: 'camp', p: 0.5, raining: true }],
  ['Rain in tent', { ...base, scene: 'camp', p: 1, raining: true, inTent: true, nearFire: 0.3 }],
  ['Shop', { ...base, scene: 'shop', p: 0.3 }],
  ['Cooking', { ...base, scene: 'cooking', p: 1 }],
  ['Journal', { ...base, scene: 'journal', p: 0.3 }],
  ['Title', { ...base, scene: 'title', p: 0.92, nearFire: 0.8 }],
  ['Silent', { ...base, scene: 'silent', p: 0.3 }],
];

const MOODS: [string, MusicMood][] = [
  ['Day', 'day'],
  ['Rain', 'rain'],
  ['Night', 'night'],
  ['Finale', 'finale'],
  ['Off', 'off'],
];

interface Btn {
  c: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  accent: string;
  w: number;
  h: number;
  active: boolean;
}

export default function preview(scene: Phaser.Scene): void {
  const l = layout();
  const W = l.w;
  const M = Math.max(28, l.safe.left + 16);
  const GAP = 8;
  const BH = MIN_TOUCH;
  const BW = 128;
  const cols = Math.max(4, Math.floor((W - 2 * M + GAP) / (BW + GAP)));
  const gridW = cols * (BW + GAP) - GAP;
  const x0 = Math.round((W - gridW) / 2);

  // Soft backdrop wash.
  const bg = scene.add.graphics();
  bg.fillStyle(hexToInt(tint(P.butter, 0.75)), 0.35);
  bg.fillEllipse(W * 0.15, 40, W * 0.7, 220);
  bg.fillStyle(hexToInt(tint(P.peach, 0.7)), 0.2);
  bg.fillEllipse(W * 0.9, 740, W * 0.8, 240);

  // Header.
  txt(scene, x0, 40, 'Sound check', 'h1', { align: 'left', size: 36 });
  const status = txt(scene, x0 + 236, 44, '', 'hand', { align: 'left', size: 24, color: shade(P.lavender, 0.35) });

  // Level meter (top right): rounded bars scaled by the output level.
  const bars: Phaser.GameObjects.Graphics[] = [];
  const BARS = 9;
  for (let i = 0; i < BARS; i++) {
    const g = scene.add.graphics();
    const bx = x0 + gridW - (BARS - i) * 14 + 4;
    g.fillStyle(hexToInt(i < 6 ? P.sage : i < 8 ? P.butter : P.peach), 1);
    g.fillRoundedRect(-4, -34, 8, 34, 4);
    g.setPosition(bx, 58);
    g.scaleY = 0.12;
    bars.push(g);
  }

  const buttons: Btn[] = [];
  const makeBtn = (x: number, y: number, label: string, accent: string, onTap: (b: Btn) => void): Btn => {
    const c = scene.add.container(x + BW / 2, y + BH / 2);
    const g = scene.add.graphics();
    const t = txtObj(scene, 0, 0, label, 'small', { size: 18, color: P.ink });
    c.add([g, t]);
    c.setSize(BW, BH);
    c.setInteractive(new Phaser.Geom.Rectangle(-BW / 2, -BH / 2, BW, BH), Phaser.Geom.Rectangle.Contains);
    const b: Btn = { c, g, label: t, accent, w: BW, h: BH, active: false };
    drawBtn(b, false);
    c.on('pointerdown', () => {
      drawBtn(b, true);
      squash(scene, c, 0.6, 1, 1);
    });
    c.on('pointerout', () => drawBtn(b, false));
    c.on('pointerup', () => {
      drawBtn(b, false);
      onTap(b);
    });
    buttons.push(b);
    return b;
  };

  const heading = (y: number, text: string, accent: string) => {
    const d = scene.add.graphics();
    d.fillStyle(hexToInt(accent), 1);
    d.fillCircle(x0 + 7, y, 6);
    txt(scene, x0 + 22, y, text, 'label', { align: 'left', size: 21 });
  };

  let y = 92;
  const ROW = BH + GAP;

  // --- Sounds ---------------------------------------------------------------
  heading(y, 'Sounds', P.sage);
  y += 22;
  SFX_IDS.forEach((id, i) => {
    const bx = x0 + (i % cols) * (BW + GAP);
    const by = y + Math.floor(i / cols) * ROW;
    makeBtn(bx, by, LABELS[id] ?? id, P.sage, (b) => {
      playSfx(id);
      if (id === 'nope') wobble(scene, b.c);
    });
  });
  y += Math.ceil(SFX_IDS.length / cols) * ROW + 26;

  // --- Music ----------------------------------------------------------------
  heading(y, 'Music', P.lavender);
  y += 22;
  const moodBtns: [Btn, MusicMood][] = [];
  const musicItems: [string, (b: Btn) => void][] = [
    ...MOODS.map(([label, mood]): [string, (b: Btn) => void] => [label, () => setMusicMood(mood)]),
    [
      `Flute: ${getLeadVoice() === 'flute' ? 'on' : 'off'}`,
      (b) => {
        setLeadVoice(getLeadVoice() === 'flute' ? 'none' : 'flute');
        b.label.setText(`Flute: ${getLeadVoice() === 'flute' ? 'on' : 'off'}`);
      },
    ],
    ['Duck 30%', () => duckMusic(0.3, 1800)],
  ];
  musicItems.forEach(([label, fn], i) => {
    const bx = x0 + (i % cols) * (BW + GAP);
    const by = y + Math.floor(i / cols) * ROW;
    const b = makeBtn(bx, by, label, P.lavender, fn);
    if (i < MOODS.length) moodBtns.push([b, MOODS[i][1]]);
  });
  y += Math.ceil(musicItems.length / cols) * ROW + 26;

  // --- Ambience -------------------------------------------------------------
  heading(y, 'Ambience', P.powder);
  y += 22;
  let amb: AmbienceCtx | null = null;
  const ambBtns: Btn[] = [];
  const ambItems: [string, (b: Btn) => void][] = [
    ...AMBIENCE.map(([label, ctx]): [string, (b: Btn) => void] => [
      label,
      (b) => {
        amb = ctx;
        setAmbience(ctx);
        ambBtns.forEach((o) => setActive(o, o === b));
      },
    ]),
    ['Gust', () => windGust(1)],
  ];
  ambItems.forEach(([label, fn], i) => {
    const bx = x0 + (i % cols) * (BW + GAP);
    const by = y + Math.floor(i / cols) * ROW;
    const b = makeBtn(bx, by, label, P.powder, fn);
    if (i < AMBIENCE.length) ambBtns.push(b);
  });
  y += Math.ceil(ambItems.length / cols) * ROW;

  txt(scene, x0, Math.min(700, y + 18), 'Every sound here is made in code. Music crossfades over 4 s; dropped-in music files take over automatically.', 'small', {
    align: 'left',
    size: 16,
    color: shade(P.lavender, 0.3),
  });

  // Live status, meter and per-frame ambience (exercises the every-frame path).
  let lvl = 0;
  let acc = 0;
  const update = (_t: number, dt: number) => {
    if (amb) setAmbience(amb);
    const target = Math.min(1, audioLevel() * 7);
    lvl += (target - lvl) * Math.min(1, dt / 90);
    bars.forEach((g, i) => {
      const k = (i + 1) / BARS;
      g.scaleY = 0.12 + 0.88 * Math.max(0, Math.min(1, (lvl - k * 0.55) / 0.45 + k * 0.2));
    });
    acc += dt;
    if (acc < 250) return;
    acc = 0;
    const s = audioState();
    if (!s.supported) status.setText('Web Audio is not available here');
    else if (!s.unlocked) status.setText('Tap anywhere to wake the audio');
    else {
      const src = s.musicSource === 'file' ? 'file' : s.musicSource === 'score' ? 'code score' : 'silent';
      status.setText(`Audio on  ·  music: ${s.mood} (${src})`);
    }
    moodBtns.forEach(([b, m]) => setActive(b, s.unlocked && s.mood === m));
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, update));
}

function setActive(b: Btn, on: boolean): void {
  if (b.active === on) return;
  b.active = on;
  drawBtn(b, false);
}

function drawBtn(b: Btn, pressed: boolean): void {
  const { g, w, h } = b;
  const r = 20;
  const fill = b.active ? tint(P.butter, 0.25) : tint(b.accent, pressed ? 0.25 : 0.55);
  const edge = shade(b.active ? P.butter : b.accent, 0.18);
  g.clear();
  // Soft ink-tinted shadow (two passes stand in for a blur).
  g.fillStyle(hexToInt(P.ink), 0.06);
  g.fillRoundedRect(-w / 2 - 1, -h / 2 + 3, w + 2, h + 3, r + 1);
  g.fillStyle(hexToInt(P.ink), 0.09);
  g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 1 : 4), w, h, r);
  g.fillStyle(hexToInt(fill), 1);
  g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 1 : 0), w, h, r);
  // A cream highlight along the top.
  g.fillStyle(hexToInt(P.cream), 0.22);
  g.fillRoundedRect(-w / 2 + 8, -h / 2 + 4 + (pressed ? 1 : 0), w - 16, h * 0.28, { tl: 12, tr: 12, bl: 10, br: 10 });
  g.lineStyle(2, hexToInt(edge), 1);
  g.strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 1 : 0), w, h, r);
  if (b.active) {
    g.fillStyle(hexToInt(P.ember), 0.9);
    g.fillCircle(w / 2 - 14, -h / 2 + 14, 4);
  }
  b.label.setY(pressed ? 1 : 0);
}
