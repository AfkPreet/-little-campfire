// npm run smoke — plays Day 1 through the debug hooks (buy essentials, pitch,
// catch a fish, forage, cook, sleep), reloads, confirms the save, and fails on
// any console error. Uses BASE_URL if set, else starts its own dev server.
import { launch, startServer, VIEWPORTS } from './lib/browser.mjs';

const server = await startServer('dev');
const browser = await launch();
const vp = VIEWPORTS.ipad;
const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));

const steps = [];
function check(name, cond, detail = '') {
  steps.push({ name, ok: !!cond, detail });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) throw new Error(`smoke failed at: ${name} ${detail}`);
}
const g = (fn, ...args) => page.evaluate(([f, a]) => window.__game[f](...a), [fn, args]);
const waitReady = () => page.waitForFunction(() => window.__shotReady === true, null, { timeout: 45000 });

try {
  await page.goto(`${server.base}/?debug=1&seed=11`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${server.base}/?debug=1&seed=11`, { waitUntil: 'load' });
  await waitReady();
  check('title loads', await page.evaluate(() => !!window.__game && typeof window.__game.startTrip === 'function'));

  await g('startTrip');
  await page.waitForFunction(() => ['Intro', 'Shop'].includes(window.__game.sceneKey()), null, { timeout: 30000 });
  if ((await g('sceneKey')) === 'Intro') {
    check('intro plays on a first trip', true);
    await page.waitForTimeout(800);
    await g('goto', 'Shop');
  }
  await page.waitForFunction(() => window.__game.sceneKey() === 'Shop', null, { timeout: 30000 });
  check('shop opens on day 1', true);

  for (const id of ['leaf_tent', 'bamboo_rod', 'kettle', 'clay_pot', 'tea', 'honey', 'rice']) {
    const r = await g('buy', id);
    check(`buy ${id}`, r === 'ok', String(r));
  }
  let st = await g('state');
  check('money spent', st.money === 120 - 40 - 25 - 15 - 20 - 5 - 6 - 4, `money=${st.money}`);

  await g('goto', 'Camp');
  await page.waitForFunction(() => window.__game.sceneKey() === 'Camp', null, { timeout: 30000 });
  check('camp opens', true);

  check('pitch tent', (await g('pitch', 1)) === true);
  const fish = await g('fish', true);
  check('catch a fish', fish && fish.id, fish && `${fish.id} ${fish.cm}cm`);
  const herbs = await g('forage', 'herb_patch');
  check('forage herbs', herbs && herbs.n > 0, herbs && `${herbs.n} ${herbs.item}`);
  const tea = await g('cook', 'kettle', ['herbs'], 'eat');
  check('cook herb tea', tea && tea.recipe === 'herb_tea', JSON.stringify(tea));
  const congee = await g('cook', 'clay_pot', [fish.id, 'rice'], 'save');
  check('cook fish congee', congee && congee.recipe === 'fish_congee', JSON.stringify(congee));

  await g('setTime', 'night');
  await g('sleepNow');
  await page.waitForFunction(() => window.__game.state().day === 2, null, { timeout: 30000 });
  st = await g('state');
  check('day 2 dawn', st.day === 2 && st.p < 0.1, `day=${st.day} p=${st.p}`);
  await g('save');

  await page.reload({ waitUntil: 'load' });
  await waitReady();
  await g('continueTrip');
  await page.waitForFunction(() => window.__game.sceneKey() === 'Camp', null, { timeout: 30000 });
  st = await g('state');
  check('save restored', st.day === 2 && st.camp.pitched && !!st.journal.fish[fish.id] && !!st.journal.recipes.herb_tea && st.dishes.some((d) => d.id === 'fish_congee'), `day=${st.day}`);
  await page.waitForTimeout(1500);
  check('no console errors', errors.length === 0, errors.join(' | '));
  console.log('\nSMOKE PASSED');
} catch (err) {
  console.error(String(err));
  if (errors.length) console.error('Console errors:\n' + errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.stop();
}
