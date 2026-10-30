/**
 * Catch card (spec section 5, Fishing step 4): name, size in cm, rarity stars
 * and a "NEW!" ribbon on first catch; Keep / Let go.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { layout } from '@/core/layout';
import { reduceMotion } from '@/core/settings';
import { STR } from '@/data/dialogue';
import { FISH } from '@/data/fish';
import type { FishId } from '@/data/ids';
import { A, P, hexToInt, mix } from '@/palette';
import { Button } from './Button';
import { Card } from './Card';
import { txtObj } from './text';
import { iconObj, panel } from '@/art/ui';

export interface CatchCardOpts {
  id: FishId;
  cm: number;
  stars: number;
  isNew: boolean;
  onKeep: () => void;
  onLetGo: () => void;
}

const RARITY_WORD = ['', 'Common', 'Uncommon', 'Rare'];

export class CatchCard extends Phaser.GameObjects.Container {
  private closed = false;
  private scrim: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, o: CatchCardOpts) {
    const l = layout();
    super(scene, l.w / 2, l.h / 2);
    this.setScrollFactor(0).setDepth(DEPTH.overlay);
    this.scrim = scene.add.rectangle(0, 0, l.w, l.h, hexToInt(P.ink), 0.22).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.overlay - 1).setInteractive();
    const W = 360;
    const H = 470;
    const card = new Card(scene, 0, 0, { w: W, h: H, ribbon: o.isNew ? STR.fishing.newRibbon : undefined });
    // Picture well: a little piece of lake.
    const wellW = W - 56;
    const wellH = 170;
    const well = scene.add.graphics();
    well.fillGradientStyle(hexToInt(mix(A['lake-jade'], P.cream, 0.45)), hexToInt(mix(A['lake-jade'], P.cream, 0.45)), hexToInt(A['lake-jade']), hexToInt(A['lake-jade']), 1);
    well.fillRoundedRect(-wellW / 2, -H / 2 + 30, wellW, wellH, 18);
    well.lineStyle(3, hexToInt(mix(A['lake-deep'], P.cream, 0.2)), 1);
    well.strokeRoundedRect(-wellW / 2, -H / 2 + 30, wellW, wellH, 18);
    for (let i = 0; i < 4; i++) {
      well.lineStyle(2, hexToInt(P.cream), 0.55);
      const yy = -H / 2 + 62 + i * 34;
      const xx = -wellW / 2 + 30 + ((i * 67) % (wellW - 100));
      well.beginPath();
      well.arc(xx, yy, 14, Math.PI * 1.15, Math.PI * 1.85);
      well.strokePath();
    }
    const key = scene.textures.exists(`item_${o.id}`) ? `item_${o.id}` : 'icon.star';
    const fish = iconObj(scene, 0, -H / 2 + 30 + wellH / 2, key, 150);
    const name = txtObj(scene, 0, -H / 2 + 240, FISH[o.id].name, 'h2');
    const size = txtObj(scene, 0, -H / 2 + 280, `${o.cm.toFixed(1)} cm`, 'body', { color: mix(P.ink, P.cream, 0.25) });
    const stars = scene.add.container(0, -H / 2 + 326);
    for (let i = 0; i < 3; i++) stars.add(iconObj(scene, (i - 1) * 44, 0, i < o.stars ? 'icon.star' : 'icon.starEmpty', 38));
    const rarity = txtObj(scene, 0, -H / 2 + 360, RARITY_WORD[o.stars] ?? '', 'small', { color: mix(P.ink, P.cream, 0.3) });
    const keep = new Button(scene, -78, H / 2 - 52, { label: STR.fishing.keep, variant: 'primary', w: 140, onTap: () => this.close(o.onKeep) });
    const letGo = new Button(scene, 78, H / 2 - 52, { label: STR.fishing.letGo, variant: 'secondary', w: 140, onTap: () => this.close(o.onLetGo) });
    this.add([card, well, fish, name, size, stars, rarity, keep, letGo]);
    void panel;
    scene.add.existing(this);
    if (reduceMotion()) {
      this.setAlpha(0);
      scene.tweens.add({ targets: this, alpha: 1, duration: 200 });
    } else {
      this.setScale(0.3);
      scene.tweens.add({ targets: this, scale: 1, duration: 480, ease: 'Back.easeOut', easeParams: [2] });
      scene.tweens.add({ targets: fish, angle: { from: -6, to: 6 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private close(fn: () => void): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.tweens.add({
      targets: this,
      scale: reduceMotion() ? 1 : 0.6,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.scrim.destroy();
        this.destroy();
      },
    });
    fn();
  }
}
