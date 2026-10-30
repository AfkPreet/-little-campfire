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

## Part B — The world: Moonlight Momos at Junkiri Danda

Source of truth: `docs/WORLD.md` (section numbers in brackets). This part is the build-facing summary.

### B1. Setting [3.1]

- **Junkiri Danda** ("Firefly Ridge"): a fictional monsoon ridge at ~3,000 m in Sikkim/Darjeeling-style hills. Rhododendrons (*gurans*), cryptomeria (*dhupi*), hill bamboo (*malingo*).
- **Jun Pokhari** ("Moon Pond"): a small round jade lake whose mist is the guardian breathing.
- Beyond the lake: a **sea of cloud**, one nearer **tea-and-hill-town ridge** (4 tea stripes, 4 tin-roofed houses whose 5 windows light up at dusk like a necklace) and the **Snow Grannies**, pillow-round snow peaks that blush at dawn (never a real mountain).
- Next campsite (teaser only): **Sunthala Bend**, a warm orange-orchard river bend.

### B2. Camp layout [3.2] — implemented in `src/data/camp.ts`

World 2800 x 720. Walk line y 585; dock deck y 575; lake horizon y 452; back rim of the clearing y 500; foreground band 610-720.

Left to right: shop path exit + corner of Boju's store (0-160) → bamboo path with 3 slabs (160-520) → clearing (520-1990): katus tree 560, sisnu patch 660, tent spot A 780, ainselu bush 930, mossy log 1020, Bud Bush 1060 (back rim), **fire 1160**, tent spot B 1320 (default), ainselu bush 1470, mossy log 1560, tent spot C 1700, hammock trunks 1840 + 1990 → shore (1990-2240): Moon Gurans bush 2120, Moon Scale 2180 → dock (2240-2520, cast from 2500) → open water to 2800 (Kuhiro rises at 2660; first-night glow at 2700, 470).

### B3. Depth bands [3.4]

| Band | Scroll | Content | Key colours |
| --- | --- | --- | --- |
| Sky | 0 | 3 vertex-tinted gradient bands, sun with bloom, moon with lavender halo, pillow cumulus, stars, Milky Way, **the Gurans constellation** (6 stars in a flower) | lighting keys |
| Snow Grannies | 0.07 | 5 rounded snow peaks (corner radius 20-25%, asymmetric shoulders, lit/shade split), alpenglow masks | snow, snow-shade, ridge-far, alpenglow |
| Cloud sea | 0.08-0.1 | the signature horizon at 38-45% height; rises at dawn, in rain and on misty mornings | cloud-sea |
| Far ridges | 0.1 | smooth ridgelines with tree-dome bumps; cloud spill through a saddle (40 s loop) | ridge-far, cloud-spill |
| Valley ribbons | 0.18 / 0.35 | soft long mist ellipses | lavender over cream |
| Mid ridge | 0.25 | tea terraces, 4 hill houses + window necklace, 2 waterfall threads (5 in rain) | ridge-near, tea-green, tin-* |
| Near trees | 0.5 | far-shore forest: dhupi cones, rhododendron domes, malingo fans; reed line; rain steam curls; dusk junkiri ribbon | dhupi, moss, gurans, malingo, reed |
| Water | 0.5 → 1.0 | jade lake, mirrored far/mid/near rows that ripple, sun/moon path, glints, rain rings, under-glow | lake-jade → lake-deep, lake-glow |
| Lake-breath | 0.55-0.6 | low wisps hiding near-tree bases | cream |
| Ground | 1.0 | scalloped grass, boulders, slabs, firepit, spots, pebbles, dock, shop corner, two framing rhododendrons | sage, moss, bark, stone, pebble, shop-wood |
| Foreground | 1.3 | big rhododendron leaves, grass with seed heads, fiddleheads (≤ 20% of frame); rain beads | moss -8%, sage, butter rim |

Max 3 plant species per near/foreground band. Atmospheric tint toward the horizon: snow 70%, far 55%, mid 40%, near 20%, ground 0%, foreground -8%.

### B4. Lighting in this world [4]

- **Dawn** — "the Grannies blush first": alpenglow on the top 30% of peaks, peach ridge rims, high lavender-cream cloud sea, thick lake-breath, window necklace switches off, dew glints.
- **Day** — airy and legible: pillow cumulus, cloud banner off the Eldest Granny, jade lake with cream glints, drifting gurans petals.
- **Golden hour** — two-tone rims: butter on the sun side of every rounded mass, lavender in shade; honey cloud sea; butter sun path; backlit seed heads.
- **Dusk** — rose peaks with a lavender shadow climbing them, window necklace switching on 0.4 s apart, first junkiri.
- **Night** — three tiers of light: stars + Milky Way + Gurans constellation above; window dots and a moon-blue ghost range across the valley; junkiri, firelight pool, tent glow and laltin pools below.
- **Rain** — snows fade, the cloud sea swallows the far ridges, waterfall threads 2 → 5, walking mist, steam curls, drips from leaves, tent and dock; the tent doorway glows warm.
- **Misty morning** — the cloud sea sits at camp level, everything far ghosted, ground mist burns off by midday.

Band target colours per key are in WORLD 4; the engine reaches them via the `LIGHT` tints in `src/palette.ts`.

### B5. Cast [5] — quick sheets

| Character | Species / size | Silhouette keys | Colours | Signature |
| --- | --- | --- | --- | --- |
| **Tuki** (hero) | large-eared pika, 104 px | one round tea-bun bean, big round ears with pale rims, **no tail**, the **doko** cone basket always poking up behind | oat, oat-shade, oat-line, peach ears, cream muzzle; doko, doko-band | the *haymaker* quirk (plucks a flower, tucks it in the doko; fill grows with Contentment tier); the *ghum* rain hood (never a leaf umbrella) |
| **Boju** (shopkeeper) | grandmother yak (*dri*), ~250 px bust | haystack fur mound, squircle head, 5-tuft fringe above the eyes, short horns | yak, yak-face, horn, rose + butter knitwear | knitted **horn cosies** with pom-poms, muffler, brass bell, always knitting; doubled-word speech |
| **Kopila** (companion) | Chinese pangolin pup, 48 px (34 curled) | egg body, big head, 3 rows of rose-taupe petal scales, wrapping tail, no claws | pango, pango-light, pango-face | curls into a **bud-ball** identical to the Bud Bush's rhododendron buds; one-eye peek |
| **Kuhiro** (guardian) | great mist-fish, ~560 x 300 visible | one huge rounded bean, cloud-scale back, petal-shaped fins, two-lobed tail, no whiskers | mist-lavender → mistfish → moonmilk; fish-glow halo; mistfish-line (the only cool outline) | 6 **Gurans freckles** that match the night constellation; gill-breath = lake mist |

### B6. Accents [8]

74 world accents live in `ACCENTS` (`src/palette.ts`), all at or below 40% HSB saturation. Groups: world & sky, water, plants/ground/forage, kitchen/shop/UI, Tuki, Boju, Kopila, Kuhiro, fish. Use them by their WORLD.md names: `A['lake-jade']`, `A.gurans`.

### B7. UI motifs [6]

- Journal: **lokta paper** (`lokta`) with fibre specks, deckled rounded edge, tied with `jute` string; catch cards share it.
- Contentment HUD: a tiny tin **tuki lamp** whose flame grows each tier.
- Currency: copper rupee coin (gurans emboss, ₹ stamp); amounts always `₹120`, set in Baloo 2.
- Essentials: a small gurans-leaf tag. Basket tray icon: a mini doko.

### B8. Never (this setting) [6]

Prayer flags or anything that reads as them (Wool Bunting is always 3-colour **triangles** on one curved line), chortens, mani stones, prayer wheels, temple/monastery roofs, butter lamps, singing bowls, khadas, ritual masks, scripts, lotus motifs, nagas, deities; real sacred places by name; costumes on animals; khukuri, alcohol, porter imagery; leaf umbrellas; any altar/incense/lamp/garland/bowing at the offering. Kuhiro is never caught, hooked or netted.
