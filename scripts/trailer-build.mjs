// node scripts/trailer-build.mjs — builds the trailer page into
// marketing/trailer/site/: the game's audio engine as an inlined IIFE, the
// capture anchors inlined, and only the frames the cut uses, recompressed.
// Run scripts/trailer-frames.mjs first.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { build } from 'vite';
import { ROOT } from './lib/browser.mjs';

const DIR = path.join(ROOT, 'marketing', 'trailer');
const FRAMES = path.join(DIR, 'frames');
const SITE = path.join(DIR, 'site');

// Which captured frame plays each slot of the cut (slot name → capture name).
const PICK = {
  finale_a: 'finale_04',
  finale_b: 'finale_07',
  finale_c: 'finale_10',
};

await build({ configFile: path.join(DIR, 'vite.audio.config.ts'), logLevel: 'warn' });
const audio = readFileSync(path.join(DIR, 'build', 'momo-audio.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const anchors = readFileSync(path.join(FRAMES, 'anchors.json'), 'utf8').trim();

let html = readFileSync(path.join(DIR, 'trailer.html'), 'utf8');
html = html.replace('/*@@AUDIO@@*/', () => audio).replace('/*@@ANCHORS@@*/ {}', () => anchors);

rmSync(SITE, { recursive: true, force: true });
mkdirSync(path.join(SITE, 'frames'), { recursive: true });
const slots = new Set([...html.matchAll(/src: '([a-z0-9_]+)'/g)].map((m) => m[1]));
slots.add('title');
const py = `
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
Image.open(src).convert('RGB').save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
`;
for (const slot of slots) {
  const from = path.join(FRAMES, `${PICK[slot] ?? slot}.jpg`);
  execFileSync('python3', ['-I', '-c', py, from, path.join(SITE, 'frames', `${slot}.jpg`)]);
}
copyFileSync(path.join(FRAMES, 'logo.png'), path.join(SITE, 'frames', 'logo.png'));
writeFileSync(path.join(SITE, 'index.html'), html);
console.log(`trailer built: ${slots.size} frames + logo → ${path.relative(ROOT, SITE)}`);
