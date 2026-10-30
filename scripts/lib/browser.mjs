// Shared Playwright helpers for shots/smoke (cross-platform, no bash).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const VIEWPORTS = {
  ipad: { width: 1180, height: 820, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  phone: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

export async function launch() {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
  const opts = { args };
  const alt = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  try {
    return await chromium.launch(opts);
  } catch (err) {
    if (existsSync(alt)) return chromium.launch({ ...opts, executablePath: alt });
    throw err;
  }
}

function freePort(start) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(freePort(start + 1)));
    s.listen(start, '127.0.0.1', () => s.close(() => resolve(start)));
  });
}

async function waitForHttp(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start: ${url}`);
}

/**
 * Start a server unless BASE_URL is given. mode "dev" runs vite dev; "preview"
 * builds first elsewhere and serves dist. Returns { base, stop }.
 */
export async function startServer(mode = 'dev') {
  if (process.env.BASE_URL) return { base: process.env.BASE_URL.replace(/\/$/, ''), stop: async () => {} };
  const port = await freePort(mode === 'dev' ? 5190 : 4190);
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const args = mode === 'dev' ? [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'] : [viteBin, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'];
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForHttp(base + '/');
  } catch (err) {
    child.kill();
    console.error(log);
    throw err;
  }
  return {
    base,
    stop: async () => {
      child.kill();
    },
  };
}

/** Open a page, collect console errors, wait for window.__shotReady. */
export async function openGame(browser, base, query, viewport = VIEWPORTS.ipad, { timeout = 45000, storage } = {}) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    // Vite's dev client chatter is not a game error.
    if (m.type() === 'error' && !m.text().startsWith('[vite]')) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
  if (storage) {
    await page.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    }, storage);
  }
  const url = `${base}/?${query}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout }).catch(() => {
    errors.push(`timeout waiting for __shotReady on ${query}`);
  });
  return { context, page, errors };
}
