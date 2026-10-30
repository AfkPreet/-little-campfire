// npm run shots -- <milestone> [only=name1,name2] [vp=ipad|phone]
// Starts the game (dev server unless BASE_URL is set), drives it with the debug
// hooks and saves PNGs to shots/<milestone>/<name>_<viewport>.png at
// iPad landscape (1180x820 @2x) and phone landscape (844x390 @2x).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, openGame, ROOT, startServer, VIEWPORTS } from './lib/browser.mjs';

const args = process.argv.slice(2);
const milestone = args.find((a) => !a.includes('=')) || 'latest';
const only = (args.find((a) => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
const vpArg = (args.find((a) => a.startsWith('vp=')) || '').slice(3);
const vps = vpArg ? [vpArg] : ['ipad', 'phone'];

// Shot list (spec section 11). `q` is the URL query; the scene reads the debug
// params and sets __shotReady when settled. `wait` adds settle time (ms).
const SHOTS = [
  { name: 'styleboard_cast', q: 'scene=styleboard&page=1&seed=7', wait: 900 },
  { name: 'styleboard_world', q: 'scene=styleboard&page=2&seed=7', wait: 900 },
  { name: 'styleboard_ui', q: 'scene=styleboard&page=3&seed=7', wait: 900 },
  { name: 'title', q: 'scene=title&seed=7', wait: 1500 },
  { name: 'shop', q: 'scene=shop&state=midtrip&seed=7', wait: 800 },
  { name: 'camp_dawn', q: 'scene=camp&state=midtrip&time=dawn&weather=clear&seed=7', wait: 1200 },
  { name: 'camp_day', q: 'scene=camp&state=midtrip&time=day&weather=clear&seed=7', wait: 1200 },
  { name: 'camp_golden', q: 'scene=camp&state=midtrip&time=golden&weather=clear&seed=7', wait: 1200 },
  { name: 'camp_dusk', q: 'scene=camp&state=midtrip&time=dusk&weather=clear&seed=7', wait: 1200 },
  { name: 'camp_night', q: 'scene=camp&state=midtrip&time=night&weather=clear&shot=fire&seed=7', wait: 2500 },
  { name: 'camp_rain', q: 'scene=camp&state=midtrip&time=day&weather=rain&seed=7', wait: 2000 },
  { name: 'fishing_bite', q: 'scene=camp&state=midtrip&time=day&weather=clear&shot=bite&seed=7', wait: 600 },
  { name: 'catch_card', q: 'scene=camp&state=midtrip&time=day&weather=clear&shot=catch&seed=7', wait: 900 },
  { name: 'cooking_result', q: 'scene=camp&state=midtrip&time=dusk&shot=cook&seed=7', wait: 900 },
  { name: 'decorated_night', q: 'scene=camp&state=decorated&time=night&weather=clear&seed=7', wait: 2500 },
  { name: 'journal_fish', q: 'scene=camp&state=midtrip&time=day&shot=journal&seed=7', wait: 1200 },
  { name: 'mystery_finale', q: 'scene=camp&state=finale&time=night&weather=rain&shot=finale&seed=7', wait: 1000 },
  { name: 'trip_album', q: 'scene=album&state=finale&seed=7', wait: 1500 },
];

const server = await startServer('dev');
const browser = await launch();
const outDir = path.join(ROOT, 'shots', milestone);
mkdirSync(outDir, { recursive: true });
const report = [];
try {
  for (const shot of SHOTS) {
    if (only.length && !only.includes(shot.name)) continue;
    for (const vp of vps) {
      const { page, errors, context } = await openGame(browser, server.base, shot.q, VIEWPORTS[vp], { timeout: 30000 });
      const notReady = errors.some((e) => e.startsWith('timeout waiting'));
      if (notReady) {
        report.push({ shot: shot.name, vp, status: 'skipped (not available yet)', errors });
        await context.close();
        continue;
      }
      if (shot.wait) await page.waitForTimeout(shot.wait);
      const file = path.join(outDir, `${shot.name}_${vp}.png`);
      await page.screenshot({ path: file });
      report.push({ shot: shot.name, vp, status: errors.length ? 'ok with console errors' : 'ok', file: path.relative(ROOT, file), errors });
      await context.close();
      console.log(`${errors.length ? '!' : '✓'} ${shot.name} [${vp}]${errors.length ? ' errors: ' + errors.join(' | ') : ''}`);
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.errors && r.errors.length && !r.status.startsWith('skipped'));
console.log(`\n${report.filter((r) => r.status.startsWith('ok')).length} shots saved to shots/${milestone}/, ${report.filter((r) => r.status.startsWith('skipped')).length} skipped, ${bad.length} with console errors.`);
if (bad.length) process.exitCode = 1;
