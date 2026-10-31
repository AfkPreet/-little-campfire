# Handoff — Moonlight Momos

_A tiny camping trip. Browser game, touch-first, iPad landscape. Vite + TypeScript + Phaser 3.90, everything drawn in code._

Read this first when you pick the project back up. The locked spec is `docs/SPEC.md`; the locked world is `docs/WORLD.md`; every decision is in `DECISIONS.md`; the visual rules are in `ART_BIBLE.md`; screenshot scores per milestone are in `REVIEW.md`; music prompts are in `MUSIC_BRIEF.md`.

## 1. What was built

- **The world:** Junkiri Danda, a fictional monsoon ridge in Sikkim/Darjeeling-style hills; the lake Jun Pokhari; the Snow Grannies behind a sea of cloud. Hero **Tuki** (a large-eared pika with a doko basket), shopkeeper **Boju** (a grandmother yak who knits horn cosies), companion **Kopila** (a pangolin pup that hides as a rhododendron bud), guardian **Kuhiro** (a great glowing mist-fish). Money is rupees, written `₹120`.
- **The loop:** title → storybook intro → Boju's shop (Day-1 essentials) → camp: pitch the tent by tapping pegs, forage 7 spots, fish from the dock or shore (tap timing, catch cards, bait), cook at the fire (drag up to 3 ingredients, stir in circles, 16 recipes + Mystery Mush), eat / save / share, decorate (11 items on snap points), rest in the doorway in rain, sit by the fire, sleep → day summary → dawn.
- **Systems:** soft 8-minute clock (pauses in menus), weather with its guarantees (Day 1 clear, Night 4 rains, rain after the dumplings), positive-only Contentment with tiers, the journal (36 stamps across Fish/Recipes/Moments/Friends/Mystery/Trip, badges), the companion (peek → share on 3 days → befriended), rare moments, the 5-clue mystery and the ~45 s finale, the Trip Album, free play and new trips.
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
npm run shots -- m4  # milestone screenshots (iPad + phone @2x) to shots/m4/
npm run icons        # app icons + social image from the game's own art
```

Playwright uses its bundled Chromium. On a fresh machine run `npx playwright install chromium` once.

**Debug URL params** (dev builds, or add `?debug=1`): `?scene=camp|shop|title|intro|album|journal|cooking|styleboard|preview`, `?state=fresh|midtrip|decorated|finale`, `?time=dawn|day|golden|dusk|night`, `?weather=clear|rain|mist|golden`, `?day=N`, `?seed=N`, `?shot=fire|bite|catch|cook|journal|finale|star|rainbow`, `?page=1..3` (style board), `?what=<module>` (previews, e.g. `hero`, `landscape`, `props`, `items`, `cast`, `kuhiro`, `ui`, `audio`).

`window.__game` (dev or `?debug=1`): `state()`, `money(n)`, `buy(id)`, `pitch(spot)`, `fish()`, `forage(spot)`, `cook(cookware, ings, then)`, `place(id, point)`, `setTime(t)`, `setRain(b)`, `sleepNow()`, `startTrip()`, `continueTrip()`, `goto(scene)`, `sceneKey()`, `finale()`, `w2s(x,y)`, `interAt(x,y)`, `campInfo()`, `fishPhase()`.

## 4. Known issues

_Updated at M4._

## 5. Top 5 next ideas

_Updated at M4._

## 6. Paste-ready prompt to resume

```
You are continuing "Moonlight Momos" (repo AfkPreet/-little-campfire, branch claude/new-session-4zrkb5).
Read HANDOFF.md, then docs/SPEC.md (locked spec), docs/WORLD.md (locked world), ART_BIBLE.md,
DECISIONS.md and REVIEW.md. Run `npm install`, `npm run dev`, `npm run smoke` and `npm run playtest`
to confirm everything passes before changing anything. Keep every number in src/data unchanged,
every colour from src/palette.ts, and every UI string in src/data/dialogue.ts. Log new decisions in
DECISIONS.md (chosen / rejected / why) and screenshot-review any visual change (`npm run shots`).
Task: <what you want next>.
```
