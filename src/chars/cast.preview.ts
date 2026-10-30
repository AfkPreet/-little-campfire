/**
 * Dev preview for Boju, Kopila and the Bud Bush.
 *   ?scene=preview&what=cast&show=sheet  (default) everything at real size + night copies
 *   ?show=boju    Boju idling, then pourChiya, then surprisedScale (loops)
 *   ?show=bush    Bud Bush loop: peek -> hide -> one-eye blink -> emerge
 *   ?show=zoom    Kopila + ball + bush at 3x for detail checks
 *   &night=1      tint everything with LIGHT_PRESETS.night().actor on an indigo ground
 */
import Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { layout } from '@/core/layout';
import { LIGHT_PRESETS } from '@/fx/lighting';
import { A, P, hexToInt, mix } from '@/palette';
import { txt } from '@/ui/text';
import { Boju, type BojuExpr } from './Boju';
import { BudBush, Kopila, type KopilaMode } from './Kopila';

type Tickable = { tick(time: number, delta: number): void; setLightTint?(c: number): unknown };

const MODES: KopilaMode[] = ['stand', 'follow', 'peek', 'curled', 'sitDock', 'sleepFire', 'nibble', 'wiggle', 'roll', 'hidden'];

function label(scene: Phaser.Scene, x: number, y: number, s: string): void {
  txt(scene, x, y, s, 'small', { color: mix(P.ink, P.cream, 0.25), size: 15, fixed: true });
}

/** A strip of ground to stand things on. */
function ground(scene: Phaser.Scene, x0: number, x1: number, y: number, night = false): void {
  const g = scene.add.graphics();
  g.fillStyle(hexToInt(night ? mix(P.moss, '#2F3558', 0.55) : mix(P.sage, P.cream, 0.35)), 1);
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

/** A simple shop-wood counter edge drawn in front of Boju. */
function counter(scene: Phaser.Scene, x0: number, x1: number, y: number): void {
  const wood = A['shop-wood'];
  const g = scene.add.graphics().setDepth(10);
  g.fillStyle(hexToInt(mix(wood, P.bark, 0.25)), 1);
  g.fillRoundedRect(x0, y, x1 - x0, 30, 6);
  g.fillStyle(hexToInt(wood), 1);
  g.fillRoundedRect(x0, y - 2, x1 - x0, 9, 4);
  g.lineStyle(2, hexToInt(mix(wood, P.bark, 0.6)), 1);
  g.strokeRoundedRect(x0, y - 2, x1 - x0, 32, 6);
  g.lineStyle(1.5, hexToInt(mix(wood, P.bark, 0.45)), 0.6);
  g.lineBetween(x0 + 8, y + 17, x1 - 8, y + 17);
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
    g.fillStyle(hexToInt('#2F3558'), 1);
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

  // Kopila beside Tuki's 104 px height marker.
  const mx = 420;
  const g = scene.add.graphics();
  g.lineStyle(2, hexToInt(P.rose), 1);
  g.lineBetween(mx, by, mx, by - 104);
  g.lineBetween(mx - 8, by - 104, mx + 8, by - 104);
  g.lineBetween(mx - 8, by - 48, mx + 8, by - 48);
  const km = new Kopila(scene, mx + 30, by);
  km.lookAt(mx);
  ticks.push(km);
  label(scene, mx + 10, by + 30, '104 / 48 px');

  // Night copies.
  const nx = 560;
  const g2 = scene.add.graphics();
  g2.fillStyle(hexToInt('#2F3558'), 1);
  g2.fillRoundedRect(nx - 20, by - 130, Math.min(420, l.w - nx), 170, 20);
  ground(scene, nx - 10, nx + Math.min(400, l.w - nx - 20), by + 2, true);
  const nb = new BudBush(scene, nx + 70, by);
  nb.setLightTint(night.actor);
  nb.peek(true);
  nb.lookAt(nx + 300);
  ticks.push(nb);
  const nk = new Kopila(scene, nx + 190, by);
  nk.setLightTint(night.actor);
  ticks.push(nk);
  const nk2 = new Kopila(scene, nx + 260, by);
  nk2.setLightTint(night.actor);
  nk2.setMode('sleepFire');
  ticks.push(nk2);
  const nb2 = new BudBush(scene, nx + 340, by);
  nb2.setLightTint(night.actor);
  void nb2.hide();
  ticks.push(nb2);
  label(scene, nx + 190, by + 30, 'night');
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
  counter(scene, 40, l.w - 40, cy);
  const status = txt(scene, l.w / 2, cy + 60, '', 'small', { color: P.cream, size: 18, fixed: true }).setDepth(11);
  b.onClick = () => status.setText('click');
  const cycle = async () => {
    status.setText('idle');
    await new Promise((r) => scene.time.delayedCall(2500, r));
    status.setText('talk');
    b.talk(2200);
    await new Promise((r) => scene.time.delayedCall(2600, r));
    status.setText('pourChiya');
    await b.pourChiya();
    await new Promise((r) => scene.time.delayedCall(1500, r));
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
  const cycle = async () => {
    b.reset();
    b.peek(true);
    b.lookAt(l.w);
    await new Promise((r) => scene.time.delayedCall(3200, r));
    await b.hide();
    await new Promise((r) => scene.time.delayedCall(7000, r));
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
}
