// npm run trip — plays a whole trip through the debug hooks: Day 1 shop and
// camp, the first-night glow (clue 1), a rainy night and the Moon Scale at dawn
// (clue 2), Boju's legend (clue 3), Moonlight Momos (clue 4), the offering and
// the full finale (clue 5), then sleeps through Night 7 to the Trip Album,
// turns every page, stays for free play, and reloads. Fails on any console error.
import { launch, startServer, VIEWPORTS } from './lib/browser.mjs';

const server = await startServer('dev');
const browser = await launch();
// A small iPad-shaped viewport: this checks flow and state, and software
// WebGL runs several times faster with fewer pixels.
const vp = { width: 708, height: 492 };
void VIEWPORTS;
const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('[vite]') && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));

function check(name, cond, detail = '') {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) throw new Error(`trip failed at: ${name} ${detail}`);
}
const g = (fn, ...args) => page.evaluate(([f, a]) => window.__game[f](...a), [fn, args]);
const until = (fn, timeout = 60000, arg = null) => page.waitForFunction(fn, arg, { timeout, polling: 250 });
const inScene = (key, timeout = 60000) => until((k) => window.__game && window.__game.sceneKey() === k, timeout, key);
const ready = () => until(() => window.__shotReady === true, 120000);
const st = () => g('state');

/** Sleep from wherever we are and wait for the next dawn in camp. */
async function sleepToNextDay(rain = false) {
  const before = (await st()).day;
  await g('setTime', 'night');
  if (rain) await g('setRain', true);
  await page.waitForTimeout(400);
  await g('sleepNow');
  await until((d) => window.__game.state().day === d + 1 && window.__game.sceneKey() === 'Camp', 60000, before);
  await page.waitForTimeout(600);
}

/** Cast until a given fish bites (debug casts resolve instantly). */
async function fishFor(id, tries = 80) {
  for (let i = 0; i < tries; i++) {
    const c = await g('fish', true);
    if (c && c.id === id) return c;
  }
  return null;
}

try {
  await page.goto(`${server.base}/?debug=1&seed=21`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${server.base}/?debug=1&seed=21`, { waitUntil: 'load' });
  await ready();

  // Day 1 -------------------------------------------------------------------
  await g('startTrip');
  await until(() => ['Intro', 'Shop'].includes(window.__game.sceneKey()));
  if ((await g('sceneKey')) === 'Intro') await g('goto', 'Shop');
  await inScene('Shop');
  for (const id of ['leaf_tent', 'bamboo_rod', 'kettle', 'clay_pot', 'tea', 'rice']) check(`buy ${id}`, (await g('buy', id)) === 'ok');
  await g('goto', 'Camp');
  await inScene('Camp');
  check('pitch the tent', (await g('pitch', 1)) === true);
  const f1 = await g('fish', true);
  check('day 1 catch', !!f1, f1 && f1.id);
  const herbs = await g('forage', 'herb_patch');
  check('day 1 forage', herbs && herbs.n > 0);
  check('herb tea', (await g('cook', 'kettle', ['herbs'], 'eat'))?.recipe === 'herb_tea');

  // Night 1: the far glow (clue 1). It drifts by 6-12 s into the night.
  await g('setTime', 'night');
  await page.waitForTimeout(800);
  await g('skipNight', 13);
  await until(() => window.__game.state().mystery.step >= 1, 120000);
  check('clue 1: the glow on the water', true);
  await sleepToNextDay();
  check('day 2 dawn', (await st()).day === 2);

  // Night 2 rains: the Moon Scale is on the shore at dawn (clue 2).
  await sleepToNextDay(true);
  let s = await st();
  check('day 3: scale on the shore', s.mystery.scaleOnShore === true, `lastNightRainy=${s.weather.lastNightRainy}`);
  check('pick up the scale', (await g('act', 'scale')) === true);
  await until(() => window.__game.state().mystery.step >= 2, 20000);
  check('clue 2: the Moon Scale', true);

  // Boju's legend (clue 3): auto-advances through every line.
  await g('goto', 'Shop');
  await inScene('Shop');
  await until(() => window.__game.state().mystery.step >= 3, 90000);
  check('clue 3: the legend', true);
  await g('money', 400);
  for (const id of ['steamer', 'flour', 'willow_rod']) check(`buy ${id}`, (await g('buy', id)) === 'ok');
  await g('goto', 'Camp');
  await inScene('Camp');
  await page.waitForTimeout(600);

  // Night 3: a moon flower and a glowfin; steam Moonlight Momos (clue 4).
  await g('setTime', 'night');
  await page.waitForTimeout(400);
  const bloom = await g('forage', 'moon_spot');
  check('moon flower at night', bloom && bloom.item === 'moon_blossom', JSON.stringify(bloom));
  s = await st();
  const glowfin = await fishFor('night_glowfin');
  check('night glowfin on the rattan rod', !!glowfin, `rod=${s.rod}`);
  const momos = await g('cook', 'steamer', ['flour', 'moon_blossom', 'night_glowfin'], 'save');
  check('clue 4: Moonlight Momos', momos && momos.recipe === 'moon_dumplings', JSON.stringify(momos));
  s = await st();
  if (!s.weather.raining) {
    // Cooked after dark: the guarantee is that the *next* night rains (spec).
    check('rain promised for the next night', s.weather.forceRainNext === true);
    await sleepToNextDay();
    // Let the real clock cross dusk, where the promised rain begins.
    await g('setTime', 0.815);
    await until(() => window.__game.state().weather.raining === true, 30000);
    await g('setTime', 'night');
    await page.waitForTimeout(400);
  }
  s = await st();
  check('raining for the offering', s.weather.raining === true, `day=${s.day}`);

  // The offering and the full finale (clue 5).
  s = await st();
  if (s.contentment.value < 70) {
    console.log(`  (contentment ${s.contentment.value}: sitting by the fire is slow in a test, topping up with the debug hook)`);
    await g('content', 70 - s.contentment.value);
  }
  await page.waitForTimeout(500);
  // The ~45 s finale plays in scene time; speed it up on slow machines.
  await g('timeScale', 4);
  check('offering available at the dock', (await g('act', 'offering')) === true);
  await until(() => window.__game.state().mystery.step >= 5, 600000);
  await g('timeScale', 1);
  s = await st();
  check('clue 5: the guardian', s.mystery.step === 5 && (s.decor.guardian_lantern ?? 0) > 0, `lantern=${s.decor.guardian_lantern}`);
  await page.waitForTimeout(2500);

  // Days 4-7, then Night 7 -> the Trip Album.
  while ((await st()).day < 7) await sleepToNextDay();
  check('day 7', (await st()).day === 7);
  await g('setTime', 'night');
  await page.waitForTimeout(400);
  await g('sleepNow');
  await inScene('Album', 60000);
  await ready();
  const info = await g('albumInfo');
  check('trip album opens after night 7', info.pages.length === 11, info.pages.join(','));
  for (let i = 1; i < info.pages.length; i++) {
    await g('albumTurn', 1);
    await page.waitForTimeout(700);
  }
  check('album: turned to the postcard teaser', (await g('albumInfo')).idx === info.pages.length - 1);

  // Stay a little longer: free play keeps going past Day 7.
  await g('albumStay');
  await until(() => window.__game.sceneKey() === 'Camp' && window.__game.state().freePlay === true, 60000);
  s = await st();
  check('free play', s.day === 8 && s.journal.trips.length === 1 && s.journal.trips[0].metGuardian === true, `day=${s.day}`);

  // A mid-day reload resumes where the player was.
  await g('setTime', 0.4);
  await g('save');
  const p0 = (await st()).p;
  await page.reload({ waitUntil: 'load' });
  await ready();
  await g('continueTrip');
  await inScene('Camp');
  s = await st();
  check('reload resumes mid-day', s.day === 8 && Math.abs(s.p - p0) < 0.02 && s.freePlay, `day=${s.day} p=${s.p.toFixed(3)}`);

  await page.waitForTimeout(1500);
  check('no console errors', errors.length === 0, errors.join(' | '));
  console.log('\nTRIP PASSED');
} catch (err) {
  console.error(String(err));
  if (errors.length) console.error('Console errors:\n' + errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.stop();
}
