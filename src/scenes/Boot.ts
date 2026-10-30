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

    // World scenes are loaded lazily so a broken art module can only break its
    // own scene (and previews never load them).
    if ((param('scene') ?? '').toLowerCase() !== 'preview') await this.loadLazyScenes();

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

  private async loadLazyScenes(): Promise<void> {
    const keys: Record<string, string> = {
      '../camp/CampScene.ts': SCENES.camp,
      '../shop/ShopScene.ts': SCENES.shop,
      '../title/TitleScene.ts': SCENES.title,
      '../title/IntroScene.ts': SCENES.intro,
      '../styleboard/StyleBoardScene.ts': SCENES.styleboard,
    };
    const loaders = import.meta.glob<{ default: typeof Phaser.Scene }>(['../camp/CampScene.ts', '../shop/ShopScene.ts', '../title/*Scene.ts', '../styleboard/StyleBoardScene.ts']);
    await Promise.all(
      Object.entries(loaders).map(async ([path, load]) => {
        const key = keys[path];
        if (!key || this.scene.manager.keys[key]) return;
        try {
          const m = await load();
          this.scene.manager.add(key, m.default, false);
        } catch (err) {
          console.error(`[boot] scene failed to load: ${path}`, err);
        }
      }),
    );
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
      const key = byLower.get(target.toLowerCase())!;
      this.scene.start(key);
      // World scenes get the HUD on top, as they do through the normal flow.
      if ((key === SCENES.camp || key === SCENES.shop) && keys.includes(SCENES.hud)) {
        this.scene.run(SCENES.hud);
        this.scene.bringToTop(SCENES.hud);
      }
      return;
    }
    if (keys.includes(SCENES.title)) this.scene.start(SCENES.title);
    else if (keys.includes(SCENES.styleboard)) this.scene.start(SCENES.styleboard);
  }
}
