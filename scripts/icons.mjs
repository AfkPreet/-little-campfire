// npm run icons — renders app icons (32, 180, 192, 512) from Tuki's portrait
// art and a 1200x630 social image (the camp at dusk with the title).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, openGame, ROOT, startServer } from './lib/browser.mjs';

const server = await startServer('dev');
const browser = await launch();
try {
  const { page, context, errors } = await openGame(browser, server.base, 'scene=preview&what=icons&debug=1', { width: 600, height: 400, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  const icons = await page.evaluate(() => window.__icons);
  for (const [size, url] of Object.entries(icons || {})) {
    const file = path.join(ROOT, 'public', 'icons', `icon-${size}.png`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', path.relative(ROOT, file));
  }
  await context.close();
  if (errors.length) console.log('icon errors:', errors.join('\n'));
  const soc = await openGame(browser, server.base, 'scene=title&debug=1&shot=social', { width: 1200, height: 630, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await soc.page.waitForTimeout(2500);
  await soc.page.screenshot({ path: path.join(ROOT, 'public', 'social.png') });
  console.log('wrote public/social.png');
  await soc.context.close();
} finally {
  await browser.close();
  await server.stop();
}
