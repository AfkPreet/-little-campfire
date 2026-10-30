/**
 * Dev preview for Boju, Kopila and the Bud Bush.
 *   ?scene=preview&what=cast&show=sheet  (default) everything at real size + night copies
 *   ?show=boju    Boju idling, then pourChiya, then surprisedScale (loops)
 *   ?show=bush    Bud Bush loop: peek -> hide -> one-eye blink -> emerge
 *   ?show=zoom    Kopila + ball + bush at 3x for detail checks
 *   &night=1      tint everything with LIGHT_PRESETS.night().actor on an indigo ground
 *   &step=pour|scale|talk   (show=boju) start the loop at that beat
 *   &freeze=MS    pause the scene after MS on the tween clock (deterministic screenshots)
 *   &freeze=tea   (show=boju) pause mid-pour, stream showing
 *   &freeze=eye   (show=bush) pause while the hidden 4th bud has its eye open
 */
import Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { ART_SCALE, layout } from '@/core/layout';
import { LIGHT_PRESETS } from '@/fx/lighting';
import { A, LIGHT, P, hexToInt, mix } from '@/palette';
import { txt } from '@/ui/text';
import { Boju, type BojuExpr } from './Boju';
import { BudBush, Kopila, type KopilaMode } from './Kopila';

const NIGHT_SKY = LIGHT.night.skyTop;

type Tickable = { tick(time: number, delta: number): void; setLightTint?(c: number): unknown };

const MODES: KopilaMode[] = ['stand', 'follow', 'peek', 'curled', 'sitDock', 'sleepFire', 'nibble', 'wiggle', 'roll', 'hidden'];

function label(scene: Phaser.Scene, x: number, y: number, s: string): void {
  txt(scene, x, y, s, 'small', { color: mix(P.ink, P.cream, 0.25), size: 15, fixed: true });
}

/** A strip of ground to stand things on. */
function ground(scene: Phaser.Scene, x0: number, x1: number, y: number, night = false): void {
  const g = scene.add.graphics();
  g.fillStyle(hexToInt(night ? mix(P.moss, NIGHT_SKY, 0.55) : mix(P.sage, P.cream, 0.35)), 1);
  g.fillRoundedRect(x0, y - 2, x1 - x0, 16, 8);
}

/** A simple dock edge for sitDock. */
function dockEdge(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics();
  g.fillStyle(hexToInt(A['shop-wood']), 1);
  g.fillRoundedRect(x - 30, y, 60, 14, 5);
  g.lineStyle(2, hexToInt(mix(A['shop-wood'], P.bark, 0.6)), 1);
  g.strokeRoundedRect(x - 30, y, 60, 14, 5);
}

/** Multiply a colour int by a light tint int (what setTint does to sprites). */
function lit(c: number, tint: number): number {
  const ch = (sh: number) => Math.round((((c >> sh) & 255) * ((tint >> sh) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A simple shop-wood counter edge drawn in front of Boju (h = depth of the board). */
function counter(scene: Phaser.Scene, x0: number, x1: number, y: number, tint = 0xffffff, h = 30): void {
  const wood = A['shop-wood'];
  const c = (hex: string) => lit(hexToInt(hex), tint);
  const g = scene.add.graphics().setDepth(10);
  const r = Math.min(6, h / 3);
  g.fillStyle(c(mix(wood, P.bark, 0.25)), 1);
  g.fillRoundedRect(x0, y + 2, x1 - x0, h, r);
  g.fillStyle(c(wood), 1);
  g.fillRoundedRect(x0, y + 2, x1 - x0, h * 0.3, Math.min(4, r));
  g.lineStyle(2, c(mix(wood, P.bark, 0.6)), 1);
  g.strokeRoundedRect(x0, y + 2, x1 - x0, h, r);
  g.lineStyle(1.5, c(mix(wood, P.bark, 0.45)), 0.6);
  g.lineBetween(x0 + 8, y + 2 + h * 0.5, x1 - 8, y + 2 + h * 0.5);
}

const EXPRS: BojuExpr[] = ['smile', 'happy', 'talking', 'surprised'];

function sheet(scene: Phaser.Scene, ticks: Tickable[]): void {
  const l = layout();
  const night = LIGHT_PRESETS.night();

  // Boju row: four expressions at real size behind a counter.
  const cy = 286;
  const bstep = 250;
  const count = l.w > 1300 ? 5 : 4;
  const bx0 = l.w / 2 - ((count - 1) * bstep) / 2;
  for (let i = 0; i < count; i++) {
    const b = new Boju(scene, bx0 + i * bstep, cy).setDepth(1);
    if (i < 4) b.setExpression(EXPRS[i]);
    else b.setLightTint(night.actor);
    ticks.push(b);
  }
  if (count === 5) {
    const g = scene.add.graphics().setDepth(0.5);
    g.fillStyle(hexToInt(NIGHT_SKY), 1);
    g.fillRoundedRect(bx0 + 4 * bstep - 125, 8, 250, cy, 20);
  }
  counter(scene, 16, l.w - 16, cy);
  for (let i = 0; i < count; i++) {
    txt(scene, bx0 + i * bstep, cy + 16, i < 4 ? EXPRS[i] : 'night', 'small', { color: P.ink, size: 15, fixed: true }).setDepth(11);
  }

  // Kopila modes row.
  const rowY = 420;
  const step = Math.min(96, (l.w - 80) / MODES.length);
  const x0 = 40 + step / 2;
  ground(scene, 20, l.w - 20, rowY + 2);
  MODES.forEach((m, i) => {
    const x = x0 + i * step;
    if (m === 'sitDock') dockEdge(scene, x, rowY - 12);
    const k = new Kopila(scene, x, m === 'sitDock' ? rowY - 12 : rowY);
    k.setMode(m);
    if (m === 'roll') scene.time.addEvent({ delay: 2600, loop: true, callback: () => k.setPosition(x, rowY).setMode('roll') });
    if (m === 'follow') {
      let dir = 1;
      k.walkTo(x + 20);
      scene.time.addEvent({ delay: 1400, loop: true, callback: () => { dir = -dir; k.walkTo(x + dir * 20); } });
    }
    k.lookAt(l.w / 2);
    ticks.push(k);
    label(scene, x, rowY + 30, m);
  });

  // Bushes + height marker + night copies.
  const by = 640;
  ground(scene, 20, l.w - 20, by + 2);
  const b1 = new BudBush(scene, 110, by);
  b1.peek(true);
  b1.lookAt(400);
  ticks.push(b1);
  label(scene, 110, by + 30, 'bush: peek');
  const b2 = new BudBush(scene, 280, by);
  void b2.hide();
  ticks.push(b2);
  label(scene, 280, by + 30, 'bush: 4th bud');

  // Kopila beside Tuki's 104 px height marker (live: crown flick + scale wave).
  const mx = 420;
  const g = scene.add.graphics();
  g.lineStyle(2, hexToInt(P.rose), 1);
  g.lineBetween(mx, by, mx, by - 104);
  g.lineBetween(mx - 8, by - 104, mx + 8, by - 104);
  g.lineBetween(mx - 8, by - 48, mx + 8, by - 48);
  const km = new Kopila(scene, mx + 30, by);
  km.lookAt(mx);
  ticks.push(km);
  let flick = false;
  scene.time.addEvent({ delay: 1700, loop: true, callback: () => ((flick = !flick) ? km.flickCrown() : km.scaleWave()) });
  label(scene, mx + 10, by + 30, '104 / 48 px');

  // Night copies (LIGHT_PRESETS.night().actor) on an indigo panel.
  const nx = 560;
  const right = l.w - 20;
  const top = by - 168;
  const g2 = scene.add.graphics();
  g2.fillStyle(hexToInt(NIGHT_SKY), 1);
  g2.fillRoundedRect(nx - 20, top, right - (nx - 20), by + 44 - top, 20);
  ground(scene, nx - 10, right - 10, by + 2, true);
  const nb = new BudBush(scene, nx + 70, by);
  nb.setLightTint(night.actor);
  nb.peek(true);
  nb.lookAt(nx + 300);
  ticks.push(nb);
  const nk = new Kopila(scene, nx + 172, by);
  nk.setLightTint(night.actor);
  nk.lookAt(nx + 300);
  ticks.push(nk);
  const nk2 = new Kopila(scene, nx + 226, by);
  nk2.setLightTint(night.actor);
  nk2.setMode('sleepFire');
  ticks.push(nk2);
  let cx = nx + 260;
  if (count < 5) {
    // Boju has no room for a real-size night copy in the top row: half size here.
    const s = 0.5;
    const bxN = cx + 80;
    const cyN = by - 26;
    const nbj = new Boju(scene, bxN, cyN).setScale(s).setDepth(1);
    nbj.setLightTint(night.actor);
    ticks.push(nbj);
    counter(scene, bxN - 72, bxN + 72, cyN, night.actor, 14);
    cx = bxN + 80;
  }
  if (right - cx > 150) {
    const nb2 = new BudBush(scene, cx + 75, by);
    nb2.setLightTint(night.actor);
    void nb2.hide();
    ticks.push(nb2);
    cx += 160;
  }
  // Wide screens: fill the rest of the panel with more night modes.
  const extra: KopilaMode[] = ['nibble', 'wiggle', 'curled', 'follow', 'stand'];
  for (let i = 0; cx + 70 < right && i < extra.length; i++, cx += 64) {
    const k = new Kopila(scene, cx + 40, by);
    k.setMode(extra[i]);
    k.setLightTint(night.actor);
    k.lookAt(nx);
    ticks.push(k);
  }
  txt(scene, (nx - 20 + right) / 2, by + 30, 'night', 'small', { color: mix(P.cream, NIGHT_SKY, 0.15), size: 15, fixed: true }).setDepth(11);
}

function zoom(scene: Phaser.Scene, ticks: Tickable[]): void {
  const z = 3;
  const k = new Kopila(scene, 160, 360);
  k.setScale(z);
  k.lookAt(600);
  ticks.push(k);
  const k2 = new Kopila(scene, 340, 360);
  k2.setScale(z);
  k2.setMode('curled');
  ticks.push(k2);
  const k3 = new Kopila(scene, 520, 360);
  k3.setScale(z);
  k3.setMode('sitDock');
  ticks.push(k3);
  const k4 = new Kopila(scene, 700, 360);
  k4.setScale(z);
  k4.setMode('wiggle');
  ticks.push(k4);
  const b = new BudBush(scene, 300, 660);
  b.setScale(2.2);
  b.peek(true);
  b.lookAt(900);
  ticks.push(b);
  const b2 = new BudBush(scene, 700, 660);
  b2.setScale(2.2);
  void b2.hide();
  ticks.push(b2);
}

function bojuLoop(scene: Phaser.Scene, ticks: Tickable[]): void {
  const l = layout();
  const cy = 520;
  const b = new Boju(scene, l.w / 2, cy);
  b.setScale(1.6);
  ticks.push(b);
  if (anyParam('freeze') === 'tea') {
    // Pause mid-pour (stream showing, glass ~60% full) for a deterministic shot.
    const peek = b as unknown as { stream: Phaser.GameObjects.Image; tea: Phaser.GameObjects.Image };
    const fn = () => {
      const t = peek.tea;
      if (peek.stream.visible && t.isCropped && t.frame && (t as unknown as { _crop: { height: number } })._crop.height > t.frame.height * 0.45) {
        scene.events.off('update', fn);
        scene.scene.pause();
      }
    };
    scene.events.on('update', fn);
  }
  counter(scene, 40, l.w - 40, cy);
  const status = txt(scene, l.w / 2, cy + 70, '', 'small', { color: P.ink, size: 18, fixed: true }).setDepth(11);
  b.onClick = () => status.setText('click');
  let step = anyParam('step') ?? '';
  const pause = (ms: number) => new Promise((r) => scene.time.delayedCall(ms, r));
  const cycle = async () => {
    if (step !== 'pour' && step !== 'scale') {
      if (step !== 'talk') {
        status.setText('idle');
        await pause(2500);
      }
      status.setText('talk');
      b.talk(2200);
      await pause(2600);
    }
    if (step !== 'scale') {
      status.setText('pourChiya');
      await b.pourChiya();
      await pause(1500);
    }
    step = '';
    status.setText('surprisedScale');
    await b.surprisedScale();
    await new Promise((r) => scene.time.delayedCall(3500, r));
    b.hideChiya();
    status.setText('nod');
    b.nod();
    await new Promise((r) => scene.time.delayedCall(2000, r));
    void cycle();
  };
  void cycle();
}

function bushLoop(scene: Phaser.Scene, ticks: Tickable[]): void {
  const l = layout();
  ground(scene, 40, l.w - 40, 520);
  const b = new BudBush(scene, l.w / 2, 520);
  b.setScale(2);
  ticks.push(b);
  if (anyParam('freeze') === 'eye') {
    // Pause while the hidden 4th bud has its one eye open.
    const peek = b as unknown as { hideEye: Phaser.GameObjects.Image; st: string };
    const fn = () => {
      if (peek.st === 'hidden' && peek.hideEye.scaleY >= 0.95 / ART_SCALE) {
        scene.events.off('update', fn);
        scene.scene.pause();
      }
    };
    scene.events.on('update', fn);
  }
  const cycle = async () => {
    b.reset();
    b.peek(true);
    b.lookAt(l.w);
    const fast = anyParam('fast') === '1';
    await new Promise((r) => scene.time.delayedCall(fast ? 1200 : 3200, r));
    await b.hide();
    await new Promise((r) => scene.time.delayedCall(fast ? 1200 : 7000, r));
    await b.emerge();
    await new Promise((r) => scene.time.delayedCall(1800, r));
    void cycle();
  };
  void cycle();
}

export default function preview(scene: Phaser.Scene): void {
  const show = anyParam('show') ?? 'sheet';
  const ticks: Tickable[] = [];
  if (show === 'zoom') zoom(scene, ticks);
  else if (show === 'bush') bushLoop(scene, ticks);
  else if (show === 'boju') bojuLoop(scene, ticks);
  else sheet(scene, ticks);
  if (anyParam('night') === '1') {
    // (pass &bg=%232F3558 for an indigo backdrop)
    const c = LIGHT_PRESETS.night().actor;
    for (const o of ticks) o.setLightTint?.(c);
  }
  scene.events.on('update', (t: number, d: number) => {
    for (const o of ticks) o.tick(t, d);
  });
  // For headless probes (dev preview only).
  (window as unknown as { __castTicks?: Tickable[] }).__castTicks = ticks;
  const freeze = Number(anyParam('freeze') ?? 0);
  // Counted on the tween clock (it runs apart from scene.time under load).
  if (freeze > 0) scene.tweens.addCounter({ from: 0, to: 1, duration: freeze, onComplete: () => scene.scene.pause() });
}
