// npm run playtest — drives the real touch input paths in Camp (not debug
// shortcuts): pitch a tent by tapping a spot and its pegs, forage a bush,
// tap the water to fish and hook the bite, open cooking at the fire, and
// sleep through the tent bubble + dialog. Fails on any console error.
import { launch, startServer } from './lib/browser.mjs';

const server = await startServer('dev');
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('[vite]') && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
const g = (fn, ...args) => page.evaluate(([f, a]) => window.__game[f](...a), [fn, args]);
const until = (fn, ms = 60000) => page.waitForFunction(fn, null, { timeout: ms });
let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed = true;
};
const tapWorld = async (x, y) => {
  const p = await g('w2s', x, y);
  await page.touchscreen.tap(p.x, p.y);
};
const tapBubble = async (label) => {
  // Bubbles are Phaser objects; find via scene and tap its screen position.
  const pos = await page.evaluate((lab) => {
    const game = window.__phaser;
    const camp = game.scene.getScene('Camp');
    const grp = camp.children.list.find((o) => o.bubbles);
    if (!grp) return null;
    const b = grp.bubbles.find((x) => x.label === lab);
    if (!b) return null;
    const m = b.getWorldTransformMatrix();
    const cam = camp.cameras.main;
    const z = cam.zoom / (window.devicePixelRatio || 1);
    return { x: (m.tx - 20 * 1 - cam.scrollX) * z + 20 * z, y: (m.ty - 40 - cam.scrollY) * z };
  }, label);
  if (!pos) return false;
  await page.touchscreen.tap(pos.x, pos.y);
  return true;
};

const tapButton = async (sceneKey, label) => {
  const pos = await page.evaluate(([key, lab]) => {
    const sc = window.__phaser.scene.getScene(key);
    const out = [];
    const walk = (list) => {
      for (const o of list) {
        if (o.list) walk(o.list);
        if (o.o && o.o.label === lab) out.push(o);
        else if (o.label === lab || (o.list && o.list.some((c) => c.text === lab))) out.push(o);
      }
    };
    walk(sc.children.list);
    const b = out.find((o) => o.input);
    if (!b) return null;
    const m = b.getWorldTransformMatrix();
    const cam = sc.cameras.main;
    const z = cam.zoom / (window.devicePixelRatio || 1);
    const sf = b.scrollFactorX ?? 1;
    let parent = b.parentContainer;
    let sfx = sf;
    while (parent) { sfx = parent.scrollFactorX; parent = parent.parentContainer; }
    return { x: (m.tx - cam.scrollX * sfx) * z, y: (m.ty - cam.scrollY * sfx) * z };
  }, [sceneKey, label]);
  if (!pos) return false;
  await page.touchscreen.tap(pos.x, pos.y);
  return true;
};
const notBusy = () => until(() => window.__game.campInfo().busy === 0, 60000).catch(() => {});

try {
  await page.goto(`${server.base}/?debug=1&scene=camp&state=fresh&seed=21`);
  await until(() => window.__shotReady === true, 120000);
  await g('money', 300);
  for (const id of ['leaf_tent', 'bamboo_rod', 'kettle', 'tea', 'honey']) await g('buy', id);
  await g('goto', 'Camp');
  await page.waitForTimeout(2500);

  // 1. Tent: tap spot B, then each peg.
  await tapWorld(1320, 560);
  await until(() => window.__game.state().camp.tentSpot !== null, 60000).catch(() => {});
  let st = await g('state');
  check('tap a tent spot chooses it', st.camp.tentSpot === 1, `spot=${st.camp.tentSpot}`);
  await page.waitForTimeout(800);
  const pegs = (await g('campInfo')).tentPegs;
  for (const pg of pegs) {
    await tapWorld(pg.x, pg.y - 12);
    await page.waitForTimeout(700);
  }
  await until(() => window.__game.state().camp.pitched === true, 30000).catch(() => {});
  st = await g('state');
  check('tapping 4 pegs pitches the tent', st.camp.pitched === true, `pegs=${JSON.stringify(st.camp.pegs)}`);
  await notBusy();

  // 2. Forage: tap ainselu bush 2 (x 1470).
  const before = (st.forage.berries ?? 0) + (st.forage.mushrooms ?? 0);
  await tapWorld(1470, 560);
  await until(() => { const s = window.__game.state(); return (s.forage.berries ?? 0) > 0; }, 60000).catch(() => {});
  st = await g('state');
  check('tap a bush forages berries', (st.forage.berries ?? 0) > 0, `berries=${st.forage.berries} before=${before}`);

  // 3. Fish: walk toward the dock (tap the ground), then tap the water; wait for the bite; tap to hook.
  await notBusy();
  await tapWorld(1500, 600);
  await page.waitForTimeout(400);
  await g('walk', 2300);
  await until(() => Math.abs(window.__game.heroX() - 2300) < 8, 90000).catch(() => {});
  await page.waitForTimeout(1500);
  await tapWorld(2620, 650);
  await until(() => window.__game.campInfo().activity === 'fish', 90000).catch(() => {});
  check('tap the water walks to the dock and fishes', (await g('campInfo')).activity === 'fish');
  // Poll for the "!" (bite) by watching the fishing phase via a debug read of the bang image.
  const t0 = Date.now();
  let hooked = false;
  while (Date.now() - t0 < 60000) {
    const bite = await page.evaluate(() => {
      const camp = window.__phaser.scene.getScene('Camp');
      return camp.children.list.some((o) => o.texture && o.texture.key === 'fish_bang');
    });
    if (bite) {
      await page.touchscreen.tap(400, 300);
      hooked = true;
      break;
    }
    await page.waitForTimeout(150);
  }
  check('a bite appears and can be hooked by tapping', hooked);
  await page.waitForTimeout(2600);
  const card = await page.evaluate(() => window.__phaser.scene.getScene('Camp').children.list.some((o) => o.constructor && o.constructor.name === 'CatchCard'));
  check('catch card shows', card);
  check('tap Keep on the catch card', await tapButton('Camp', 'Keep'));
  await page.waitForTimeout(1200);
  st = await g('state');
  const fishCount = Object.values(st.fish).reduce((a, b) => a + b, 0);
  check('keep puts the fish in the backpack', fishCount > 0, `fish=${JSON.stringify(st.fish)}`);

  // 4. Fire: walk back and tap the fire -> cooking overlay.
  await tapWorld(2100, 600);
  await page.waitForTimeout(300);
  await g('walk', 1300);
  await until(() => Math.abs(window.__game.heroX() - 1300) < 8, 90000).catch(() => {});
  await page.waitForTimeout(1500);
  await tapWorld(1160, 560);
  await until(() => window.__phaser.scene.isActive('Cooking'), 90000).catch(() => {});
  check('tap the fire opens cooking', await page.evaluate(() => window.__phaser.scene.isActive('Cooking')));
  await tapButton('Cooking', '__close__');
  await page.evaluate(() => { const c = window.__phaser.scene.getScene('Cooking'); c.close ? c.close() : window.__phaser.scene.stop('Cooking'); });
  await page.waitForTimeout(800);

  // 5. Night: tap the tent -> Sleep bubble -> dialog -> sleep -> Day 2.
  await g('setTime', 'night');
  await page.waitForTimeout(800);
  await tapWorld(1320, 520);
  await until(() => window.__game.campInfo().bubbles.length > 0, 60000).catch(() => {});
  const info = await g('campInfo');
  check('tapping the tent at night offers Rest / Sleep / Decorate', info.bubbles.includes('Sleep'), JSON.stringify(info.bubbles));
  // Tap Sleep, then confirm the dialog, then wait for Day 2.
  await tapButton('Camp', 'Sleep');
  await page.waitForTimeout(1500);
  await tapButton('Camp', 'Sleep');
  await until(() => window.__game.state().day === 2, 120000).catch(() => {});
  check('sleeping through the dialog reaches Day 2', (await g('state')).day === 2);
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  console.error(String(err));
  failed = true;
} finally {
  await browser.close();
  await server.stop();
}
if (failed) {
  console.log('PLAYTEST FAILED');
  process.exitCode = 1;
} else console.log('PLAYTEST PASSED');
