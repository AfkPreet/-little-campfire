// npm run mix — measures the audio mix in a headless browser: RMS loudness
// (dBFS) of the music, the ambience beds and the SFX on their own and
// together, by time of day and in rain. Needs a running dev server (BASE_URL,
// default http://127.0.0.1:5173). Headless Chromium renders Web Audio without
// output devices, so the numbers are relative, not calibrated. Sustained
// layers read accurately; very short clicks (tok, pop) read low because the
// level is sampled every 50 ms from an 11 ms window.
import { launch, openGame } from './lib/browser.mjs';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const browser = await launch();
const { page, context, errors } = await openGame(browser, base, 'scene=camp&state=midtrip&time=day&weather=clear&seed=7', { width: 708, height: 492, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, { timeout: 180000 });
const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf');

// A real tap unlocks Web Audio (on the sky, where it does nothing else).
await page.mouse.click(350, 40);
await page.waitForTimeout(1500);

async function measure(ms = 3000) {
  return page.evaluate(async (ms) => {
    const g = window.__game;
    let sum = 0;
    let peak = 0;
    let n = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const v = g.audioApi().audioLevel();
      sum += v * v;
      peak = Math.max(peak, v);
      n++;
      await new Promise((r) => setTimeout(r, 50));
    }
    return { rms: Math.sqrt(sum / Math.max(1, n)), peak };
  }, ms);
}
const set = (patch) => page.evaluate(async (p) => (await import('/src/core/settings.ts')).settingsSet(p), patch);
const time = (t) => page.evaluate((t) => window.__game.setTime(t), t);
const rain = (on) => page.evaluate((on) => window.__game.setRain(on), on);

const rows = [];
async function row(name, patch, prep) {
  await set(patch);
  if (prep) await prep();
  await page.waitForTimeout(4500); // crossfades settle
  const m = await measure();
  rows.push({ case: name, 'rms dBFS': db(m.rms), 'peak dBFS': db(m.peak) });
}

const ALL = { music: 0.7, sounds: 0.8, ambience: 0.7 };
await row('day: music only', { music: 0.7, sounds: 0, ambience: 0 });
await row('day: ambience only', { music: 0, sounds: 0, ambience: 0.7 });
await row('day: everything', ALL);
await row('rain: ambience only', { music: 0, sounds: 0, ambience: 0.7 }, () => rain(true));
await row('rain: music only', { music: 0.7, sounds: 0, ambience: 0 });
await row('rain: everything', ALL);
await row('night: music only', { music: 0.7, sounds: 0, ambience: 0 }, async () => {
  await rain(false);
  await time('night');
});
await row('night: ambience only', { music: 0, sounds: 0, ambience: 0.7 });
await row('night: everything', ALL);

// SFX alone, each one played into silence.
await set({ music: 0, ambience: 0, sounds: 0.8 });
await page.waitForTimeout(4000);
for (const id of ['tok', 'pop', 'splash', 'bite', 'chime', 'fanfare', 'page', 'basket']) {
  await page.evaluate((id) => window.__game.audioApi().playSfx(id), id);
  const m = await measure(1200);
  rows.push({ case: `sfx: ${id}`, 'rms dBFS': db(m.rms), 'peak dBFS': db(m.peak) });
  await page.waitForTimeout(600);
}
await set(ALL);
console.table(rows);
const errs = errors.filter((e) => !e.startsWith('timeout waiting'));
if (errs.length) console.log('console errors:\n' + errs.join('\n'));
await context.close();
await browser.close();
