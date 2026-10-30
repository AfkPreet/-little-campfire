// node scripts/multishot.mjs <outDir> "<name>|<query>|<waitMs>" ... — several 1x shots in one browser.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, openGame, startServer, VIEWPORTS } from './lib/browser.mjs';

const [outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const server = await startServer('dev');
const browser = await launch();
const vp = { ...VIEWPORTS[process.env.VP || 'ipad'], deviceScaleFactor: Number(process.env.SHOT_SCALE || 1) };
try {
  for (const spec of specs) {
    const [name, query, wait = '1500'] = spec.split('|');
    const { page, errors, context } = await openGame(browser, server.base, query, vp, { timeout: 120000 });
    await page.waitForTimeout(Number(wait));
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, timeout: 120000 }).catch((e) => errors.push('screenshot: ' + e.message));
    await context.close();
    console.log(`${errors.filter((e) => !e.startsWith('timeout waiting')).length ? '!' : '✓'} ${name} ${errors.join(' | ').slice(0, 300)}`);
  }
} finally {
  await browser.close();
  await server.stop();
}
