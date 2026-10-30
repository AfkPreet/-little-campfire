/**
 * Modal confirm dialog (spec section 7: "Sure you're ready?" with
 * "Back to shopping" / "Head out anyway"). Dims the scene with a soft
 * ink-tinted scrim (never black) that swallows input beneath, and pops a
 * paper card in with easeOutBack. Esc cancels, Enter confirms.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { layout, onLayout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';
import { ART_SCALE } from '@/core/layout';
import { artObj } from '@/art/kit';
import { ROUND_D, UI_INK, UI_INK_SOFT, iconObj, type CardTint } from '@/art/ui';
import { P, hexToInt } from '@/palette';
import { Button, TEXT_NUDGE, type ButtonVariant } from './Button';
import { Card } from './Card';
import { txtObj } from './text';

export interface DialogOpts {
  title: string;
  body?: string;
  /** Confirm label (right, primary). */
  confirm: string;
  /** Cancel label (left, secondary). Omit for a single-button notice. */
  cancel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Optional icon in a round badge over the top edge. */
  icon?: string;
  /** Card width (default min(540, screen - 64)). */
  width?: number;
  tint?: CardTint;
  confirmVariant?: ButtonVariant;
  /** Full-screen scrim that blocks input (default true). */
  modal?: boolean;
  /** Tapping the scrim cancels (default false: it just blocks). */
  dismissOnScrim?: boolean;
  depth?: number;
}

export class Dialog extends Phaser.GameObjects.Container {
  readonly card: Card;
  private o: DialogOpts;
  private scrim?: Phaser.GameObjects.Image;
  private closing = false;
  private offLayout?: () => void;
  private keyHandler?: (e: KeyboardEvent) => void;

  /** Open a dialog centred on screen. */
  static open(scene: Phaser.Scene, opts: DialogOpts): Dialog {
    const l = layout();
    return new Dialog(scene, l.w / 2, l.h / 2, opts);
  }

  constructor(scene: Phaser.Scene, x: number, y: number, opts: DialogOpts) {
    super(scene, x, y);
    this.o = opts;
    const l = layout();
    const W = Math.round(opts.width ?? Math.min(540, l.w - 64));
    const pad = 36;
    const hasIcon = !!opts.icon;
    const topPad = hasIcon ? 66 : 40;

    // Measure content to size the card.
    const title = txtObj(scene, 0, 0, opts.title, 'h2', { color: UI_INK, align: 'center', wrap: W - pad * 2 });
    const body = opts.body ? txtObj(scene, 0, 0, opts.body, 'body', { color: UI_INK_SOFT, align: 'center', wrap: W - pad * 2, lineSpacing: 2 }) : undefined;
    const btnH = 64;
    const H = Math.round(topPad + title.height + (body ? 10 + body.height : 0) + 30 + btnH + 30);

    const depth = opts.depth ?? DEPTH.overlay;
    if (opts.modal !== false) {
      this.scrim = scene.add.image(0, 0, 'px').setOrigin(0).setScrollFactor(0).setDepth(depth - 1);
      this.scrim.setTint(hexToInt(P.ink)).setDisplaySize(l.w + 8, l.h + 8).setPosition(-4, -4).setAlpha(0);
      this.scrim.setInteractive();
      this.scrim.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation();
        if (opts.dismissOnScrim) this.close('cancel');
      });
      scene.tweens.add({ targets: this.scrim, alpha: 0.34, duration: 260, ease: EASE.out });
    }

    this.card = new Card(scene, 0, 0, { w: W, h: H, tint: opts.tint ?? 'cream', shadowAlpha: 0.2 });
    this.add(this.card);
    let yy = -H / 2 + topPad;
    title.setPosition(0, yy + title.height / 2 + TEXT_NUDGE);
    this.card.add(title);
    yy += title.height;
    if (body) {
      yy += 10;
      body.setPosition(0, yy + body.height / 2);
      this.card.add(body);
    }

    if (hasIcon) {
      const k = 76 / ROUND_D;
      const by = -H / 2 + 2;
      const shadow = artObj(scene, 0, by + 6, 'ui.shadow.round').setScale(k / ART_SCALE).setAlpha(0.16);
      const lip = artObj(scene, 0, by + 4, 'ui.roundLip.butter').setScale(k / ART_SCALE);
      const disc = artObj(scene, 0, by, 'ui.round.butter').setScale(k / ART_SCALE);
      const ic = iconObj(scene, 0, by, opts.icon!, 48);
      this.card.add([shadow, lip, disc, ic]);
    }

    // Buttons.
    const by = H / 2 - 30 - btnH / 2;
    const inner = W - pad * 2;
    if (opts.cancel) {
      const bw = Math.min(232, (inner - 16) / 2);
      const cancel = new Button(scene, -bw / 2 - 8, by, { label: opts.cancel, variant: 'secondary', w: bw, onTap: () => this.close('cancel') });
      const ok = new Button(scene, bw / 2 + 8, by, { label: opts.confirm, variant: opts.confirmVariant ?? 'primary', w: bw, onTap: () => this.close('confirm') });
      this.card.add([cancel, ok]);
    } else {
      const ok = new Button(scene, 0, by, { label: opts.confirm, variant: opts.confirmVariant ?? 'primary', minW: 200, onTap: () => this.close('confirm') });
      this.card.add(ok);
    }

    this.setDepth(depth).setScrollFactor(0);
    // Pop in.
    const rm = reduceMotion();
    this.setAlpha(0);
    this.setScale(rm ? 1 : 0.82);
    scene.tweens.add({ targets: this, alpha: 1, scaleX: 1, scaleY: 1, duration: rm ? 200 : 420, ease: rm ? EASE.out : EASE.pop, easeParams: [1.6] });

    if (opts.modal !== false) {
      this.offLayout = onLayout((nl) => {
        this.setPosition(nl.w / 2, nl.h / 2);
        this.scrim?.setDisplaySize(nl.w + 8, nl.h + 8);
      });
    }
    const kb = scene.input.keyboard;
    if (kb) {
      this.keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.close(opts.cancel ? 'cancel' : 'confirm');
        else if (e.key === 'Enter') this.close('confirm');
      };
      kb.on('keydown', this.keyHandler);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    scene.add.existing(this);
  }

  /** Animate out and run the matching callback. */
  close(result: 'confirm' | 'cancel' = 'cancel'): void {
    if (this.closing) return;
    this.closing = true;
    this.cleanup();
    const rm = reduceMotion();
    if (this.scrim) {
      this.scene.tweens.add({ targets: this.scrim, alpha: 0, duration: 220, onComplete: () => this.scrim?.destroy() });
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: rm ? 1 : 0.9,
      scaleY: rm ? 1 : 0.9,
      duration: 200,
      ease: EASE.in,
      onComplete: () => this.destroy(),
    });
    if (result === 'confirm') this.o.onConfirm?.();
    else this.o.onCancel?.();
  }

  private cleanup(): void {
    this.offLayout?.();
    this.offLayout = undefined;
    if (this.keyHandler) {
      this.scene?.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }
  }
}
