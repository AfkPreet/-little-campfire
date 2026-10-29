import Phaser from 'phaser';
import { SCENES } from '@/config';
import { Baker, bakeAll } from '@/art/kit';
import { param } from '@/core/debug';
import { setupCamera } from '@/core/layout';

type ArtModule = { bake?: (b: Baker) => void; afterBake?: (game: Phaser.Game) => void };

/** Boot: fonts, procedural textures, audio check, then route. */
export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.boot });
  }

  async create(): Promise<void> {
    setupCamera(this);
    const bar = document.getElementById('splash-bar');
    const setBar = (f: number) => {
      if (bar) bar.style.width = `${Math.round(f * 100)}%`;
    };

    await this.loadFonts();
    setBar(0.1);

    const baker = new Baker();
    const loaders = import.meta.glob<ArtModule>('../art/*.ts');
    const mods: ArtModule[] = [];
    for (const [path, load] of Object.entries(loaders)) {
      if (path.endsWith('/kit.ts')) continue;
      try {
        const m = await load();
        if (m.bake) {
          m.bake(baker);
          mods.push(m);
        }
      } catch (err) {
        console.error(`[boot] art module failed: ${path}`, err);
      }
    }
    await bakeAll(this.textures, baker, (d, t) => setBar(0.1 + 0.85 * (d / Math.max(1, t))));
    for (const m of mods) m.afterBake?.(this.game);

    try {
      const audio = await import('@/audio/engine');
      await audio.detectMusic?.();
    } catch {
      /* audio module optional during early milestones */
    }
    setBar(1);

    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 700);
    }
    this.route();
  }

  private async loadFonts(): Promise<void> {
    const faces = ['400 20px "Baloo 2"', '600 20px "Baloo 2"', '700 20px "Baloo 2"', '400 20px "Patrick Hand"'];
    try {
      await Promise.race([
        Promise.all(faces.map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    } catch {
      /* fall back to system fonts */
    }
  }

  private route(): void {
    const target = param('scene');
    const keys = this.scene.manager.getScenes(false).map((s) => s.scene.key);
    const byLower = new Map(keys.map((k) => [k.toLowerCase(), k]));
    if (target && byLower.has(target.toLowerCase())) {
      this.scene.start(byLower.get(target.toLowerCase())!);
      return;
    }
    if (keys.includes(SCENES.title)) this.scene.start(SCENES.title);
    else if (keys.includes(SCENES.styleboard)) this.scene.start(SCENES.styleboard);
  }
}
