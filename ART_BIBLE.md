# Art Bible

The visual spec the game is built against. It extends section 8 of `docs/SPEC.md` and never contradicts it. World-specific parts (setting, layer plan, cast sheets, accents) come from `docs/WORLD.md` and are summarised in Part B.

---

## Part A — Locked rules and engine conventions

### A1. Style

- Side-view storybook. Flat vector shapes with soft gradients and rounded silhouettes; **no sharp corners anywhere**.
- Outlines are a darker shade of the fill at 2-3 px (at 1x) — use `fillOutline()` / `shade()` from `src/art/kit.ts` / `src/palette.ts`. Never black.
- Depth and mood come from colour, mist and glow, not black shadows. Contact shadows are ink-tinted (`softShadow()`), never grey.
- Touchstones (style only, never copy): Alto's Odyssey (parallax, gradients, atmosphere), A Short Hike (cozy pacing), Sumikko Gurashi (soft character simplicity).

### A2. Palette (single source of truth: `src/palette.ts`)

| Token | Hex | Use |
| --- | --- | --- |
| cream | #F6EFE6 | Paper, highlights, UI cards |
| butter | #F2DFA7 | Sunlight, warm accents |
| peach | #F2B8A0 | Dawn, food |
| rose | #D9A0A6 | Flowers, UI accents |
| blush | #EFA3A8 | Cheeks, at 60% alpha |
| lavender | #B9AACB | Mist, far ridges |
| powder | #A9C3D9 | Day sky, water |
| sage | #A8BFA0 | Foliage |
| moss | #7E9C82 | Deep foliage, near trees |
| bark | #8C6F5E | Wood, tent poles, ground edges |
| ink | #4A4250 | Eyes, text, the darkest value (never #000) |
| ember | #F29E6B | Fire; the only saturated warm |
| glow | #FFD59A | Firelight, lanterns, fireflies |

Setting accents live in `ACCENTS` in `src/palette.ts`, HSB saturation <= 40% (ember excepted), each logged in `DECISIONS.md` and listed in Part B. `checkAccents()` verifies them.

Derived colours are allowed only through the helpers (`mix`, `shade`, `tint`, `desaturate`) applied to palette colours — never a free hex in art code.

### A3. Lighting keys

Interpolated smoothly by `src/fx/lighting.ts` (`lightAt(p, rain, mist, golden)`), anchors in `src/data/time.ts`. Each key also tints every layer by depth band.

| Key | Sky top | Horizon | Mood |
| --- | --- | --- | --- |
| Dawn | #C9B6D6 | #F4C9B8 | Lavender to peach, low mist |
| Day | #A9C9E3 | #E8F0EC | Clear and airy, light shadows |
| Golden hour | #E8C3A0 | #F6E3B4 | Warm rim light on everything |
| Dusk | #8E86B5 | #E9A9A6 | Purple-pink, first stars |
| Night | #2F3558 | #5B5E86 | Soft indigo, never black; warm firelight pool |
| Rain (overlay) | blend 40% toward #9AA6B8 | same | Desaturate 30%, thicker mist, cooler |

How relighting works (cheap, no per-frame redraws):

1. **Art is drawn in neutral daylight colours.** Each band is multiply-tinted by its key colour (`far`, `mid`, `near`, `ground`, `actor`, `water` in `LIGHT`).
2. **Haze bands** (white gradient textures tinted with the key's `haze` colour, alpha by `hazeAlpha`) sit between depth bands to give atmospheric perspective and mist; rain and misty mornings raise them.
3. **Sky** is white textures with 4-corner vertex tints (a free gradient) in 2-3 stacked bands: skyTop → skyMid → horizon.
4. **Warm light** (fire, lanterns) is additive glow sprites scaled by `warmLight`; they also warm actors near them.
5. **Rain** blends every colour 40% toward #9AA6B8 and desaturates 30% inside `lightAt`, so everything that reads a `ResolvedLight` relights automatically.
6. **Vignette**: the `vignette` texture stretched over the view, alpha = key `vignette` (stronger at night).

### A4. Depth and atmosphere

- Bands and scroll factors (`PARALLAX` in `src/data/camp.ts`): sky 0, far ridges 0.1, mid hills/forest 0.25, near trees 0.5, ground 1.0, foreground grass/leaves 1.3 (partly overlapping the scene).
- Farther bands are lighter, lower in contrast and tinted toward the horizon colour. Mist drifts slowly between ridges.
- Water reflects the scene: mirrored layers at lower alpha with a gentle horizontal ripple, a sun or moon path, raindrop rings in rain.
- Render depths are fixed in `DEPTH` (`src/config.ts`).

### A5. Characters

- Kawaii proportions: head at least as big as the body, a bean or round silhouette, stubby limbs.
- Big ink oval eyes with 1-2 cream highlight dots, a tiny mouth, blush ovals at 60% alpha, no realistic nose.
- Built from separate parts (head, body, ears, eyes, limbs, tail) on the shared `Rig` (`src/chars/rig.ts`), origin at the feet.
- Expressions: neutral, happy (^ ^), blissful (closed eyes, bigger blush, floating hearts or notes), surprised (on a bite), sleepy (night), munching (cheeks puff).
- Idle: breathing (scaleY 1.00 → 1.03 on a 2.4 s sine), blinks every 2-5 s, an ear or tail flick, eyes glancing toward nearby interactables, plus the hero's quirk.
- Walk: bouncy hop-walk (4-6 px bob), squash on landing (0.92 / 1.06), tiny dust puffs.
- The hero must read at 90-120 px tall.

### A6. Motion and juice

- easeOutBack for pops, easeInOutSine for loops (`EASE` in `src/fx/juice.ts`). Nothing moves linearly except rain.
- Every pickup, button press and spawn squashes and stretches (0.85 / 1.15, then settles) — `squash()`, `popIn()`.
- Wind: grass blades sway with per-blade phase, trees sway, gusts every 8-15 s move lanterns, chimes and flags.
- Particles (`src/fx/particles.ts`): fireflies (20-40 at night, noise-driven wander, glow pulse), embers, steam, 2-layer rain with splashes and drips off the tent edge, drifting petals or leaves by day, sparkles on discoveries. Budget ~400 live particles, pooled.
- Light: a flickering firelight pool at night (radial, additive) that warms the hero and tent; lantern pools; soft pre-baked bloom sprites on fire, fireflies, moon, lanterns and the guardian; a subtle vignette, stronger at night.
- Reduce motion: no camera easing or nudges, fewer particles, stir becomes hold.

### A7. UI kit

- Rounded cards (radius 20 px), soft shadows tinted with ink (blur 12, y 4, alpha 0.15), faint paper grain; buttons squish on press.
- Fonts (self-hosted via @fontsource): **Baloo 2** for UI (400/600/700), **Patrick Hand** for the journal and banners. Text is always created with `txt()` so it renders at the camera zoom (crisp on Retina).
- Rarity shows as stars, never by colour alone. Nothing red. Every touch target >= 44 pt. No hover-only UI.

### A8. Composition

- The hero sits on the lower third (feet line y = 612 of 720); the top 40% of the frame is mostly sky and ridges.
- At most 3 interactables glow at once, and only when the hero is near (a soft breathing outline).

### A9. Never

Pure black or white, neon, harsh red, grey drop shadows, hard-edged boxes, emoji as art, placeholder rectangles, photos, or any copied character or logo.

### A10. Pipeline

- One module per thing in `src/art/` exporting `bake(b: Baker)`; textures are drawn once at boot at `ART_SCALE` (2-2.5x) and shown at `1/ART_SCALE` via `art()` / `artObj()` / `Strip`.
- Wide bands use `b.strip()` (auto-chunked to <= 2048 device px).
- Draw functions work in logical px; they may only use palette colours and kit helpers.
- `?scene=preview&what=<name>` shows any `*.preview.ts`; `?scene=styleboard&page=N` shows the M0 style board.

---

## Part B — The world

_Filled in from `docs/WORLD.md` at M0: setting and layer plan, how each lighting key looks here, cast sheets, accents, UI motifs._
