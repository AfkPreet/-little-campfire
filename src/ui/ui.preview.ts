/**
 * UI kit style sheet: every component and icon on a soft dawn sky.
 * ?scene=preview&what=ui            the sheet
 * &demo=toasts|banner|dialog|bubbles  also trigger the live managers / modal
 * The sheet is designed on a 1480 x 1000 canvas and scaled to fit.
 */
import Phaser from 'phaser';
import { anyParam } from '@/core/debug';
import { ART_SCALE, layout } from '@/core/layout';
import { Baker, bakeAll, artObj, ellipsePath, eye, blush, mouth, fillOutline, rGrad, vGrad, withState, roundRectPath, glowDisc } from '@/art/kit';
import { ICONS, UI_INK, UI_INK_SOFT, iconObj } from '@/art/ui';
import { LIGHT, P, hexToInt, mix, rgba, shade } from '@/palette';
import { Banner, BannerManager } from './Banner';
import { BubbleGroup } from './Bubble';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { IconButton } from './IconButton';
import { Slider } from './Slider';
import { Stepper } from './Stepper';
import { Tabs } from './Tabs';
import { Toast, ToastManager } from './Toast';
import { Toggle } from './Toggle';
import { txtObj } from './text';

const DW = 1480;
const DH = 1000;

async function bakePreviewArt(scene: Phaser.Scene): Promise<void> {
  if (scene.textures.exists('preview.fish')) return;
  const b = new Baker();
  // A little pebble minnow for the catch card (preview-only art).
  b.tex('preview.fish', 150, 96, (ctx) => {
    const body = mix(P.powder, P.sage, 0.25);
    // Tail.
    ctx.beginPath();
    ctx.moveTo(34, 48);
    ctx.bezierCurveTo(22, 34, 12, 26, 8, 30);
    ctx.bezierCurveTo(12, 40, 14, 56, 8, 66);
    ctx.bezierCurveTo(12, 70, 22, 62, 34, 48);
    ctx.closePath();
    fillOutline(ctx, vGrad(ctx, 26, 70, [[0, mix(body, P.cream, 0.3)], [1, mix(body, P.lavender, 0.3)]]), body);
    // Top fin.
    ctx.beginPath();
    ctx.moveTo(64, 26);
    ctx.quadraticCurveTo(80, 10, 98, 24);
    ctx.lineTo(96, 30);
    ctx.closePath();
    fillOutline(ctx, mix(body, P.lavender, 0.25), body);
    // Body.
    ctx.beginPath();
    ellipsePath(ctx, 82, 50, 52, 30);
    fillOutline(
      ctx,
      rGrad(ctx, 92, 38, 4, 60, [
        [0, mix(body, P.cream, 0.55)],
        [0.6, body],
        [1, mix(body, P.lavender, 0.35)],
      ]),
      body,
    );
    // Belly.
    withState(ctx, () => {
      ctx.beginPath();
      ellipsePath(ctx, 82, 50, 52, 30);
      ctx.clip();
      ctx.beginPath();
      ellipsePath(ctx, 88, 72, 46, 16);
      ctx.fillStyle = rgba(P.cream, 0.6);
      ctx.fill();
      // Pebble spots.
      for (const [x, y, r] of [
        [60, 40, 4],
        [70, 33, 3],
        [52, 52, 3.2],
        [66, 50, 2.4],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(shade(body, 0.15), 0.5);
        ctx.fill();
      }
    });
    // Side fin.
    ctx.beginPath();
    ctx.ellipse(80, 58, 9, 5, 0.5, 0, Math.PI * 2);
    fillOutline(ctx, mix(body, P.cream, 0.2), body, 2);
    eye(ctx, 114, 44, 5.2, 6.2, 0.3);
    blush(ctx, 112, 57, 6, 3.6, 0.65);
    mouth(ctx, 125, 53, 5, 'smile', 1.8);
    ctx.beginPath();
    ctx.ellipse(96, 30, 7, 3, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = rgba(P.cream, 0.7);
    ctx.fill();
  });
  // A mini campfire for the bubble demo (preview-only art).
  b.tex('preview.fire', 150, 120, (ctx) => {
    glowDisc(ctx, 75, 70, 58, P.glow, 0.35);
    // Logs.
    for (const [rot, y] of [
      [0.32, 92],
      [-0.32, 92],
    ] as [number, number][]) {
      withState(ctx, () => {
        ctx.translate(75, y);
        ctx.rotate(rot);
        ctx.beginPath();
        roundRectPath(ctx, -42, -8, 84, 16, 8);
        fillOutline(ctx, vGrad(ctx, -8, 8, [[0, mix(P.bark, P.cream, 0.2)], [1, P.bark]]), P.bark);
        ctx.beginPath();
        ctx.ellipse(rot > 0 ? 38 : -38, 0, 5, 7.5, 0, 0, Math.PI * 2);
        fillOutline(ctx, mix(P.butter, P.bark, 0.25), P.bark, 2);
      });
    }
    // Flame.
    ctx.beginPath();
    ctx.moveTo(75, 22);
    ctx.bezierCurveTo(96, 46, 100, 66, 90, 80);
    ctx.quadraticCurveTo(75, 92, 60, 80);
    ctx.bezierCurveTo(50, 66, 56, 46, 75, 22);
    ctx.closePath();
    fillOutline(ctx, vGrad(ctx, 22, 90, [[0, P.ember], [1, mix(P.ember, P.glow, 0.4)]]), P.ember);
    ctx.beginPath();
    ctx.moveTo(75, 46);
    ctx.bezierCurveTo(86, 58, 88, 70, 82, 78);
    ctx.quadraticCurveTo(75, 84, 68, 78);
    ctx.bezierCurveTo(62, 70, 64, 58, 75, 46);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, 46, 82, [[0, P.glow], [1, mix(P.glow, P.cream, 0.6)]]);
    ctx.fill();
    // Stones.
    for (const [x, rx] of [
      [34, 13],
      [56, 12],
      [94, 12],
      [116, 13],
    ]) {
      ctx.beginPath();
      ellipsePath(ctx, x, 104, rx, 9);
      fillOutline(ctx, vGrad(ctx, 95, 113, [[0, mix(P.lavender, P.cream, 0.35)], [1, mix(P.lavender, P.bark, 0.2)]]), P.lavender);
    }
  });
  // A water window for the catch card portrait.
  b.tex('preview.water', 252, 124, (ctx, w, h) => {
    const r = 16;
    withState(ctx, () => {
      ctx.beginPath();
      roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
      ctx.clip();
      ctx.fillStyle = vGrad(ctx, 0, h, [
        [0, mix(P.powder, P.cream, 0.55)],
        [0.7, mix(P.powder, P.cream, 0.2)],
        [1, mix(P.powder, P.lavender, 0.3)],
      ]);
      ctx.fillRect(0, 0, w, h);
      // Light ripples.
      ctx.strokeStyle = rgba(P.cream, 0.55);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const [x, y, len] of [
        [30, 26, 34],
        [176, 20, 46],
        [200, 92, 30],
        [44, 100, 24],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 4, y - 3, x + len / 2, y);
        ctx.quadraticCurveTo(x + (len * 3) / 4, y + 3, x + len, y);
        ctx.stroke();
      }
      // Pebbles on the bed.
      for (const [x, rx, c] of [
        [26, 16, P.sage],
        [58, 11, P.lavender],
        [196, 14, P.lavender],
        [226, 18, P.sage],
      ] as [number, number, string][]) {
        ctx.beginPath();
        ellipsePath(ctx, x, h - 4, rx, 9);
        ctx.fillStyle = mix(c, P.powder, 0.35);
        ctx.fill();
      }
      // Inner top shadow.
      ctx.fillStyle = vGrad(ctx, 0, 10, [
        [0, P.ink, 0.12],
        [1, P.ink, 0],
      ]);
      ctx.fillRect(0, 0, w, 10);
    });
    ctx.beginPath();
    roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = shade(mix(P.powder, P.cream, 0.3), 0.22);
    ctx.stroke();
  });
  // A tiny dusk scene, dimmed by an ink scrim, behind the modal demo (shown at 2x).
  b.tex('preview.scene', 372, 205, (ctx, w, h) => {
    const k = LIGHT.dusk;
    withState(ctx, () => {
      ctx.beginPath();
      roundRectPath(ctx, 1, 1, w - 2, h - 2, 10);
      ctx.clip();
      ctx.fillStyle = vGrad(ctx, 0, h, [
        [0, k.skyTop],
        [0.62, k.horizon],
        [1, mix(k.horizon, P.peach, 0.3)],
      ]);
      ctx.fillRect(0, 0, w, h);
      glowDisc(ctx, w * 0.92, h * 0.17, 24, P.glow, 0.5);
      ctx.beginPath();
      ctx.arc(w * 0.92, h * 0.17, 8, 0, Math.PI * 2);
      ctx.fillStyle = mix(P.butter, P.cream, 0.5);
      ctx.fill();
      const ridge = (y0: number, amp: number, col: string, seed: number) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = y0 + Math.sin(x * 0.018 + seed) * amp + Math.sin(x * 0.047 + seed * 2) * amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      };
      ridge(h * 0.58, 10, mix(k.far, k.horizon, 0.25), 1);
      ridge(h * 0.7, 8, mix(P.lavender, k.mid, 0.5), 3);
      ridge(h * 0.84, 6, mix(P.moss, k.near, 0.55), 5);
      // A little tent and its glow.
      glowDisc(ctx, w * 0.075, h * 0.82, 24, P.glow, 0.45);
      ctx.beginPath();
      ctx.moveTo(w * 0.075 - 18, h * 0.88);
      ctx.quadraticCurveTo(w * 0.075 - 4, h * 0.7, w * 0.075, h * 0.66);
      ctx.quadraticCurveTo(w * 0.075 + 4, h * 0.7, w * 0.075 + 18, h * 0.88);
      ctx.closePath();
      ctx.fillStyle = mix(P.peach, k.actor, 0.4);
      ctx.fill();
      // Scrim (ink-tinted, never black).
      ctx.fillStyle = rgba(P.ink, 0.36);
      ctx.fillRect(0, 0, w, h);
    });
    ctx.beginPath();
    roundRectPath(ctx, 1, 1, w - 2, h - 2, 10);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(P.ink, 0.35);
    ctx.stroke();
  });
  await bakeAll(scene.textures, b);
}

function background(scene: Phaser.Scene): void {
  const l = layout();
  const k = LIGHT.dawn;
  const g = scene.add.graphics();
  const top = hexToInt(mix(k.skyTop, P.lavender, 0.2));
  const mid = hexToInt(mix(k.skyTop, k.horizon, 0.55));
  const bot = hexToInt(mix(k.horizon, P.cream, 0.35));
  const h1 = l.h * 0.55;
  g.fillGradientStyle(top, top, mid, mid, 1);
  g.fillRect(0, 0, l.w, h1 + 1);
  g.fillGradientStyle(mid, mid, bot, bot, 1);
  g.fillRect(0, h1, l.w, l.h - h1);
  // Soft sun glow, mist and a few twinkles.
  artObj(scene, l.w * 0.82, l.h * 0.08, 'glow').setTint(hexToInt(P.glow)).setAlpha(0.45).setScale(3.2 / ART_SCALE).setBlendMode(Phaser.BlendModes.ADD);
  const mists: [number, number, number, number][] = [
    [0.12, 0.62, 2.2, 0.35],
    [0.55, 0.78, 2.8, 0.3],
    [0.9, 0.5, 2.0, 0.28],
    [0.35, 0.3, 1.8, 0.18],
  ];
  for (const [x, y, s, a] of mists) {
    artObj(scene, l.w * x, l.h * y, 'mistBlob').setTint(hexToInt(P.cream)).setAlpha(a).setScale(s / ART_SCALE);
  }
  const rnd = new Phaser.Math.RandomDataGenerator(['ui-sheet']);
  for (let i = 0; i < 26; i++) {
    const sp = artObj(scene, rnd.between(0, l.w), rnd.between(0, l.h), i % 3 ? 'dot' : 'sparkle');
    sp.setTint(hexToInt(i % 2 ? P.glow : P.cream)).setAlpha(rnd.realInRange(0.25, 0.6)).setScale(rnd.realInRange(0.3, 0.7) / ART_SCALE);
    scene.tweens.add({ targets: sp, alpha: 0.1, duration: rnd.between(1400, 2600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rnd.between(0, 1500) });
  }
}

function caption(scene: Phaser.Scene, sheet: Phaser.GameObjects.Container, x: number, y: number, text: string): void {
  const t = txtObj(scene, x, y, text, 'hand', { color: UI_INK, size: 24, align: 'left', fixed: true });
  t.setAlpha(0.62);
  sheet.add(t);
}

export default async function preview(scene: Phaser.Scene): Promise<void> {
  await bakePreviewArt(scene);
  background(scene);
  const l = layout();
  const s = Math.min(l.w / DW, l.h / DH);
  const sheet = scene.add.container((l.w - DW * s) / 2, (l.h - DH * s) / 2).setScale(s);
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    sheet.add(o);
    return o;
  };
  const toasts = new ToastManager(scene);
  const banners = new BannerManager(scene);

  const M = 40;
  const G = 28;

  // ---- Row A: banner, toast, HUD buttons -------------------------------
  const rowA = 78;
  const banner = new Banner(scene, 0, rowA, { text: 'Home sweet home!' });
  banner.setX(M + banner.bw / 2 - 6);
  add(banner);
  banner.twinkle();
  add(new Toast(scene, DW / 2 + 60, rowA - 12, { text: 'Caught a Pebble Minnow! (12 cm)', icon: 'icon.star' }));
  const hud = ['icon.backpack', 'icon.journal', 'icon.settings', 'icon.close'];
  hud.forEach((ic, i) => {
    add(
      new IconButton(scene, DW - M - 32 - (hud.length - 1 - i) * 78, rowA - 12, {
        icon: ic,
        size: 64,
        onTap: () => toasts.show(ic === 'icon.journal' ? 'Journal updated' : `Tapped ${ic.replace('icon.', '')}`, ic),
      }),
    );
  });

  // ---- Row B: catch card, settings, modal ---------------------------------
  const capB = 150;
  const topB = capB + 24;
  const cardH = 410;
  const colW = 300;
  const x1 = M + colW / 2;
  const x2 = M + colW + G + colW / 2;
  const x3l = M + (colW + G) * 2;
  const wide = DW - M - x3l;

  caption(scene, sheet, M + 6, capB, 'catch card');
  const catchCard = add(new Card(scene, x1, topB + cardH / 2, { w: colW, h: cardH, ribbon: 'NEW!' }));
  {
    const c = catchCard;
    const wellY = c.top + 90;
    c.add(artObj(scene, 0, wellY, 'preview.water'));
    c.add(artObj(scene, 2, wellY + 2, 'preview.fish').setScale(0.92 / ART_SCALE));
    c.add(txtObj(scene, 0, c.top + 188, 'Pebble Minnow', 'h2', { color: UI_INK }));
    c.add(txtObj(scene, 0, c.top + 222, '12 cm', 'body', { color: UI_INK_SOFT, size: 22 }));
    [true, true, false].forEach((f, i) => c.add(iconObj(scene, -40 + i * 40, c.top + 262, f ? 'icon.star' : 'icon.starEmpty', 36)));
    c.add(txtObj(scene, 0, c.top + 293, 'uncommon', 'small', { color: UI_INK_SOFT, size: 17 }));
    const bw = (colW - 48 - 14) / 2;
    const by = c.top + cardH - 52;
    c.add(new Button(scene, -bw / 2 - 7, by, { label: 'Keep', w: bw, onTap: () => toasts.show('Caught a Pebble Minnow! (12 cm)', 'icon.star') }));
    c.add(new Button(scene, bw / 2 + 7, by, { label: 'Let go', variant: 'secondary', w: bw, onTap: () => toasts.show('It slipped away... maybe next time!') }));
  }

  caption(scene, sheet, x2 - colW / 2 + 6, capB, 'settings');
  const settings = add(new Card(scene, x2, topB + cardH / 2, { w: colW, h: cardH, title: 'Settings' }));
  {
    const c = settings;
    const sw = colW - 64;
    c.add(new Slider(scene, 0, c.top + 132, { label: 'Music', icon: 'icon.music', value: 0.7, width: sw }));
    c.add(new Slider(scene, 0, c.top + 218, { label: 'Sounds', icon: 'icon.speaker', value: 0.42, width: sw }));
    c.add(new Toggle(scene, 0, c.top + 288, { label: 'Reduce motion', value: false, width: colW - 44 }));
    c.add(new Toggle(scene, 0, c.top + 354, { label: 'Large text', value: true, width: colW - 44 }));
  }

  caption(scene, sheet, x3l + 6, capB, 'modal');
  {
    const cx = x3l + wide / 2;
    const cy = topB + cardH / 2;
    const win = artObj(scene, cx, cy, 'preview.scene');
    win.setScale((wide / 372) / ART_SCALE, (cardH / 205) / ART_SCALE);
    add(win);
    const d = new Dialog(scene, cx, cy + 16, {
      title: 'Sure you\u2019re ready?',
      body: 'You haven\u2019t packed a rod yet.',
      cancel: 'Back to shopping',
      confirm: 'Head out anyway',
      icon: 'icon.backpack',
      width: 540,
      modal: false,
      onCancel: () => toasts.show('Back to shopping'),
      onConfirm: () => banners.show('Off to camp!'),
    });
    add(d);
  }

  // ---- Row C: bubbles, buttons, tabs + stepper ----------------------------
  const capC = topB + cardH + 30;
  const topC = capC + 24;
  const bubW = 360;
  const btnW = 246;
  const btnGap = 18;
  const xBtn = M + bubW + G;
  const xTab = xBtn + btnW * 2 + btnGap + G;
  const tabW = DW - M - xTab;

  caption(scene, sheet, M + 6, capC, 'action bubbles');
  {
    const fx = M + bubW / 2;
    const fy = topC + 222;
    add(artObj(scene, fx, fy + 4, 'soft').setTint(hexToInt(P.ink)).setAlpha(0.12).setScale(1.4 / ART_SCALE, 0.2 / ART_SCALE));
    add(artObj(scene, fx, fy - 52, 'preview.fire'));
    const g = new BubbleGroup(
      scene,
      fx,
      fy - 118,
      [
        { label: 'Cook', onTap: () => toasts.show('New recipe: Honey Tea!', 'icon.journal') },
        { label: 'Sit', onTap: () => toasts.show('Feeling cozy', 'icon.lanternLit') },
        { label: 'Share', icon: 'icon.heartFull', onTap: () => toasts.show('It nibbled the dish and looked very pleased.') },
      ],
      { closeOnTap: false, lift: 4, dip: 22, gap: 10 },
    );
    add(g);
  }

  caption(scene, sheet, xBtn + 6, capC, 'buttons');
  {
    const bx0 = xBtn + btnW / 2;
    const bx1 = bx0 + btnW + btnGap;
    const by0 = topC + 40;
    const dy = 80;
    add(new Button(scene, bx0, by0, { label: 'Begin your trip', w: btnW, onTap: () => banners.show('Home sweet home!') }));
    add(new Button(scene, bx1, by0, { label: 'Head to camp', variant: 'warm', icon: 'icon.arrowRight', iconSide: 'right', w: btnW }));
    add(new Button(scene, bx0, by0 + dy, { label: 'Continue', variant: 'secondary', w: btnW }));
    add(new Button(scene, bx1, by0 + dy, { label: 'Keep camping', variant: 'sage', w: btnW }));
    add(new Button(scene, bx0, by0 + dy * 2, { label: 'Skip', variant: 'quiet', w: btnW }));
    add(
      new Button(scene, bx1, by0 + dy * 2, {
        label: 'Buy  40',
        icon: 'icon.coin',
        w: btnW,
        disabled: true,
        onDisabledTap: () => toasts.show('Saving up for that one?', 'icon.coin'),
      }),
    );
  }

  caption(scene, sheet, xTab + 6, capC, 'tabs + stepper');
  {
    const tabs = new Tabs(scene, xTab + tabW / 2, topC + 42, { tabs: ['Camp', 'Fishing', 'Kitchen', 'Cozy'], selected: 1, minTabW: 92, gap: 6 });
    add(tabs);
    const rowCard = add(new Card(scene, xTab + tabW / 2, topC + 164, { w: tabW, h: 116, tint: 'butter' }));
    rowCard.add(artObj(scene, -tabW / 2 + 50, 4, 'preview.fish').setScale(0.44 / ART_SCALE));
    rowCard.add(txtObj(scene, -tabW / 2 + 90, -15, 'Pebble Minnow', 'label', { color: UI_INK, align: 'left' }));
    rowCard.add(iconObj(scene, -tabW / 2 + 103, 20, 'icon.coin', 26));
    rowCard.add(txtObj(scene, -tabW / 2 + 121, 21, '8 each', 'small', { color: UI_INK_SOFT, align: 'left' }));
    const st = new Stepper(scene, 0, 0, { value: 2, min: 1, max: 3, valueW: 58 });
    st.setX(tabW / 2 - st.sw / 2 - 18);
    rowCard.add(st);
  }

  // ---- Row D: icon shelf ---------------------------------------------------
  const rowD = topC + 300;
  const shelfW = DW - M * 2;
  const shelf = add(new Card(scene, DW / 2, rowD, { w: shelfW, h: 84 }));
  const shown = ICONS.filter((k) => k !== 'icon.lanternGlow');
  const step = (shelfW - 76) / (shown.length - 1);
  shown.forEach((k, i) => {
    const x = -shelfW / 2 + 38 + i * step;
    if (k === 'icon.lanternLit') {
      shelf.add(artObj(scene, x, 2, 'icon.lanternGlow').setScale(0.62 / ART_SCALE).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD));
    }
    shelf.add(iconObj(scene, x, 0, k, k === 'icon.ribbon' ? 60 : 44));
  });

  // ---- Live demos ------------------------------------------------------------
  const demo = anyParam('demo');
  if (demo === 'toasts') {
    toasts.show('Caught a Pebble Minnow! (12 cm)', 'icon.star');
    scene.time.delayedCall(300, () => toasts.show('New recipe: Honey Tea!', 'icon.journal'));
    scene.time.delayedCall(600, () => toasts.show('Journal updated'));
    scene.time.delayedCall(900, () => toasts.show('It slipped away... maybe next time!'));
  } else if (demo === 'banner') {
    banners.show('A shooting star! Make a wish.');
  } else if (demo === 'dialog') {
    Dialog.open(scene, {
      title: 'Start over?',
      body: 'Your gear and camp reset; your journal stays.',
      cancel: 'Keep camping',
      confirm: 'Start over',
      onConfirm: () => toasts.show('Starting a new trip'),
    });
  }
}
