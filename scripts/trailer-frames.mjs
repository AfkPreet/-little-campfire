// node scripts/trailer-frames.mjs [only=name1,name2]
// Captures the clean landscape frames the 90 s trailer pans across
// (marketing/trailer/frames/*.jpg, iPad 1180 x 820 @2x, HUD and UI chrome
// hidden) plus anchors.json (screen points for the page's live overlays) and
// the logo as a transparent PNG. Needs a running dev server (BASE_URL,
// default http://127.0.0.1:5173).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { launch, openGame, ROOT, VIEWPORTS } from './lib/browser.mjs';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const only = (process.argv.find((a) => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
const OUT = path.join(ROOT, 'marketing', 'trailer', 'frames');
mkdirSync(OUT, { recursive: true });
const anchorsFile = path.join(OUT, 'anchors.json');
const anchors = existsSync(anchorsFile) ? JSON.parse(readFileSync(anchorsFile, 'utf8')) : {};

const browser = await launch();
const vp = VIEWPORTS.ipad; // 1180 x 820 @2x

// ---- in-page helpers (run through page.evaluate) ---------------------------
const hideHud = (page) => page.evaluate(() => window.__phaser.scene.isActive('Hud') && window.__phaser.scene.stop('Hud'));
const camp = (page, fn, arg) => page.evaluate(fn, arg);
/** Point the camp camera at world x and keep it there; silence proximity glows. */
const focus = (page, x) =>
  page.evaluate((x) => {
    const c = window.__phaser.scene.getScene('Camp');
    c.focusX = x;
    c.busy = Math.max(1, c.busy);
    const w = c.cameras.main.width / c.cameras.main.zoom;
    c.cameras.main.scrollX = Math.max(0, Math.min(2800 - w, x - w * 0.45));
  }, x);
/** Hide screen-fixed UI in a scene between two depths (bait pill, buttons...). */
const hideUi = (page, key, min, max = 1e9) =>
  page.evaluate(
    ([key, min, max]) => {
      const sc = window.__phaser.scene.getScene(key);
      for (const o of sc.children.list) if (o.depth >= min && o.depth < max && o.scrollFactorX === 0) o.setVisible(false);
    },
    [key, min, max],
  );
const w2s = (page, pts) => page.evaluate((pts) => pts.map(([x, y]) => window.__game.w2s(x, y)), pts);
const wait = (page, ms) => page.waitForTimeout(ms);
async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 88 });
  console.log('  saved', name);
}

// ---- shots -----------------------------------------------------------------
const SHOTS = {
  // 0:00 hook: the far glow on the night lake, Tuki sitting on the dock.
  async lake_glow(page) {
    await hideHud(page);
    await camp(page, () => {
      const c = window.__phaser.scene.getScene('Camp');
      c.hero.x = 2440;
      c.hero.face(1);
      c.hero.setPose('sit');
    });
    await focus(page, 2560);
    await wait(page, 1500);
    await page.evaluate(async () => (await import('/src/core/bus.ts')).bus.emit('camp:activity', { activity: 'glowSighting' }));
    const pts = await w2s(page, [[2700, 470], [2440, 560]]);
    anchors.lake_glow = { glow: pts[0], tuki: pts[1] };
    for (let i = 1; i <= 4; i++) {
      await wait(page, 2200);
      await snap(page, `lake_glow_${i}`);
    }
  },
  // 0:06 storybook page 1.
  async intro(page) {
    await wait(page, 2500);
    await snap(page, 'intro');
  },
  // 0:14 Boju's shop (bubble, header, catalog and buttons hidden).
  async shop(page) {
    await hideHud(page);
    await wait(page, 3500);
    await page.evaluate(() => {
      const s = window.__phaser.scene.getScene('Shop');
      s.speech?.destroy();
      s.speech = null;
      for (const o of s.children.list) if (o.depth >= 10) o.setVisible(false);
    });
    await wait(page, 600);
    await snap(page, 'shop');
  },
  // 0:22 dawn at camp.
  async dawn(page) {
    await hideHud(page);
    await focus(page, 1230);
    await wait(page, 2500);
    await snap(page, 'dawn');
  },
  // 0:32 montage: the bite.
  async bite(page) {
    await hideHud(page);
    await hideUi(page, 'Camp', 100, 200);
    await wait(page, 600);
    await snap(page, 'bite');
  },
  // the catch card (card kept, scrim and bait pill hidden).
  async catch(page) {
    await hideHud(page);
    await wait(page, 1200);
    await hideUi(page, 'Camp', 100, 200);
    await snap(page, 'catch');
  },
  // forage the ainselu berries.
  async forage(page) {
    await hideHud(page);
    await camp(page, () => {
      const c = window.__phaser.scene.getScene('Camp');
      c.hero.x = 880;
      c.hero.face(1);
      c.hero.setPose('pick');
    });
    await focus(page, 930);
    await wait(page, 1800);
    await snap(page, 'forage');
  },
  // Kopila peeking from the Bud Bush at dusk.
  async kopila(page) {
    await hideHud(page);
    await camp(page, () => {
      const c = window.__phaser.scene.getScene('Camp');
      c.bush.peek(true);
      c.hero.x = 1180;
      c.hero.face(-1);
    });
    await focus(page, 1080);
    await wait(page, 2600);
    const pts = await w2s(page, [[1060, 520]]);
    anchors.kopila = { bush: pts[0] };
    await snap(page, 'kopila');
  },
  // 0:44 sitting by the fire, fireflies.
  async fire(page) {
    await hideHud(page);
    await focus(page, 1180);
    await wait(page, 3500);
    const pts = await w2s(page, [[1160, 545]]);
    anchors.fire = { fire: pts[0] };
    await snap(page, 'fire');
  },
  // 0:52 a rainy night, resting by the lit tent.
  async rain(page) {
    await hideHud(page);
    await camp(page, () => {
      const c = window.__phaser.scene.getScene('Camp');
      c.hero.x = 1230;
      c.hero.face(1);
      c.hero.setPose('sit');
    });
    await focus(page, 1300);
    await wait(page, 3500);
    await snap(page, 'rain');
  },
  // dawn after the rain: the Moon Scale on the shore.
  async scale(page) {
    await hideHud(page);
    await page.evaluate(async () => {
      const st = await import('/src/core/state.ts');
      st.S().mystery.scaleOnShore = true;
      st.S().mystery.step = 1;
      st.S().weather.lastNightRainy = true;
      window.__phaser.scene.getScene('Camp').scene.restart();
    });
    await page.waitForFunction(() => window.__game.sceneKey() === 'Camp' && window.__phaser.scene.getScene('Camp').hero, null, { timeout: 120000 });
    await wait(page, 2500);
    await hideHud(page);
    await camp(page, () => {
      const c = window.__phaser.scene.getScene('Camp');
      c.hero.x = 2100;
      c.hero.face(1);
      c.hero.setPose('stand');
    });
    await focus(page, 2160);
    await wait(page, 2500);
    const pts = await w2s(page, [[2180, 575]]);
    anchors.scale = { scale: pts[0] };
    await snap(page, 'scale');
  },
  // 0:58 Boju's legend: surprised by the scale.
  async legend(page) {
    await hideHud(page);
    await page.evaluate(async () => {
      const st = await import('/src/core/state.ts');
      const m = st.S().mystery;
      m.step = 2;
      m.hasScale = true;
      window.__phaser.scene.getScene('Shop').scene.restart();
    });
    await wait(page, 4200);
    await hideHud(page);
    await page.evaluate(() => {
      const s = window.__phaser.scene.getScene('Shop');
      s.speech?.setVisible(false);
      for (const o of s.children.list) if (o.depth >= 10 && o.depth < 150) o.setVisible(false);
    });
    await snap(page, 'legend');
  },
  // 1:04 Moonlight Momos come out of the steamer.
  async momos(page) {
    await hideHud(page);
    await page.evaluate(async () => {
      const flow = await import('/src/core/flow.ts');
      flow.openOverlay('Cooking', {});
    });
    await page.waitForFunction(() => window.__phaser.scene.isActive('Cooking'), null, { timeout: 60000 });
    await wait(page, 2500);
    await page.evaluate(async () => {
      const st = await import('/src/core/state.ts');
      const inv = await import('/src/systems/inventory.ts');
      const ck = await import('/src/systems/cooking.ts');
      const s = st.S();
      s.gear.steamer = true;
      s.pantry.flour = (s.pantry.flour ?? 0) + 1;
      inv.add('moon_blossom', 1);
      inv.add('night_glowfin', 1);
      delete s.journal.recipes.moon_dumplings;
      const sc = window.__phaser.scene.getScene('Cooking');
      sc.selectCookware('steamer');
      const res = ck.cook('steamer', ['flour', 'moon_blossom', 'night_glowfin']);
      if (res) sc.showResult(res);
    });
    await wait(page, 2500);
    await hideHud(page);
    await snap(page, 'momos');
  },
  // 1:10 the offering and the finale, as a burst of frames.
  async finale_run(page) {
    await hideHud(page);
    await page.evaluate(() => window.__game.timeScale(2));
    await page.evaluate(() => window.__game.act('offering'));
    for (let i = 1; i <= 16; i++) {
      await wait(page, 2500);
      await hideHud(page);
      await hideUi(page, 'Camp', 100, 1e9);
      await snap(page, `finale_${String(i).padStart(2, '0')}`);
      const done = await page.evaluate(() => window.__game.state().mystery.step >= 5);
      if (done) break;
    }
  },
  // the risen guardian, sky open, moonbow (the game's own finale still).
  async finale_still(page) {
    await hideHud(page);
    await wait(page, 4000);
    await hideUi(page, 'Camp', 100, 1e9);
    await snap(page, 'finale_still');
  },
  // 1:22 end card background (title scene without controls) + the logo PNG.
  async title(page) {
    await wait(page, 3000);
    await snap(page, 'title');
    const png = await page.evaluate(() => window.__phaser.textures.getBase64('logo_main'));
    writeFileSync(path.join(OUT, 'logo.png'), Buffer.from(png.split(',')[1], 'base64'));
    console.log('  saved logo.png');
  },
};

const QUERIES = {
  lake_glow: 'scene=camp&state=fresh&time=night&weather=clear&seed=7',
  intro: 'scene=intro&seed=7',
  shop: 'scene=shop&state=midtrip&seed=7',
  dawn: 'scene=camp&state=midtrip&time=dawn&weather=clear&seed=7',
  bite: 'scene=camp&state=midtrip&time=day&weather=clear&shot=bite&seed=7',
  catch: 'scene=camp&state=midtrip&time=day&weather=clear&shot=catch&seed=7',
  forage: 'scene=camp&state=midtrip&time=day&weather=clear&seed=7',
  kopila: 'scene=camp&state=midtrip&time=dusk&weather=clear&seed=7',
  fire: 'scene=camp&state=decorated&time=night&weather=clear&shot=fire&seed=7',
  rain: 'scene=camp&state=midtrip&time=night&weather=rain&seed=7',
  scale: 'scene=camp&state=midtrip&time=dawn&weather=clear&seed=7',
  legend: 'scene=shop&state=midtrip&seed=7',
  momos: 'scene=camp&state=finale&time=night&weather=rain&seed=7',
  finale_run: 'scene=camp&state=finale&time=night&weather=rain&seed=7',
  finale_still: 'scene=camp&state=finale&time=night&weather=rain&shot=finale&seed=7',
  title: 'scene=title&shot=social&seed=7',
};

try {
  for (const [name, fn] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    console.log(`▸ ${name}`);
    const { page, context, errors } = await openGame(browser, base, QUERIES[name] + '&debug=1', vp, { timeout: 180000 });
    try {
      await fn(page);
    } catch (e) {
      console.log(`  ✗ ${name}: ${String(e).slice(0, 300)}`);
    }
    const errs = errors.filter((e) => !e.startsWith('timeout waiting'));
    if (errs.length) console.log('  console errors: ' + errs.join(' | ').slice(0, 400));
    await context.close();
    writeFileSync(anchorsFile, JSON.stringify(anchors, null, 1));
  }
} finally {
  await browser.close();
}
