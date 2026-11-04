// node scripts/trailer-sheet.mjs <outDir> [t1,t2,...] — renders the built
// trailer (marketing/trailer/site) at given seconds into PNGs for review.
// Serve the site first: python3 -m http.server 8090 --directory marketing/trailer/site
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch } from './lib/browser.mjs';

const out = process.argv[2] || 'shots/trailer';
const times = (process.argv[3] || '2,10,18,27,33,36,39,42,48,54,57,60,63,67,71,74,77,80,84,88').split(',').map(Number);
mkdirSync(out, { recursive: true });
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(process.env.TRAILER_URL || 'http://127.0.0.1:8090/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
for (const s of times) {
  await page.evaluate((ms) => window.__trailer.seek(ms), s * 1000);
  await page.waitForTimeout(250);
  const el = await page.$('#stage');
  await el.screenshot({ path: path.join(out, `t${String(s).padStart(2, '0')}.png`) });
}
console.log(`rendered ${times.length} moments to ${out}`, errors.length ? '\nerrors: ' + errors.join(' | ') : '');
await browser.close();
