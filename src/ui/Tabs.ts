/**
 * Row of rounded paper tabs (shop: Camp, Fishing, Kitchen...; journal: Fish,
 * Recipes, Moments...). The selected tab is raised onto its lip, bold, and
 * underlined, so the state never relies on colour alone.
 */
import Phaser from 'phaser';
import { MIN_TOUCH } from '@/config';
import { reduceMotion } from '@/core/settings';
import { EASE } from '@/fx/juice';
import { UI_INK, UI_INK_SOFT, iconObj, panel, shadowPanel, type Panel } from '@/art/ui';
import { TEXT_NUDGE, pressable } from './Button';
import { txtObj } from './text';

export interface TabItem {
  label: string;
  icon?: string;
}

export interface TabsOpts {
  tabs: (string | TabItem)[];
  selected?: number;
  onChange?: (i: number) => void;
  /** Tab height (default 58, min MIN_TOUCH). */
  height?: number;
  /** Minimum tab width (default 96). */
  minTabW?: number;
  /** Fixed tab width for every tab (overrides auto sizing). */
  tabW?: number;
  gap?: number;
}

const LIP = 5;

class Tab extends Phaser.GameObjects.Container {
  readonly tw: number;
  private onFace: Panel;
  private onLip: Panel;
  private onShadow: Panel;
  private offFace: Panel;
  private label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private bar: Panel;
  private th: number;
  private sel = false;

  constructor(scene: Phaser.Scene, x: number, item: TabItem, w: number, h: number) {
    super(scene, x, 0);
    this.th = h;
    this.tw = w;
    const faceH = h - LIP;
    this.onShadow = shadowPanel(scene, 'btn', w, faceH, 0, 4, 0.18);
    this.onLip = panel(scene, 'ui.lip.cream', w, faceH, 0, 0);
    this.offFace = panel(scene, 'ui.tab.off', w - 6, faceH - 6, 0, 3);
    this.onFace = panel(scene, 'ui.face.cream', w, faceH, 0, 0);
    this.label = txtObj(scene, 0, TEXT_NUDGE, item.label, 'label', { color: UI_INK_SOFT });
    this.bar = panel(scene, 'ui.bar', Math.max(24, Math.min(w - 36, this.label.width * 0.7)), 7, 0, 0);
    this.add([this.onShadow, this.onLip, this.offFace, this.onFace, this.bar]);
    if (item.icon) {
      this.icon = iconObj(scene, 0, 0, item.icon, 26);
      this.add(this.icon);
    }
    this.add(this.label);
    this.setSize(w + 4, Math.max(MIN_TOUCH, h + 6));
    this.setInteractive({ useHandCursor: true });
  }

  setSelected(s: boolean, animate: boolean): void {
    this.sel = s;
    const faceH = this.th - LIP;
    const raise = s ? -LIP : 0;
    this.onShadow.setVisible(s);
    this.onLip.setVisible(s);
    this.onFace.setVisible(s);
    this.offFace.setVisible(!s);
    this.bar.setVisible(s);
    this.label.setColor(s ? UI_INK : UI_INK_SOFT);
    this.label.setFontStyle(s ? '700' : '600');
    const contentY = s ? raise / 2 - LIP / 2 : 3;
    const iconW = this.icon ? 26 + 6 : 0;
    const lw = this.label.width - 4;
    const startX = -(lw + iconW) / 2;
    this.onFace.y = raise / 2 - LIP / 2;
    this.onLip.y = raise / 2 + LIP / 2;
    this.onShadow.y = raise / 2 + LIP / 2 + 4;
    if (this.icon) this.icon.setPosition(startX + 13, contentY - (s ? 2 : 0));
    this.label.setPosition(startX + iconW + lw / 2, contentY + TEXT_NUDGE - (s ? 2 : 0));
    this.bar.setPosition(this.label.x, contentY + faceH / 2 - 11);
    if (animate && s && !reduceMotion()) {
      // Pop the raised face up (parts only, so a press squash can't strand it).
      const parts = [this.onFace, this.onLip, this.onShadow, this.label, this.bar, ...(this.icon ? [this.icon] : [])];
      parts.forEach((p) => {
        const y = p.y;
        p.y = y + 5;
        this.scene.tweens.add({ targets: p, y, duration: 300, ease: EASE.pop, easeParams: [2] });
      });
    }
  }

  get selected(): boolean {
    return this.sel;
  }
}

export class Tabs extends Phaser.GameObjects.Container {
  private items: Tab[] = [];
  private idx: number;
  private o: TabsOpts;
  /** Total row width. */
  readonly rowW: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: TabsOpts) {
    super(scene, x, y);
    this.o = opts;
    this.idx = opts.selected ?? 0;
    const h = Math.max(MIN_TOUCH, opts.height ?? 58);
    const gap = opts.gap ?? 8;
    const items: TabItem[] = opts.tabs.map((t) => (typeof t === 'string' ? { label: t } : t));
    const widths = items.map((it) => {
      if (opts.tabW) return opts.tabW;
      const probe = txtObj(scene, 0, 0, it.label, 'label');
      probe.setFontStyle('700');
      const w = probe.width - 4 + (it.icon ? 32 : 0) + 40;
      probe.destroy();
      return Math.max(opts.minTabW ?? 96, Math.round(w));
    });
    this.rowW = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let cx = -this.rowW / 2;
    items.forEach((it, i) => {
      const tab = new Tab(scene, cx + widths[i] / 2, it, widths[i], h);
      cx += widths[i] + gap;
      pressable(scene, tab, {
        onTap: () => this.select(i),
        squashAmount: 0.6,
        sfx: 'page',
      });
      this.add(tab);
      this.items.push(tab);
    });
    this.items.forEach((t, i) => t.setSelected(i === this.idx, false));
    scene.add.existing(this);
  }

  get selected(): number {
    return this.idx;
  }

  /** Select a tab; fires onChange unless silent or unchanged. */
  select(i: number, silent = false): void {
    if (i === this.idx) return;
    this.idx = i;
    this.items.forEach((t, j) => t.setSelected(j === i, true));
    if (!silent) this.o.onChange?.(i);
  }
}
