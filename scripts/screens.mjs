// npm run screens -- <outDir> [only=prefix1,prefix2] — 1x review shots of the
// screens the milestone list doesn't cover: every journal tab, shop tabs,
// settings, intro, the summary card and every Trip Album page. Needs a running
// dev server (BASE_URL, default http://127.0.0.1:5173).
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, openGame, VIEWPORTS } from './lib/browser.mjs';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('only=')) || 'shots/screens';
const only = (args.find((a) => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const base = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const browser = await launch();
const vp = { ...VIEWPORTS[process.env.VP || 'ipad'], deviceScaleFactor: 1 };

async function shot(name, q, act) {
  if (only.length && !only.some((o) => name.startsWith(o))) return;
  const { page, errors, context } = await openGame(browser, base, q, vp, { timeout: 150000 });
  try {
    if (act) await act(page);
    else await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    console.log(`${errors.filter((e) => !e.startsWith('timeout waiting')).length ? '!' : '✓'} ${name} ${errors.join(' | ').slice(0, 200)}`);
  } catch (e) {
    console.log(`✗ ${name} ${String(e).slice(0, 200)}`);
  }
  await context.close();
}

for (const tab of ['recipes', 'moments', 'friends', 'mystery', 'trip']) await shot(`journal_${tab}`, `scene=camp&state=finale&time=day&weather=clear&shot=journal&tab=${tab}&seed=7`);
await shot('shop_sell', 'scene=shop&state=midtrip&tab=sell&seed=7');
await shot('shop_pantry', 'scene=shop&state=midtrip&tab=pantry&seed=7');
await shot('settings', 'scene=settings&state=midtrip&seed=7');
await shot('intro', 'scene=intro&seed=7', (p) => p.waitForTimeout(2500));
await shot('summary', 'scene=camp&state=midtrip&time=night&weather=clear&seed=7', async (p) => {
  await p.evaluate(() => window.__phaser.scene.getScene('Camp').sleepSequence(false));
  await p.waitForFunction(() => window.__phaser.scene.isActive('Summary'), null, { timeout: 60000 });
  await p.waitForTimeout(2500);
});
await shot('album_pages', 'scene=album&state=finale&seed=7', async (p) => {
  const n = (await p.evaluate(() => window.__game.albumInfo())).pages.length;
  for (let i = 1; i < n; i++) {
    await p.evaluate(() => window.__game.albumTurn(1));
    await p.waitForTimeout(1400);
    const kind = (await p.evaluate(() => window.__game.albumInfo())).pages[i];
    if (i === 1 || kind !== 'day') await p.screenshot({ path: path.join(out, `album_${i}_${kind}.png`) });
  }
});
await browser.close();
