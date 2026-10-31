# Screenshot review

Every milestone ends with `npm run shots -- <milestone>` (iPad landscape 1180 x 820 @2x and phone landscape 844 x 390 @2x, PNGs in `shots/<milestone>/`) and a scored review. Anything scoring 3 or below gets fixed, re-shot and re-scored, up to 3 polish rounds per milestone.

**Rubric (1-5 each)**

1. Serene at a glance
2. Kawaii
3. Palette and lighting match the bible
4. Clear depth (4+ bands, atmospheric fade)
5. Zero placeholder or unstyled elements
6. No harsh edges, pure black or white, or clutter
7. Legible text and touch targets of 44 pt or more
8. Would this screenshot make someone want to play?

Scores are written as `serene / kawaii / palette / depth / no-placeholder / no-harsh / legible / want-to-play`.

---

## M0 — world and style board

Shots reviewed at 1x on iPad landscape during M0 (the box renders WebGL in software, so iteration shots are 1x; the milestone set at 2x is in `shots/m0/`). Format: `serene / kawaii / palette / depth / no-placeholder / no-harsh / legible / want-to-play`.

### Round 1 (first look)

| Shot | Scores | Problems |
| --- | --- | --- |
| UI kit sheet | 5/5/5/4/5/5/5/5 | Preview text still used spec names (cosmetic, preview only) |
| Logo | 4/3/5/–/5/5/5/4 | Momo "o"s read as shells (pleats fanned from the base); crescent moon looked like a ring |
| Cooking result | 4/4/4/–/3/2/5/4 | Flames additive-blended to pure white on the dark scrim; item icons were placeholder stars (icons not built yet) |
| Journal cover | 5/5/5/–/5/5/4/4 | Stamp grid overflowed the paper; emboss overlapped stamps |
| Shop | 5/5/5/4/4/5/2/4 | HUD collided with tabs; tab labels clipped; coin icon oversized; header missing (created but never added) |
| Style board · world | 3/4/5/2/5/3/5/3 | Thumbnails broken: container mode only built one view width, so the right half was empty |
| Style board · cast | 5/5/5/–/5/5/3/5 | Bottom-row labels covered by the palette strip; Kuhiro cramped |
| Camp · day | 5/5/5/5/5/5/5/5 | (first full integration) clearing slightly empty before the ground pass |
| Camp · night (decorated) | 5/5/5/5/5/5/5/5 | — |
| Camp · dawn / golden | 5/5/5/5/5/5/5/5 | — |
| Camp · rain | 4/5/4/4/5/2/5/4 | Rain-cloud ceiling ended in a hard vertical edge; faded snows left their outlines as thin white lines |
| Title | 4/5/5/5/5/5/5/4 | Buttons covered Tuki and the fire |
| Tuki sheet | 5/5/5/–/5/5/5/5 | — |

### Fixes

- Logo: momo pleats now curve into a twisted knot; crescent redrawn and tucked into the M; soft ink drop shadow.
- Cooking: flames normal-blended with ember → glow → butter tints; warm-tinted stones and logs; icons now real (61 baked).
- Journal: stamp grid fits the page; emboss moved to the board.
- Shop: catalog sits between the HUD's rows; tab labels auto-fit; coin icon fixed; header uses `txt`; exit button clear of HUD.
- Style board: uses the landscape's virtual camera (`viewX`); cast page re-laid out.
- Landscape (agent pass): worn path, moss and pebbles in the clearing; sturdier rhododendron trunks with root flares; soft rock wedges; rain no longer leaves snow outlines.
- Title: buttons below the walk line.
- HUD: settings button moved beside the lamp (it collided with toasts).

---

## M1 — vertical slice (milestone set at 2x, `shots/m1/`)

`npm run smoke` and `npm run playtest` pass with no console errors. Shots at iPad 1180 x 820 @2x and phone 844 x 390 @2x.

### Round 1

| Shot | Scores | Problems |
| --- | --- | --- |
| Style board · cast | 5/5/5/–/5/5/5/5 | — |
| Style board · world | 5/5/5/5/5/3/5/4 | Rain thumbnail: vertical step in the cloud ceiling; empty lower third on iPad |
| Style board · UI | 5/5/5/–/4/5/5/5 | Preview text still said "Pebble Minnow" (the world name is Pebble Garra) |
| Title (iPad, phone) | 5/5/5/5/5/4/5/5 | Faint white rim along the snow peaks |
| Shop (iPad, phone) | 5/5/4/4/5/5/5/4 | Warm-wood room is pale behind a cream catalog (low contrast, not a bug: no overlay found); phone Camp tab leaves an empty lower half (3 items) |
| Camp · dawn / day / golden | 5/5/5/5/5/3/5/5 | Pillow clouds ended in a square vertical stub where the flat base cut the end lobes |
| Camp · dusk | 5/5/5/5/5/4/5/5 | Kopila peeking + toast read well |
| Camp · night (fire) | 5/5/5/5/5/5/5/5 | — |
| Camp · rain | 4/5/5/5/5/3/5/4 | Ceiling alternated two cloud tiles baked in different tones (vertical step at every seam); the solid band above was lighter than the cloud body (horizontal line) |
| Fishing bite (iPad, phone) | 5/5/5/5/5/5/5/5 | — |
| Catch card | 5/5/5/–/5/5/5/5 | — |
| Cooking result | – | Not captured: under load the overlay had not opened when the shot fired (camp at dusk instead). Re-shot alone in round 2 |
| Decorated night | 5/5/5/5/5/2/5/4 | Tuki blown out to a glowing blob: the paper lantern's additive halo on the tent drew above the actor layer |
| Journal · fish (iPad, phone) | 4/5/5/–/5/4/2/3 | Wrapped flavor lines overlapped the "Best · Caught" line; flavor ran under the stamp; HUD pills peeked out between the journal tabs and under the close button |
| Mystery finale | 5/5/4/5/5/3/5/5 | Parting the rain ceiling slid its tiles apart, exposing square tile ends as a hard vertical edge in the sky |
| Trip Album · cover (iPad, phone) | 5/4/5/–/5/5/5/4 | Cover is a little plain (title + logo only) |

### Fixes (round 1 → 2)

- Rain ceiling: one self-tiling cloud texture (no seams); the solid band above takes the cloud body's colour; when the sky opens the ceiling dissolves instead of splitting.
- Pillow clouds: the flat base now has rounded ends at the cloud's real extent.
- Decor light: every decor glow (lanterns, string lights, jars) sits just below the actor layer, so Tuki occludes it instead of being washed out by it.
- Journal: entry lines stack top-down by measured height and wrap clear of the stamp; mystery clue text is top-aligned; the HUD hides while the journal is open.
- Style board: world thumbnails fill the page height; UI page uses the world's fish name.

### Round 2

| Shot | Scores | Problems |
| --- | --- | --- |
| Style board · world | 5/5/5/5/5/4/5/4 | Fills the page now; narrower thumbnails were dominated by the big tree (re-anchored left) |
| Camp · day (clouds) | 5/5/5/5/5/5/5/5 | Rounded cloud bases |
| Camp · rain | 4/5/5/5/5/3/5/4 | No more seams, but the solid band overlapped the cloud body where its gradient is lighter (horizontal line) |
| Cooking result (iPad, phone) | 4/5/5/–/5/3/4/4 | Now captured (the `cook` shot handler was missing). The result card landed on the cookware tabs (labels clipped behind it); HUD pills and toast showed through the scrim, close button over the day pill |
| Decorated night | 5/5/5/5/5/5/5/5 | Tuki lit by the fire only |
| Journal · fish | 5/5/5/–/5/5/5/5 | Clean rows, HUD tucked away |
| Mystery finale | 5/5/4/5/5/4/5/5 | Ceiling dissolves; the moon shows as a bright smudge inside the moonbow (acceptable) |

### Fixes (round 2 → 3)

- Rain band moved behind the cloud tiles and ends just under their top edge, where both are exactly the same colour.
- Cooking: registered the `cook` screenshot handler; the cookware tabs fade out while the result card is up; the HUD tucks its pills and buttons away under the cooking pot and the journal (toasts and banners stay visible as the visual cue).
- Style board thumbnails anchored to the camp's left edge.
- Album cover: Tuki sits beside the logo.

### Round 3

| Shot | Scores | Problems |
| --- | --- | --- |
| Style board · world | 5/5/5/5/5/5/5/5 | — |
| Camp · rain | 5/5/5/5/5/5/5/5 | One continuous monsoon ceiling |
| Cooking result | 5/5/5/–/5/4/5/5 | Toasts stay visible (dimmed) above the pot by design |
| Trip Album · cover | 5/5/5/–/5/5/5/5 | — |

M1 passes: every shot scores 4 or more on every line.

---

## M2 / M3 — systems, mystery and trip end (1x review of the screens the milestone list doesn't cover)

Rendered with a scratch driver over the debug hooks (journal tabs via `?shot=journal&tab=`, shop tabs via `?tab=`, settings, intro, the summary card via a real sleep, every album page via `albumTurn`).

| Screen | Scores | Problems → fixes |
| --- | --- | --- |
| Journal · recipes | 5/5/5/–/5/5/5/5 | — |
| Journal · moments | 5/5/5/–/5/5/5/5 | — |
| Journal · mystery | 5/5/5/–/5/5/5/5 | (clue text top-aligned in M1 round 1) |
| Journal · friends | 4/3/5/–/5/5/5/4 | Befriended Kopila still shown as a curled ball → now stands, smiling |
| Journal · trip | 4/4/5/–/5/5/5/3 | Pages nearly empty → lines stack by height and the day's best catch and dishes appear as little stickers; preset days now carry real catches and dishes |
| Shop · sell | 5/5/5/–/5/5/5/5 | — |
| Shop · pantry | 5/5/5/–/5/5/5/5 | — |
| Settings | 5/5/5/–/5/5/5/5 | — |
| Intro · page 1 | 4/5/5/–/5/5/5/4 | Illustration is simple (Tuki and a big rupee coin); kept |
| Summary card | 5/5/5/–/5/3/5/4 | Additive halo clamped to pure white on the cream card → normal-blend warm halo |
| Album · day page | 5/5/5/–/5/5/5/5 | — |
| Album · friend | 5/5/5/–/5/5/5/5 | — |
| Album · mystery (unmet) | 3/4/4/–/4/2/5/3 | Near-white additive glow on an empty page → a night-lake snapshot with the glow out on the water (freckle flower above it once met) |
| Album · postcard | 5/5/5/–/5/5/5/5 | — |
