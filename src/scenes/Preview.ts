import Phaser from 'phaser';
import { anyParam, markReady } from '@/core/debug';
import { layout, setupCamera } from '@/core/layout';
import { P, hexToInt } from '@/palette';

/**
 * Dev preview: ?scene=preview&what=<name> runs the default export of any
 * `src/**\/<name>.preview.ts` module. Used by art/UI work to screenshot a
 * single module in isolation. The preview function may return a Promise.
 */
type PreviewFn = (scene: Phaser.Scene) => void | Promise<void>;

export default class Preview extends Phaser.Scene {
  constructor() {
    super({ key: 'Preview' });
  }

  async create(): Promise<void> {
    setupCamera(this);
    const l = layout();
    this.add.rectangle(0, 0, l.w, l.h, hexToInt(anyParam('bg') ?? P.cream)).setOrigin(0);
    const what = anyParam('what') ?? '';
    const mods = import.meta.glob<{ default: PreviewFn }>('../**/*.preview.ts');
    const entry = Object.entries(mods).find(([p]) => p.endsWith(`/${what}.preview.ts`));
    if (!entry) {
      this.add.text(40, 40, `No preview "${what}". Available:\n` + Object.keys(mods).join('\n'), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: P.ink,
      });
      markReady(this);
      return;
    }
    const mod = await entry[1]();
    await mod.default(this);
    markReady(this, Number(anyParam('wait') ?? 500));
  }
}
