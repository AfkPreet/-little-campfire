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
