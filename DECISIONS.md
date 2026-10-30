# Decisions

Every decision as **chosen / rejected / why**. Newest sections at the bottom of each group. The locked spec lives in `docs/SPEC.md`; the world in `docs/WORLD.md`.

## 1. Locked in the pre-build interview (spec section 2)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Genre | Cozy camping sim | Survival with hunger and warmth meters | Threat kills the serene feel; the hook is curiosity instead |
| Pressure | One positive-only Contentment level, no fail state | Soft or real survival stakes | Satisfaction should only rise; nothing punishes |
| Look | 2D side-view storybook, layered parallax | 3D diorama, 2D top-down, pixel art | Most reliably gorgeous from pure code; the others need hand-made art or are risky in one pass |
| Art source | 100% drawn in code | AI-generated sprites and backgrounds | Code art can bounce, blink and relight for dawn, night and rain; generated art cannot, and its style drifts |
| Palette | Muted pastels | Bright candy pastels, warm picture-book | Serene first, cute second; relights beautifully |
| World | Claude invents the setting, hero critter and cast | A fixed setting | One coherent world, locked in `ART_BIBLE.md` |
| Food | Fishing and foraging | Hunting, traps, gardening | Eating cute critters breaks kawaii; gardening adds scope |
| Feel | Gentle tap-timing fishing; drag-and-stir recipe discovery | Skill minigames, idle auto-play | Engaging without stress |
| Shelter | Pitch a tent, then decorate | Build from parts, one-tap tent | A satisfying setup plus self-expression |
| Structure | 7-day trip on a soft clock, then optional free play | Endless sandbox, several campsites in v1 | A clear arc without 3x the art |
| Economy | Starting budget; sell extras to earn | Fixed budget only, daily allowance | Creates the core loop |
| Hooks | Journal and mystery at full depth; companion and rare moments light, triggered by Contentment | All four at full depth | Four separate systems would thin out polish; the journal is the one spine |
| Sound | Lo-fi plus nature. Music: files generated in Higgsfield. SFX, ambience and a fallback score in code | All-code music, no music | Music is code's weak spot; the game must still sound complete without the files |
| Platform | Browser, touch-first, landscape | Keyboard-first, phone portrait | Mostly played on iPad; mouse still works |
| Build | Autonomous milestones with screenshot self-review | Pausing for review, one straight pass | Self-critique is where the visual quality comes from |
| Ship | Vercel | Local only, Higgsfield community | A shareable link that opens on iPad |

## 2. Engine and tooling (M0)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Engine version | Phaser 3.90.0 (latest 3.x), pinned | Phaser 4.x | Spec says Phaser 3; 3.90 is the final, most stable 3.x |
| Build tool | Vite 7.3.7 + TypeScript 5.9.3, pinned | Vite 8 (Rolldown), TypeScript 7 (native preview) | Both newer majors are fresh; the 7/5.9 pair is battle-tested and cross-platform |
| Resolution model | Canvas backing store at device px (DPR capped at 2); every camera uses origin (0,0) and zoom = deviceHeight / 720, so all code works in logical units with height 720 and a flexible width | Phaser FIT/ENVELOP scale modes, letterboxing | Scale modes blur on Retina or letterbox; this keeps text and edges sharp and lets wide screens show more world (spec section 10) |
| Art texture scale | Textures drawn at ART_SCALE = clamp(zoom, 2, 2.5) and displayed at 1/ART_SCALE | A fixed 2x | Spec asks for 2x; on a 12.9" iPad (zoom 2.84) a fixed 2x would upscale 1.4x and soften outlines. 2.5 cap keeps memory sane |
| Texture upload | Draw each texture on its own Canvas 2D, convert to an ImageBitmap (premultiplied), register with Phaser, then release the canvas | Keep a canvas per texture (`addCanvas`) | iOS Safari caps total canvas memory (~384 MB); bitmaps live outside that cap. Verified no alpha fringing in Chromium |
| Wide layers | Auto-chunked "strips" (max 2048 device px per chunk) | One huge texture per parallax band | Mobile GPUs cap texture size; chunks stay well under 4096 |
| Light & atmosphere | Multiply-tint every band by a per-key colour, plus tinted haze bands between depth bands and additive glow sprites | Per-frame redraws, heavy post-FX bloom | Tints and pre-baked glows cost nothing per frame and relight smoothly; bloom shaders are risky on iPad |
| Random | mulberry32, named streams (weather, fish, forage, moments, misc) saved with the game | One shared RNG | Extra casts must not change tomorrow's weather; deterministic seeds make screenshots and smoke tests repeatable |
| Content IDs | Stable ids from the spec names (`pebble_minnow`), display names come from the reskin | Using display names as ids | The reskin can change names freely without breaking saves |
| Scene registry | Every `src/scenes/*.ts` default export auto-registers; art modules auto-bake via `import.meta.glob` | Hand-maintained lists | Lets art and scene work proceed in parallel without merge conflicts |
| Previews | `?scene=preview&what=<name>` runs any `*.preview.ts` | Only the full style board | Each art/UI module can be screenshotted in isolation during review |
| Shots/smoke | Playwright 1.63.0 (matches the pre-installed Chromium), Node scripts only | bash scripts, Puppeteer | Cross-platform (Windows + macOS) as the spec requires |

## 3. Systems interpretations (M0)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Day timeline | p = 0..1 over 480 s: Dawn 0-0.10, Morning 0.10-0.40, Afternoon 0.40-0.65, Golden hour 0.65-0.82, Dusk 0.82-1.0; Night holds at p >= 1 | Equal slices | Dawn and dusk are the prettiest but should feel fleeting; mornings and afternoons are where the loop happens |
| "Day" for fish | Morning through golden hour (spec definition) | — | Spec text |
| "Day" for forage | Any time except night | Morning through golden hour only | Being stricter about berries at dawn adds frustration without adding curiosity; still distinct from "any time" at night |
| Decor ownership | Each decor item is bought once ("Owned" on the card), placed once | Buying several of the same | Matches the spec's Buy/Owned card; contentment baseline counts placed items and is capped anyway |
| Sleeping without a tent | The fire offers "Sleep" at night when no tent is pitched (under the stars, tent bonus +0) | Hidden or no way to sleep | Spec: nobody can get stuck |
| Night rain guarantee | If no rainy night by Day 4, rain begins at Day 4 dusk | Forcing Day 4 to be a rainy day | Keeps the day's rolled weather; "Night 4 rains" is what the spec asks |
| Mystery rain guarantee | After the dumplings are cooked, rain begins at that day's dusk (or the next night if already night) | Waiting a full day | Spec: "the next night rains" |
| Mid-day weather change | 10% per day (not Day 1), at p 0.25-0.75; rain fades in/out over ~8 s | Abrupt switch | Serene |
| Rod hint | Shown once per day, after 3 casts while a Willow-Rod+ fish is in season with a weaker rod | Every 3 casts | Gentle, not naggy |
| Dish price floor | max(listed price, ceil(1.25 x ingredient value)); staples at shop price, Moon Blossom 0 | — | Spec rule; rare fish make pricier dishes |
