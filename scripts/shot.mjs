// One-off screenshot: node scripts/shot.mjs "<query>" <out.png> [ipad|phone] [extraWaitMs]
// Uses BASE_URL if set (e.g. a running `npm run dev`), else starts its own dev server.
import { launch, openGame, startServer, VIEWPORTS } from './lib/browser.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [query = 'scene=styleboard', out = 'shots/tmp.png', vp = 'ipad', extra = '0'] = process.argv.slice(2);
const server = await startServer('dev');
const browser = await launch();
try {
  const { page, errors, context } = await openGame(browser, server.base, query, VIEWPORTS[vp] || VIEWPORTS.ipad);
  if (Number(extra) > 0) await page.waitForTimeout(Number(extra));
  mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  await context.close();
  if (errors.length) {
    console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
    process.exitCode = 2;
  } else console.log('ok', out);
} finally {
  await browser.close();
  await server.stop();
}
