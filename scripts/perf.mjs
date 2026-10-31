// npm run perf — a static performance probe (spec section 10). Software WebGL
// on a CI box says nothing about iPad frame rates, so this measures what does
// carry over: live display objects, tweens and particles per scene, texture
// memory, and the production bundle size. Run `npm run build` first for sizes.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { launch, openGame, ROOT, startServer, VIEWPORTS } from './lib/browser.mjs';

const CASES = [
  { name: 'title', q: 'scene=title&seed=7' },
  { name: 'camp day', q: 'scene=camp&state=midtrip&time=day&weather=clear&seed=7' },
  { name: 'camp night + fire', q: 'scene=camp&state=decorated&time=night&weather=clear&shot=fire&seed=7' },
  { name: 'camp rain', q: 'scene=camp&state=midtrip&time=day&weather=rain&seed=7' },
  { name: 'finale', q: 'scene=camp&state=finale&time=night&weather=rain&shot=finale&seed=7' },
  { name: 'shop', q: 'scene=shop&state=midtrip&seed=7' },
];

const server = await startServer('dev');
const browser = await launch();
const rows = [];
try {
  for (const c of CASES) {
    const { page, context } = await openGame(browser, server.base, c.q, VIEWPORTS.ipad, { timeout: 180000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const game = window.__phaser;
      let objects = 0;
      let particles = 0;
      let emitters = 0;
      let tweens = 0;
      const walk = (list) => {
        for (const o of list) {
          objects++;
          if (o.type === 'ParticleEmitter') {
            emitters++;
            particles += o.getAliveParticleCount ? o.getAliveParticleCount() : 0;
          }
          if (o.list) walk(o.list);
        }
      };
      for (const sc of game.scene.getScenes(true)) {
        walk(sc.children.list);
        tweens += sc.tweens.getTweens().length;
      }
      let texPx = 0;
      for (const key of game.textures.getTextureKeys()) {
        const t = game.textures.get(key);
        for (const src of t.source) texPx += (src.width || 0) * (src.height || 0);
      }
      return { objects, emitters, particles, tweens, texMB: Math.round((texPx * 4) / 1048576), scenes: game.scene.getScenes(true).map((s) => s.scene.key).join('+') };
    });
    rows.push({ case: c.name, ...r });
    await context.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
console.table(rows);

const dist = path.join(ROOT, 'dist');
try {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|css|html)$/.test(f)) files.push(p);
    }
  };
  walk(dist);
  let raw = 0;
  let gz = 0;
  for (const f of files) {
    const b = readFileSync(f);
    raw += b.length;
    gz += gzipSync(b).length;
  }
  console.log(`bundle (js+css+html): ${(raw / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzip`);
} catch {
  console.log('bundle: run `npm run build` first');
}
