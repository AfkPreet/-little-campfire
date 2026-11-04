// node scripts/trailer-build.mjs — builds the trailer page into
// marketing/trailer/site/: the game's audio engine as an inlined IIFE, the
// capture anchors inlined, and only the frames the cut uses, recompressed.
// Run scripts/trailer-frames.mjs first.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { build } from 'vite';
import { ROOT } from './lib/browser.mjs';

const DIR = path.join(ROOT, 'marketing', 'trailer');
const FRAMES = path.join(DIR, 'frames');
const SITE = path.join(DIR, 'site');

// Which captured frame plays each slot of the cut (slot name → capture name).
const PICK = {
  finale_a: 'finale_11',
  finale_b: 'finale_13',
  finale_c: 'finale_15',
  finale_d: 'finale_16',
};

await build({ configFile: path.join(DIR, 'vite.audio.config.ts'), logLevel: 'warn' });
const audio = readFileSync(path.join(DIR, 'build', 'momo-audio.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const anchors = readFileSync(path.join(FRAMES, 'anchors.json'), 'utf8').trim();

let html = readFileSync(path.join(DIR, 'trailer.html'), 'utf8');
html = html.replace('/*@@AUDIO@@*/', () => audio).replace('/*@@ANCHORS@@*/ {}', () => anchors);

rmSync(SITE, { recursive: true, force: true });
mkdirSync(path.join(SITE, 'frames'), { recursive: true });
const slots = new Set([...html.matchAll(/src: '([a-z0-9_]+)'/g)].map((m) => m[1]));
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
execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1])
w = 1000
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save(sys.argv[2], optimize=True)
`, path.join(FRAMES, 'logo.png'), path.join(SITE, 'frames', 'logo.png')]);
// Embed every frame as a data URI (the artifact viewer does not resolve relative image paths).
const frames = {};
for (const f of readdirSync(path.join(SITE, 'frames'))) {
  const name = f.replace(/\.(jpg|png)$/, '');
  frames[name] = `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(path.join(SITE, 'frames', f)).toString('base64')}`;
}
html = html.replace('/*@@FRAMES@@*/ null', () => JSON.stringify(frames));
writeFileSync(path.join(SITE, 'index.html'), html);
console.log(`trailer built: ${slots.size} frames + logo embedded, page ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB → ${path.relative(ROOT, SITE)}`);
