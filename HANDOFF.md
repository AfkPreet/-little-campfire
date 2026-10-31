# Handoff — Moonlight Momos

_A tiny camping trip. Browser game, touch-first, iPad landscape. Vite + TypeScript + Phaser 3.90, everything drawn in code._

Read this first when you pick the project back up. The locked spec is `docs/SPEC.md`; the locked world is `docs/WORLD.md`; every decision is in `DECISIONS.md`; the visual rules are in `ART_BIBLE.md`; screenshot scores per milestone are in `REVIEW.md`; music prompts are in `MUSIC_BRIEF.md`.

## 1. What was built

- **The world:** Junkiri Danda, a fictional monsoon ridge in Sikkim/Darjeeling-style hills; the lake Jun Pokhari; the Snow Grannies behind a sea of cloud. Hero **Tuki** (a large-eared pika with a doko basket), shopkeeper **Boju** (a grandmother yak who knits horn cosies), companion **Kopila** (a pangolin pup that hides as a rhododendron bud), guardian **Kuhiro** (a great glowing mist-fish). Money is rupees, written `₹120`.
- **The loop:** title → storybook intro → Boju's shop (Day-1 essentials) → camp: pitch the tent by tapping pegs, forage 7 spots, fish from the dock or shore (tap timing, catch cards, bait), cook at the fire (drag up to 3 ingredients, stir in circles, 16 recipes + Mystery Mush), eat / save / share, decorate (11 items on snap points), rest in the doorway in rain, sit by the fire, sleep → day summary → dawn.
- **Systems:** soft 8-minute clock (pauses in menus), weather with its guarantees (Day 1 clear, Night 4 rains, rain after the dumplings), positive-only Contentment with tiers, the journal (36 stamps across Fish/Recipes/Moments/Friends/Mystery/Trip, badges), the companion (peek → share on 3 days → befriended), rare moments, the 5-clue mystery and the ~45 s finale, the Trip Album, free play and new trips.
- **Verified:** `npm run smoke`, `npm run playtest` and `npm run trip` pass with no console errors; every final screenshot scores 4+ (see `REVIEW.md`); `shots/m4/` holds the final set.
- **Audio:** fully synthesised SFX, ambience beds and a generative lo-fi fallback score (bansuri-like flute lead, D major pentatonic). Optional music files in `public/audio/` are detected at boot (see `MUSIC_BRIEF.md`).

## 2. Where each system lives

| Area | Files |
| --- | --- |
| Boot, scene registry, previews | `src/scenes/Boot.ts`, `src/scenes/index.ts`, `src/scenes/Preview.ts` |
| Resolution / DPR / safe areas | `src/core/layout.ts` |
| Save, state shape, migrations | `src/core/state.ts` (versioned key `little-campfire/save`) |
| Scene transitions | `src/core/flow.ts` |
| Debug presets + `window.__game` | `src/core/presets.ts`, `src/core/hooks.ts`, `src/core/debug.ts` |
| Colours, lighting keys, accents | `src/palette.ts`, `src/fx/lighting.ts`, `src/data/time.ts` |
| Content tables (numbers locked) | `src/data/*.ts` (ids in `ids.ts`, names from the WORLD reskin) |
| All UI strings | `src/data/dialogue.ts` |
| Game logic (pure, no Phaser) | `src/systems/*.ts` |
| Procedural art | `src/art/*.ts` (each exports `bake(b)`, auto-baked at boot) |
| Characters | `src/chars/rig.ts` (base), `Hero.ts`, `Boju.ts`, `Kopila.ts`, `Kuhiro.ts` |
| Landscape + props | `src/world/Landscape.ts`, `src/world/props.ts`, `src/world/skyMoments.ts`, `src/world/wind.ts` |
| Camp hub + controllers | `src/camp/CampScene.ts` and `Fishing.ts`, `DecorMode.ts`, `DecorUse.ts`, `Guardian.ts`, `Moments.ts`, `CompanionCtl.ts` (registered via `registry.ts`) |
| Shop, title, intro | `src/shop/ShopScene.ts`, `src/title/TitleScene.ts`, `src/title/IntroScene.ts` |
| Overlays | `src/scenes/Hud.ts`, `Cooking.ts`, `Journal.ts`, `Summary.ts`, `Settings.ts`, `Album.ts` |
| UI kit | `src/ui/*` (Button, Card, Toast, Banner, Bubble, Dialog, Slider, Toggle, Tabs, Stepper, CatchCard, `pinToScreen`) |
| Particles, juice | `src/fx/particles.ts`, `src/fx/juice.ts` |
| Audio | `src/audio/engine.ts` (public API), `sfx.ts`, `ambience.ts`, `music.ts`, `score.ts` |

## 3. Running it

```
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build to dist/
npm run smoke        # plays Day 1 via debug hooks, reloads, checks the save
npm run playtest     # drives the real touch paths (pegs, bush, water, bite, Keep, fire, sleep dialog)
npm run trip         # a whole trip: 5 clues, the finale, Night 7, Trip Album, free play, mid-day reload
npm run shots -- m4  # milestone screenshots (iPad + phone @2x) to shots/m4/
npm run icons        # app icons + social image from the game's own art
npm run screens      # 1x shots of every journal tab, shop tab, settings, summary and album page (dev server running)
npm run perf         # objects, live particles, tweens, texture MB per scene; bundle size (after a build)
```

Playwright uses its bundled Chromium. On a fresh machine run `npx playwright install chromium` once.

**Debug URL params** (dev builds, or add `?debug=1`): `?scene=camp|shop|title|intro|album|journal|cooking|styleboard|preview`, `?state=fresh|midtrip|decorated|finale`, `?time=dawn|day|golden|dusk|night`, `?weather=clear|rain|mist|golden`, `?day=N`, `?seed=N`, `?shot=fire|bite|catch|cook|journal|finale|star|rainbow`, `?page=1..3` (style board), `?what=<module>` (previews, e.g. `hero`, `landscape`, `props`, `items`, `cast`, `kuhiro`, `ui`, `audio`).

`window.__game` (dev or `?debug=1`): `state()`, `money(n)`, `buy(id)`, `pitch(spot)`, `fish()`, `forage(spot)`, `cook(cookware, ings, then)`, `place(id, point)`, `setTime(t)`, `setRain(b)`, `sleepNow()`, `startTrip()`, `continueTrip()`, `goto(scene)`, `sceneKey()`, `finale()`, `w2s(x,y)`, `interAt(x,y)`, `act(id, action?)` (run any camp interactable, e.g. `scale`, `offering`, `fire`), `content(n)`, `skipNight(sec)`, `campInfo()`, `fishPhase()`, and in the album `albumInfo()`, `albumTurn(d)`, `albumStay()`, `albumNewTrip()`.

## 4. Deploying

The repo carries `vercel.json` (Vite preset, `npm ci`, `npm run build`, output `dist/`, long cache on hashed assets). Either:

- **One-time import (recommended):** vercel.com → Add New → Project → import `AfkPreet/-little-campfire`, set the production branch to `claude/new-session-4zrkb5` (or merge it into `main` first), Deploy. Every push redeploys.
- **CLI:** `npx vercel login`, then `npx vercel --prod` from the repo root.

On Vercel builds `og:image` becomes absolute automatically (`VERCEL_PROJECT_PRODUCTION_URL`); elsewhere set `SITE_URL=https://your.host` when building. `npm run icons` regenerates the app icons and `public/social.png`.

## 5. Known issues

1. **Not deployed from the build box.** The connected Vercel account returned 403 on project create and deploy, and the container has no Vercel CLI login. See section 4; it is a one-time import.
2. **Frame rate unmeasured on real hardware.** The build box renders WebGL in software, so 60 fps on iPad is unverified. `npm run perf` reports the budgets that do carry over (objects, live particles, textures, bundle); first thing to check on a real iPad.
3. **iOS Safari specifics** (audio unlock on first tap, safe areas, Add to Home Screen) were exercised in Chromium's iPad emulation only.
4. **Balance is untested by a human.** `npm run trip` proves the whole trip flows (all 5 clues, finale, Album, free play, reload) but fast-forwards the night timer and tops Contentment up if it is short of 70 on the finale night.
5. **Phone landscape is secondary:** journal body text is about 10 CSS px on a 390 px-tall phone. Large text helps.
6. **Texture memory:** about 227 MB of baked textures at art scale 2.25 (iPad Retina). Fine on current iPads; on an older one that reloads under memory pressure, cap `ART_SCALE` at 2 in `src/core/layout.ts` (about 20% less).
7. **Cosmetic:** in the finale the moon shows as a bright smudge inside the moonbow; the shop's warm-wood room is pale behind the cream catalog.
8. **No music files yet.** The generated score plays; drop the four files from `MUSIC_BRIEF.md` into `public/audio/`.

## 6. Top 5 next ideas

1. **Real-iPad pass:** profile in Safari, tune particle counts and glow sizes, confirm audio unlock and safe areas.
2. **Music:** generate the four Higgsfield tracks from `MUSIC_BRIEF.md` (no code change needed).
3. **Sunthala Bend:** the second campsite the postcard teases (an orange-orchard river bend; new fish, a new guardian-adjacent mystery).
4. **Photo postcard:** a camera button that frames the camp and saves a shareable postcard PNG.
5. **Seasonal nights:** rare festival moments (a Tihar lights night, a monsoon frog chorus) that feed the Moments tab.

## 7. Paste-ready prompt to resume

```
You are continuing "Moonlight Momos" (repo AfkPreet/-little-campfire, branch claude/new-session-4zrkb5).
Read HANDOFF.md, then docs/SPEC.md (locked spec), docs/WORLD.md (locked world), ART_BIBLE.md,
DECISIONS.md and REVIEW.md. Run `npm install`, `npm run dev`, `npm run smoke` and `npm run playtest`
to confirm everything passes before changing anything. Keep every number in src/data unchanged,
every colour from src/palette.ts, and every UI string in src/data/dialogue.ts. Log new decisions in
DECISIONS.md (chosen / rejected / why) and screenshot-review any visual change (`npm run shots`).
Task: <what you want next>.
```
